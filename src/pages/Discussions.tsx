import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { ArrowLeft, MessageSquare, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

interface Alert {
  id: string;
  title: string;
  status: string;
  image_url: string | null;
}

interface ChatRoom {
  id: string;
  alert_id: string;
  finder_id: string;
  owner_id: string;
  created_at: string;
  alerts: Alert | null;
}

export default function Discussions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchChatRooms = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .from("chat_rooms")
          .select("*, alerts(id, title, status, image_url)")
          .or(`finder_id.eq.${user.id},owner_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (queryError) {
          throw new Error(queryError.message || "Erreur lors du chargement des discussions");
        }

        setChatRooms((data || []) as ChatRoom[]);
      } catch (err: any) {
        console.error("Erreur:", err);
        setError(err.message || "Impossible de charger vos discussions.");
      } finally {
        setLoading(false);
      }
    };

    fetchChatRooms();
  }, [user, navigate]);

  const handleRoomClick = (roomId: string) => {
    navigate(`/discussions/${roomId}`);
  };

  const getUserRole = (room: ChatRoom): "Propriétaire" | "Découvreur" => {
    return user?.id === room.owner_id ? "Propriétaire" : "Découvreur";
  };

  const getRoleBadgeColor = (role: "Propriétaire" | "Découvreur") => {
    if (role === "Propriétaire") {
      return "bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[var(--color-accent)]/30";
    }
    return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-8 px-3 sm:px-4 md:px-0 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-transform active:scale-95"
        >
          <ArrowLeft size={16} /> Retour
        </button>

        <div className="text-center md:text-left">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-2">
            Discussions
          </h1>
          <p className="text-[9px] sm:text-sm text-[var(--text-secondary)] font-medium">
            Vos conversations de suivi d'alertes
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--text-primary)]" />
          <p className="text-sm text-[var(--text-secondary)]">Chargement des discussions...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-500/20 flex gap-3 items-start mb-6">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">{error}</p>
            <p className="text-xs text-red-500/80 mt-1">Veuillez réessayer ou contacter le support.</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && chatRooms.length === 0 && !error && (
        <div className="ui-card p-10 text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-[var(--text-tertiary)] opacity-50" />
          <h2 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">Aucune discussion</h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-6 max-w-sm mx-auto">
            Vous n'avez pas encore de conversation. Publiez une alerte ou participez à celle d'un autre pour commencer à discuter.
          </p>
          <button
            onClick={() => navigate("/publish")}
            className="ui-primary-button w-full sm:w-auto active:scale-95 transition-transform"
          >
            Publier une Alerte
          </button>
        </div>
      )}

      {/* Chat Rooms List */}
      {!loading && chatRooms.length > 0 && (
        <div className="space-y-4">
          {chatRooms.map((room) => {
            const role = getUserRole(room);
            const badgeColor = getRoleBadgeColor(role);
            const alert = room.alerts;

            return (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room.id)}
                className="w-full text-left bg-[var(--bg-card)] border border-[var(--border-color-strong)] rounded-[24px] overflow-hidden hover:border-[var(--text-primary)] transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
              >
                <div className="flex gap-4 p-4 sm:p-6">
                  {/* Alert Image */}
                  {alert?.image_url ? (
                    <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-[16px] overflow-hidden border border-[var(--border-color)]">
                      <img
                        src={alert.image_url}
                        alt={alert.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-[16px] bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center">
                      <AlertCircle size={32} className="text-[var(--text-tertiary)] opacity-50" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2 mb-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] line-clamp-2 flex-1">
                          {alert?.title || "Alerte supprimée"}
                        </h3>
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border whitespace-nowrap flex-shrink-0",
                            badgeColor
                          )}
                        >
                          {role}
                        </span>
                      </div>

                      {/* Status Badge */}
                      {alert?.status && (
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                              alert.status === "actif"
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : alert.status === "clos"
                                  ? "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                  : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            )}
                          >
                            {alert.status === "actif" ? "Actif" : alert.status === "clos" ? "Clôturé" : "En attente"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      {new Date(room.created_at).toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
