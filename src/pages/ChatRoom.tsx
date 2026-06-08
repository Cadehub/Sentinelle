import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import { ArrowLeft, ImagePlus, MessageSquare, Send, ShieldAlert } from "lucide-react";
import { cn } from "../lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import RuleViolationModal from "../components/RuleViolationModal";

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  type: "text" | "image";
  is_safe: boolean;
  created_at: string;
  sender_name?: string;
}

interface ChatRoom {
  id: string;
  alert_id: string;
  finder_id: string;
  owner_id: string;
  created_at: string;
  alert?: {
    title: string;
    image_url?: string;
  };
}

// Compress image to max 1080px width, 0.7 quality
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Max width 1080px
        if (width > 1080) {
          height = (1080 / width) * height;
          width = 1080;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => {
                resolve(reader.result as string);
              };
            }
          },
          "image/jpeg",
          0.7 // Quality 0.7
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
  });
};

// Upload to ImgBB API
const uploadToImgBB = async (base64Image: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (!apiKey) throw new Error("VITE_IMGBB_API_KEY manquant");

  const formData = new FormData();
  formData.append("image", base64Image.split(",")[1]);
  formData.append("key", apiKey);

  const response = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to upload to ImgBB");
  }

  const data = await response.json();
  return data.data.url;
};

// Local message safety check using regex and keyword dictionary
function checkMessageSafety(text: string): { isSafe: boolean; reason: string | null } {
  const cleanedText = text.toLowerCase().trim();

  // 1. REGEX : Liens web (Autorise uniquement sentinelle.com, sentinelle.netlify.app et localhost)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
  const urls = cleanedText.match(urlRegex);
  if (urls) {
    const isExternalLink = urls.some(url => 
      !url.includes('sentinelle.com') && 
      !url.includes('sentinelle.netlify.app') && 
      !url.includes('localhost')
    );
    if (isExternalLink) {
      return { isSafe: false, reason: "Partage de liens externes interdit" };
    }
  }

  // 2. REGEX : Coordonnées (Emails et Numéros de téléphone locaux/internationaux)
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailRegex.test(cleanedText)) {
    return { isSafe: false, reason: "Partage d'adresse email interdit" };
  }

  // Détecte les suites de plus de 8 chiffres consécutifs (numéros de téléphone cachés ou espacés)
  const phoneDigits = cleanedText.replace(/[\s.\-_()]/g, '');
  if (/\d{9,}/.test(phoneDigits)) {
    return { isSafe: false, reason: "Partage de numéro de téléphone interdit" };
  }

  // 3. REGEX : Montants financiers spécifiques (plus strict pour éviter faux positifs)
  // Uniquement des patterns spécifiques: chiffre PUIS directement unité (pas d'espace)
  const moneyRegex = /\d{1,}(?:\s+)?(k|m|kolo|kolos|baton|batons|bâton|bâtons|frs|cfa|fcfa)(?:\s|$)/i;
  if (moneyRegex.test(cleanedText)) {
    return { isSafe: false, reason: "Propositions ou demandes financières interdites" };
  }

  // 4. DICTIONNAIRE LOCAL STRICT (Camfranglais, Jargon Cameroun - UNIQUEMENT mots clés majeurs)
  const localBlacklist = [
    'nkap', 'kolo', 'kolos', 'baton', 'bâton',
    'momo', 'orange money', 'mtn money', 'wave',
    'pame', 'écris moi', 'ecris moi', 'mon numero', 'mon num',
    'mon wa', 'wanda', 'ndjoka', 'ngoma',
    'cashapp', 'payconiq'
  ];

  // 5. DICTIONNAIRE GLOBAL STRICT (Arnaques majeures UNIQUEMENT)
  const globalBlacklist = [
    'payement', 'paiement', 'virement', 'paypal', 'western union', 
    'moneygram', 'ria', 'transcash', 'crypto', 'bitcoin',
    'usdt', 'compte bancaire',
    'dm moi', 'dm me', 'contactez-moi', 'contacte-moi',
    'cotisation', 'donation', 'dons'
  ];

  const fullBlacklist = [...localBlacklist, ...globalBlacklist];

  // Vérification STRICTE: uniquement par mot ENTIER avec limites de mots
  for (const word of fullBlacklist) {
    const regexWord = new RegExp(`\\b${word}\\b`, 'i');
    if (regexWord.test(cleanedText)) {
      return { isSafe: false, reason: `Terme interdit détecté: "${word}"` };
    }
  }

  return { isSafe: true, reason: null };
}

