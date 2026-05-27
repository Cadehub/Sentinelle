import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router";
import { Send, AlertTriangle, PhoneCall, Bot, X, MessageCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type HelpfulMember = {
  name: string;
  role: string;
  phone: string;
  type: "whatsapp" | "phone";
};

const EMERGENCY_KEYWORDS = ["kidnapping", "disparition", "agression", "vol", "accident", "urgence", "drame", "sang", "mort", "blessé", "feu", "incendie", "arme", "emergency", "fire", "attack", "blood", "stolen", "lost", "kidnapped"];

const HELPFUL_MEMBERS: HelpfulMember[] = [
  { name: "Support 1", role: "Assistance 24/7", phone: "+237654016097", type: "whatsapp" },
  { name: "Support 2", role: "Assistance 24/7", phone: "+237652270756", type: "whatsapp" }
];

export default function GuideFAB() {
  const { t } = useTranslation();
  const location = useLocation();

  // ALL HOOKS MUST BE CALLED FIRST, before any early returns
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpenModal, setHasOpenModal] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: t('guide.welcome', "Bonjour, je suis votre assistant Sentinelle. Décrivez votre situation en détail et je vous fournirai une réponse complète.") }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [lastUserConcern, setLastUserConcern] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (showBubble && !isOpen) {
      bubbleTimeoutRef.current = setTimeout(() => {
        setShowBubble(false);
      }, 5000);
    }
    return () => {
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    };
  }, [showBubble, isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen]);

  // Monitor modals and hide FAB when any modal is open
  useEffect(() => {
    const checkModals = () => {
      const modalOpen = document.querySelector('[role="dialog"]') !== null || 
                       document.getElementById('share-modal') !== null ||
                       document.getElementById('edit-modal') !== null ||
                       document.querySelector('.modal-open') !== null;
      setHasOpenModal(modalOpen);
    };

    // Check on mount and listen to changes
    checkModals();
    
    // Use MutationObserver to detect modal changes
    const observer = new MutationObserver(checkModals);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => observer.disconnect();
  }, []);

  // NOW check early return conditions AFTER all hooks are declared
  if (location.pathname.includes('/discussions')) {
    return null;
  }

  if (hasOpenModal) {
    return null;
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const checkEmergency = (text: string) => {
    const textLower = text.toLowerCase();
    if (EMERGENCY_KEYWORDS.some(kw => textLower.includes(kw))) {
      setShowEmergency(true);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setLastUserConcern(text);
    setInput("");
    checkEmergency(text);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log("[GuideFAB] Sending message to sentinelle-guide:", { text, hasToken: !!token });

      const res = await fetch("https://wcrkcuugancklxirqfyl.supabase.co/functions/v1/sentinelle-guide", {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          message: text,
          language: i18n.language || "fr"
        })
      });

      const resText = await res.text();
      console.log("[GuideFAB] Raw response:", resText, "Status:", res.status);

      let data: any;
      try {
        data = JSON.parse(resText);
        console.log("[GuideFAB] Parsed JSON response:", data);
      } catch (parseErr) {
        console.warn("[GuideFAB] Response is not valid JSON, treating as string");
        data = { reply: resText };
      }

      // Check for Edge Function errors (status 400 or 500 with error details)
      if (!res.ok) {
        console.error(`[GuideFAB] Edge Function Error (${res.status}):`, data);
        
        // If there are error details from Google Gemini, log them for debugging
        if (data.details) {
          console.error("[GuideFAB] Error Details from Gemini API:", data.details);
        }
        
        throw new Error(`Edge Function returned ${res.status}: ${data.error || resText}`);
      }

      // Extract reply from the successful response - exactly as Edge Function returns it
      let replyText = "";
      
      if (typeof data === "string") {
        replyText = data;
      } else if (data && typeof data === "object") {
        // Priority: reply (from Edge Function) > message > content > stringified
        replyText = data.reply || data.message || data.content || JSON.stringify(data);
        console.log("[GuideFAB] Extracted reply:", replyText);
      }

      if (!replyText || replyText.trim() === "") {
        throw new Error("No valid reply received from Edge Function");
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: replyText }]);
    } catch (error: any) {
      console.error("[GuideFAB] Function invoke failed:", error?.message || error);
      const errorMsg = error?.message || "Une erreur s'est produite";
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: `Le service d'assistance est actuellement indisponible. En cas d'urgence, veuillez contacter les numéros de secours.\n\n[Erreur: ${errorMsg}]` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideInRightBubble {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeOutBubble {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(400px);
          }
        }
        .bubble-enter {
          animation: slideInRightBubble 0.4s ease-out forwards;
        }
        .bubble-exit {
          animation: fadeOutBubble 0.4s ease-out forwards;
        }
      `}</style>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-end">
        {!isOpen && showBubble && (
          <div 
            className="mb-2 mr-2 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-[16px] rounded-br-sm shadow-xl flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95 bubble-enter"
            onClick={() => setIsOpen(true)}
          >
            <Bot size={14} /> Besoin d'aide ?
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all hover:scale-105 active:scale-95",
            isOpen ? "bg-[var(--bg-card)] border border-[var(--border-color-strong)] text-[var(--text-primary)]" : "bg-red-600 border border-red-500"
          )}
        >
          {isOpen ? <X size={24} /> : <Bot size={24} />}
        </button>
      </div>

      {/* FAB Modal - Hidden when not isOpen */}
      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-28 md:right-8 z-[9999] flex flex-col justify-end md:justify-start items-center md:items-end">
          {/* Backdrop on mobile */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} />
          
          <div className="relative w-full max-w-md h-[90vh] md:h-auto md:max-h-[85vh] bg-[var(--bg-card)] border border-[var(--border-color-strong)] md:rounded-[32px] rounded-t-[32px] shadow-2xl flex flex-col pt-6 px-4 md:px-6 pb-6 animate-in slide-in-from-bottom-10 md:fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--border-color)] mt-2 md:mt-0">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-red-500" />
                <h2 className="font-bold uppercase tracking-widest text-sm">Sentinelle</h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-[var(--bg-primary)] rounded-full transition-colors active:scale-95">
                <X size={20} />
              </button>
            </div>

            {/* Emergency Banner */}
            {showEmergency && (
              <div className="mb-4 bg-red-600 animate-pulse text-white p-4 rounded-[24px] border border-red-500 shadow-xl shadow-red-500/20 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                   <AlertTriangle size={20} />
                   <h2 className="font-bold text-xs uppercase tracking-widest">Urgence Absolue</h2>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <a href="tel:117" className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-[16px] flex items-center justify-center gap-2 transition-all active:scale-95">
                    <PhoneCall size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Police (117)</span>
                  </a>
                  <a href="tel:118" className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-[16px] flex items-center justify-center gap-2 transition-all active:scale-95">
                    <PhoneCall size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Gendarmerie (118)</span>
                  </a>
                  <a href="tel:120" className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-[16px] flex items-center justify-center gap-2 transition-all active:scale-95">
                    <PhoneCall size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Sapeurs-Pompiers (120)</span>
                  </a>
                </div>
              </div>
            )}

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto mb-4 flex flex-col gap-4 pr-1 scrollbar-thin">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-[24px] p-4 text-xs leading-relaxed whitespace-pre-wrap break-words",
                    msg.role === "user" 
                      ? "bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-tr-sm" 
                      : "bg-[var(--bg-primary)] border border-[var(--border-color-strong)] text-[var(--text-primary)] rounded-tl-sm"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {loading && (
                 <div className="flex justify-start">
                   <div className="bg-[var(--bg-primary)] border border-[var(--border-color-strong)] rounded-[24px] rounded-tl-sm p-4 text-sm flex gap-2 items-center">
                     <div className="w-1 h-1 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                     <div className="w-1 h-1 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                     <div className="w-1 h-1 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - ALWAYS VISIBLE */}
            <div className="shrink-0 pt-2 border-t border-[var(--border-color)] flex flex-col gap-3">
              {/* Text Input Form */}
              <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Décrivez votre situation..."
                    className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color-strong)] rounded-[20px] px-4 py-3 text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors placeholder:text-[var(--text-tertiary)]"
                  />
                  <button 
                    type="submit" 
                    disabled={!input.trim() || loading}
                    className="h-[46px] w-[46px] shrink-0 bg-[var(--text-primary)] text-[var(--bg-primary)] flex items-center justify-center rounded-[16px] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div className="h-px bg-[var(--border-color)]" />

              {/* WhatsApp Fallback Support Buttons */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] px-1">Besoin d'aide directe ?</p>
                <div className="grid grid-cols-2 gap-2">
                  {HELPFUL_MEMBERS.map((member) => {
                    const encodedConcern = encodeURIComponent(lastUserConcern || "Bonjour, j'ai besoin d'assistance Sentinelle");
                    const whatsappUrl = `https://wa.me/${member.phone.replace(/\D/g, '')}?text=${encodedConcern}`;
                    
                    return (
                      <a
                        key={member.phone}
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-[16px] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <MessageCircle size={16} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-center leading-tight">{member.name}</span>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* WhatsApp Channel Button */}
              <a
                href="https://whatsapp.com/channel/0029VbD2ZtWJ93wc2NXu6M02"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-3 rounded-[16px] flex items-center justify-center gap-2 transition-all active:scale-95 font-bold text-sm uppercase tracking-widest"
              >
                <MessageCircle size={16} />
                Rejoindre notre Chaîne WhatsApp
              </a>

              {/* Close Button */}
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-full text-center p-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-95 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
