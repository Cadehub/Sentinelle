import { useState, useRef, useEffect } from "react";
import { Send, AlertTriangle, PhoneCall, Bot, X } from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const EMERGENCY_KEYWORDS = ["kidnapping", "disparition", "agression", "vol", "accident", "urgence", "drame", "sang", "mort", "blessé", "feu", "incendie", "arme", "emergency", "fire", "attack", "blood", "stolen", "lost", "kidnapped"];

export default function GuideFAB() {
  const { t } = useTranslation();

  const INITIAL_SUGGESTIONS = [
    "Je suis victime d'une agression",
    "Quelqu'un a disparu",
    "Il y a eu un accident grave",
    "J'ai perdu mes documents"
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: t('guide.welcome', "Bonjour, je suis votre assistant Sentinelle. Décrivez votre situation ou choisissez un exemple ci-dessous.") }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

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
    setInput("");
    checkEmergency(text);
    setLoading(true);
    setShowSuggestions(false);

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
        body: JSON.stringify({ message: text })
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
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: `${t('guide.service_unavailable', "Le service d'assistance est actuellement indisponible")}. ${t('guide.emergency_help', "En cas d'urgence, veuillez contacter les numéros de secours.")}\n\n[Erreur: ${errorMsg}]` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-end">
        {!isOpen && (
          <div className="mb-2 mr-2 animate-bounce bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-[16px] rounded-br-sm shadow-xl flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95" onClick={() => setIsOpen(true)}>
            <Bot size={14} /> Besoin d'aide ou Urgence ?
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

      {/* FAB Modal */}
      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-28 md:right-8 z-40 flex flex-col justify-end md:justify-start items-center md:items-end">
          {/* Backdrop on mobile */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} />
          
          <div className="relative w-full max-w-md h-[90vh] md:h-auto md:max-h-[85vh] bg-[var(--bg-card)] border border-[var(--border-color-strong)] md:rounded-[32px] rounded-t-[32px] shadow-2xl flex flex-col pt-6 px-4 md:px-6 pb-6 animate-in slide-in-from-bottom-10 md:fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--border-color)] mt-2 md:mt-0">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-red-500" />
                <h2 className="font-bold uppercase tracking-widest text-sm">Guide Sentinelle</h2>
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
                    "max-w-[85%] rounded-[24px] p-4 text-xs leading-relaxed",
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

            {/* Input Area */}
            <div className="shrink-0 pt-2 border-t border-[var(--border-color)] flex flex-col gap-2">
              {/* Suggestions */}
              {showSuggestions && messages.length === 1 && (
                <div className="flex flex-col gap-2">
                  {INITIAL_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className="w-full text-left px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color-strong)] rounded-[16px] text-[11px] font-bold uppercase tracking-widest hover:border-[var(--text-primary)] transition-all active:scale-95"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Text Input Form */}
              <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t('guide.placeholder', "Décrivez votre situation...")}
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

              <button 
                onClick={() => setIsOpen(false)} 
                className="w-full text-center p-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-95 transition-all"
              >
                {t('common.back', "Fermer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