export default function ChatRoom() {
  const { id: roomId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  useEffect(() => {
    if (messages.length === 0) return;
    if (!isAtBottom) {
      setHasNewMessages(true);
      return;
    }

    const timer = window.setTimeout(() => scrollToBottom("smooth"), 80);
    return () => window.clearTimeout(timer);
  }, [messages, isAtBottom]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 120;
    setIsAtBottom(atBottom);
    if (atBottom) setHasNewMessages(false);
  };

  // Fetch message history for current room
  const fetchMessages = async () => {
    if (!roomId) return;
    try {
      const { data: msgs, error: msgsError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (!msgsError && msgs) {
        setMessages(msgs as ChatMessage[]);
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  // Fetch chat room info
  useEffect(() => {
    if (!user || !roomId) return;

    const fetchRoom = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch chat room with alert details
        const { data: room, error: roomError } = await supabase
          .from("chat_rooms")
          .select(
            `
            id,
            alert_id,
            finder_id,
            owner_id,
            created_at,
            alerts (
              title,
              image_url
            )
          `
          )
          .eq("id", roomId)
          .single();

        if (roomError || !room) {
          setError("Conversation introuvable");
          return;
        }

        // Verify access: user must be owner or finder
        if (room.owner_id !== user.id && room.finder_id !== user.id) {
          setError("Vous n'avez pas accès à cette conversation");
          setTimeout(() => navigate("/discussions"), 1500);
          return;
        }

        setChatRoom({
          ...room,
          alert: room.alerts && room.alerts.length > 0 ? room.alerts[0] : undefined,
        });
      } catch (err) {
        console.error("Error fetching chat:", err);
        setError("Une erreur est survenue lors du chargement");
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [user, roomId, navigate]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!roomId) return;

    // 1. Charger l'historique initial
    fetchMessages();

    // 2. S'abonner au canal de la room
    const channel = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          console.log('[ChatRoom] Realtime INSERT received:', newMessage.id)
          
          // Add message to state - strict deduplication by ID
          setMessages((prevMessages) => {
            // Check if message already exists by ID
            if (prevMessages.some((msg) => msg.id === newMessage.id)) {
              console.log('[ChatRoom] Message already exists, skipping:', newMessage.id)
              return prevMessages;
            }
            // New message - add it
            console.log('[ChatRoom] Adding new message:', newMessage.id)
            return [...prevMessages, newMessage];
          });
        }
      )
      .subscribe();

    // 3. Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Send text message with rule validation
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !roomId || sending) return

    try {
      setSending(true)
      setError(null)

      const messageText = newMessage.trim()

      // Step 1: Check message safety using local regex and keyword dictionary
      const safetyCheck = checkMessageSafety(messageText)

      // Step 2: If message violates rules, block it
      if (!safetyCheck.isSafe) {
        console.warn('[ChatRoom] Message blocked by safety filter:', safetyCheck.reason)
        setSending(false)
        setShowViolationModal(true)
        setNewMessage('')
        return // CRITICAL: Stop execution here, no database insert
      }

      // Step 3: Message is safe - insert to database
      console.log('[ChatRoom] Message approved by safety check, inserting to database...')
      
      const { data: sentMessage, error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: messageText,
          type: 'text',
          is_safe: true,
        })
        .select('*')
        .single()

      if (insertError) {
        console.error('[ChatRoom] Insert error:', insertError)
        setError('Impossible d\'envoyer le message. Veuillez réessayer.')
        setSending(false)
        return
      }

      // Step 4: Clear input and scroll (let Realtime listener add the message to state)
      setNewMessage('')
      scrollToBottom()

      // Step 5: Send notification to other participant (fire and forget)
      if (chatRoom) {
        const recipientId = user.id === chatRoom.owner_id ? chatRoom.finder_id : chatRoom.owner_id
        
        void (async () => {
          try {
            const { error: notifError } = await supabase.from("notifications").insert({
              user_id: recipientId,
              title: "Nouveau message",
              body: "Vous avez reçu un message pour une alerte.",
              link: `/discussions/${roomId}`,
            });
            if (notifError) throw notifError;
            console.log("[ChatRoom] Notification sent to", recipientId);
          } catch (err) {
            console.error("[ChatRoom] Notification error:", err);
          }
        })();
      }

    } catch (err) {
      console.error('[ChatRoom] Error sending message:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSending(false)
    }
  }

  // Upload and send image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !roomId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Veuillez sélectionner une image");
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);

      // 1. Compress image (max 1080px, quality 0.7)
      const compressedBase64 = await compressImage(file);

      // 2. Upload to ImgBB
      const imageUrl = await uploadToImgBB(compressedBase64);

      // 3. Optimistic update: add image to UI immediately
      const optimisticId = `optimistic_img_${Date.now()}`;
      const optimisticImage: ChatMessage = {
        id: optimisticId,
        room_id: roomId,
        sender_id: user.id,
        content: imageUrl,
        type: "image",
        is_safe: true,
        created_at: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, optimisticImage]);
      scrollToBottom();

      // 4. Insert image message into chat_messages
      const { data: sentMessage, error: insertError } = await supabase
        .from("chat_messages")
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: imageUrl,
          type: "image",
          is_safe: true,
        })
        .select("*")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        // Remove optimistic message on error
        setMessages((prev) => prev.filter(m => m.id !== optimisticId));
        setError("Impossible d'envoyer l'image. Veuillez réessayer.");
        return;
      }

      // Replace optimistic image with real one from server
      if (sentMessage) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? sentMessage : m))
        );
      }

      // Send notification to the other participant (non-blocking, async in background)
      if (chatRoom) {
        const recipientId = user.id === chatRoom.owner_id ? chatRoom.finder_id : chatRoom.owner_id;
        
        void (async () => {
          try {
            const { error: notifError } = await supabase.from("notifications").insert({
              user_id: recipientId,
              title: "Nouveau message",
              body: "Vous avez reçu un message pour une alerte.",
              link: `/discussions/${roomId}`,
            });
            if (notifError) throw notifError;
            console.log("[ChatRoom] Notification sent to", recipientId);
          } catch (err) {
            console.warn("[ChatRoom] Failed to send notification:", err);
          }
        })();
      }

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue lors de l'upload";
      setError(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  // Not authenticated
  if (!user) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[var(--bg-primary)]">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 text-center max-w-md">
            <p className="text-[var(--text-secondary)] mb-4">Veuillez vous connecter pour accéder à cette conversation.</p>
            <button
              onClick={() => navigate("/discussions")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[var(--bg-primary)] items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[var(--border-color)] border-t-[var(--color-accent)] rounded-full animate-spin" />
        <p className="text-[var(--text-secondary)]">Chargement...</p>
      </div>
    );
  }

  // Error state (critical)
  if (error && !chatRoom) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[var(--bg-primary)]">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-red-500 max-w-md">
            <h3 className="font-bold mb-2 text-lg">Erreur</h3>
            <p className="text-sm mb-4">{error}</p>
            <button
              onClick={() => navigate("/discussions")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[var(--bg-primary)] overflow-hidden relative">
      {/* ZONE 1: Header FIXE en haut (ne défile jamais) */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)] border-b border-[var(--border-color)] p-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/discussions")}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[var(--bg-card)] transition-colors text-[var(--text-primary)]"
          title="Retour"
        >
          <ArrowLeft size={24} />
        </button>

        {chatRoom?.alert && (
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)] truncate">
              {chatRoom.alert.title}
            </h1>
            <p className="text-xs text-[var(--text-tertiary)]">
              {user.id === chatRoom.owner_id ? "Propriétaire" : "Découvreur"}
            </p>
          </div>
        )}

        {chatRoom?.alert?.image_url && (
          <img
            src={chatRoom.alert.image_url}
            alt="Alert"
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
        )}
      </div>

      {/* ZONE 2: Messages - centale avec scroll indépendant (ne touche jamais le header ni footer) */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="absolute top-0 bottom-0 left-0 right-0 overflow-y-auto pt-[72px] p-4 space-y-4 bg-[var(--bg-primary)]"
        style={{
          scrollPaddingTop: "72px",
          scrollPaddingBottom: "calc(72px + env(safe-area-inset-bottom))",
          paddingBottom: "calc(72px + env(safe-area-inset-bottom))",
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--text-secondary)]">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-tertiary)]">
              <MessageSquare size={24} />
            </div>
            <div className="text-center">
              <p className="font-semibold">Aucun message</p>
              <p className="text-xs text-[var(--text-tertiary)]">Lancez la conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === user.id;
            const isSafe = msg.is_safe !== false;

            return (
              <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}> 
                {!isSafe ? (
                  <div className="max-w-xs px-4 py-3 rounded-2xl bg-red-100 border border-red-300">
                    <div className="flex items-start gap-2">
                      <ShieldAlert size={18} className="text-red-700 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-700">Message bloqué :</p>
                        <p className="text-xs text-red-700 mt-1">
                          Ce contenu a été identifié comme une potentielle tentative d'extorsion ou de fraude.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : msg.type === "image" ? (
                  <a href={msg.content} target="_blank" rel="noopener noreferrer" className="group">
                    <img
                      src={msg.content}
                      alt="Message"
                      className="max-w-xs rounded-2xl shadow-md group-hover:shadow-lg transition-shadow"
                    />
                  </a>
                ) : (
                  <div
                    className={cn(
                      "max-w-xs px-4 py-2 rounded-2xl break-words shadow-sm",
                      isOwn
                        ? "bg-[var(--color-accent)] text-white rounded-br-none"
                        : "bg-[var(--bg-card)] text-[var(--text-primary)] rounded-bl-none border border-[var(--border-color)]"
                    )}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className={cn("text-xs mt-1 opacity-70", isOwn ? "text-blue-100" : "text-[var(--text-tertiary)]")}> 
                      {formatDistanceToNow(new Date(msg.created_at), { locale: fr, addSuffix: true })}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {hasNewMessages && (
        <button
          type="button"
          onClick={() => {
            setHasNewMessages(false);
            scrollToBottom("smooth");
          }}
          className="fixed right-4 bottom-24 z-50 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-color-strong)] shadow-md text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--text-primary)] active:scale-95 transition-transform"
        >
          Nouveaux messages
        </button>
      )}

      {/* ZONE 3: Footer input FIXE en bas (ne défile jamais) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-primary)] border-t border-[var(--border-color)] px-4 pt-4"
        style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
      >
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message..."
              disabled={sending || uploadingImage}
              className="flex-1 px-4 py-3 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage || sending}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage || sending}
              className={cn(
                "p-2.5 rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0",
                uploadingImage || sending
                  ? "bg-[var(--bg-primary)] text-[var(--text-tertiary)] cursor-not-allowed"
                  : "bg-emerald-500 text-white hover:bg-emerald-600 active:scale-90"
              )}
              title="Partager une image"
            >
              {uploadingImage ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ImagePlus size={20} />
              )}
            </button>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || uploadingImage}
            className={cn(
              "p-2.5 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0",
              newMessage.trim() && !sending && !uploadingImage
                ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]"
                : "bg-[var(--bg-primary)] text-[var(--text-tertiary)] cursor-not-allowed"
            )}
            title="Envoyer"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
      </div>

      {/* Rule Violation Modal */}
      <RuleViolationModal 
        isOpen={showViolationModal} 
        onClose={() => setShowViolationModal(false)} 
      />
    </div>
  );
}

