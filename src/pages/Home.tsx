import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "../lib/supabase";
import { formatDistanceToNow, parseISO, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "../lib/utils";
import { usePreferences } from "../lib/preferences";
import { useAuth } from "../lib/AuthContext";
import { useAlertReminder } from "../lib/useAlertReminder";
import { AlertTriangle, Clock, MapPin, Share2, Search, Sliders } from "lucide-react";
import AlertReminderModal from "../components/AlertReminderModal";

type Alert = {
  id: string;
  title: string;
  description: string;
  type: string;
  city: string;
  neighborhood: string;
  expires_at: string;
  image_url: string | null;
  status: string;
  created_at?: string;
  first_image_url?: string | null;
};

export default function Home() {
  const { preferences } = usePreferences();
  const { user } = useAuth();
  const { reminderAlert, extendAlert, resolveAlert } = useAlertReminder(user?.id);
  const [showReminderModal, setShowReminderModal] = useState(false);
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstImageMap, setFirstImageMap] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  const [filterCity, setFilterCity] = useState(
    preferences.subscribedCities.length > 0 ? "Mes Villes" : "Toutes"
  );

  // Show reminder modal when an alert needs one
  useEffect(() => {
    if (reminderAlert) {
      setShowReminderModal(true);
    }
  }, [reminderAlert]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from("alerts")
          .select("*")
          .eq("status", "actif")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Supabase fetch failed", error);
        } else if (data) {
          setAlerts(data as Alert[]);
          
          // Charger les premières images pour les alertes qui n'en ont pas
          const alertIds = (data as Alert[]).map(a => a.id);
          if (alertIds.length > 0) {
            const { data: images } = await supabase
              .from("alert_images")
              .select("alert_id, image_url")
              .in("alert_id", alertIds)
              .eq("image_order", 0);
            
            if (images) {
              const imageMap: { [key: string]: string } = {};
              images.forEach(img => {
                imageMap[img.alert_id] = img.image_url;
              });
              setFirstImageMap(imageMap);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Logique existante pour charger les alertes initiales...
    fetchAlerts();

    // Abonnement temps réel aux nouvelles alertes
    const alertsChannel = supabase
      .channel('public-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          setAlerts((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  const cities = [
    ...(preferences.subscribedCities.length > 0 ? ["Mes Villes"] : []),
    "Toutes",
    "Douala",
    "Yaoundé",
    "Garoua",
    "Bamenda",
    "Maroua",
  ];

  const filteredAlerts = alerts.filter((a) => {
    const matchCity = filterCity === "Mes Villes"
      ? preferences.subscribedCities.includes(a.city)
      : (filterCity === "Toutes" || a.city === filterCity);
    const matchSearch = searchQuery === "" || 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCity && matchSearch;
  });

  const isCritical = (alert: Alert) =>
    alert.type.toLowerCase().includes("urgence") ||
    alert.type.toLowerCase().includes("agression") ||
    alert.type.toLowerCase().includes("kidnapping") ||
    alert.type.toLowerCase().includes("drame") ||
    alert.type.toLowerCase().includes("critique");

  const getImageUrl = (alert: Alert) => {
    return alert.image_url || firstImageMap[alert.id] || null;
  };

  const hasActiveFilters = searchQuery !== "" || filterCity !== "Toutes";
  const activeFilterCount = (searchQuery !== "" ? 1 : 0) + (filterCity !== "Toutes" ? 1 : 0);

  const criticalAlerts = filteredAlerts.filter(isCritical);
  const normalAlerts = filteredAlerts.filter(a => !isCritical(a));

  return (
    <div className="animate-in fade-in duration-700">
      
      {/* Sticky Search & Filter Bar */}
      <div className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-color)] backdrop-blur-sm">
        <div className="p-4 sm:p-5 md:p-6 max-w-7xl mx-auto">
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Rechercher une alerte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-secondary)] focus:ring-1 focus:ring-[var(--text-secondary)]/30 text-sm"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border transition-all flex items-center justify-center gap-2 whitespace-nowrap text-xs sm:text-sm font-medium relative",
                hasActiveFilters
                  ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                  : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Sliders size={16} />
              <span className="hidden sm:inline">Filtres</span>
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-8 sm:space-y-10 md:space-y-12 px-4 sm:px-5 md:px-6 py-6 sm:py-8 md:py-10 max-w-7xl mx-auto">
        {/* Header and City Filters */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tighter uppercase mb-2">
            Flux de Signalement
          </h1>
          <p className="text-[9px] sm:text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.2em] max-w-lg leading-relaxed">
            Réseau d'alerte citoyenne interactif. Restez informé des incidents
            signalés dans votre périphérie.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 sm:gap-2">
          {cities.slice(0, 6).map((city) => (
            <button
              key={city}
              onClick={() => setFilterCity(city)}
              className={cn(
                "px-2 sm:px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase transition-all active:scale-95 border whitespace-nowrap",
                filterCity === city
                  ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                  : "bg-transparent text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]",
              )}
            >
              {city}
            </button>
          ))}
        </div>
        </div>

      {loading && filteredAlerts.length === 0 ? (
        <div className="py-20 text-center text-[var(--text-secondary)] animate-pulse">
          Chargement des alertes...
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 mb-6 rounded-[20px] bg-[var(--bg-card)] border border-[var(--border-color-strong)] flex items-center justify-center text-[var(--text-tertiary)]">
             <AlertTriangle size={24} />
          </div>
          <p className="text-2xl font-light italic font-serif text-[var(--text-secondary)]">
            Aucune alerte pour le moment dans cette zone.
          </p>
        </div>
      ) : (
        <section className="space-y-6">
          {/* Critical Alerts Carousel */}
          {criticalAlerts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Urgences & Situations Critiques</h2>
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory hide-scrollbar">
                {criticalAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    to={`/alert/${alert.id}`}
                    className="group relative overflow-hidden rounded-[32px] bg-[#0A0A0A] border-[2px] border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all hover:scale-[1.01] active:scale-[0.98] w-[85vw] md:w-[600px] shrink-0 snap-center h-[320px] md:h-[400px]"
                  >
                    {getImageUrl(alert) && (
                      <div className="absolute inset-0 z-0">
                        <img
                          src={getImageUrl(alert)!}
                          alt={alert.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
                      </div>
                    )}
                    
                    <div className="absolute inset-0 z-10 p-6 md:p-8 flex flex-col justify-between text-white">
                      <div className="flex items-start justify-between w-full">
                        <div className="flex items-center gap-2 text-white/70 text-[11px] uppercase tracking-widest mb-4 font-bold bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
                          <span>{alert.city}</span>
                          <span className="w-1 h-1 bg-red-500/50 rounded-full"></span>
                          <span>{alert.neighborhood}</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (navigator.share) {
                                navigator.share({
                                  title: `URGENCE: ${alert.title}`,
                                  text: `Alerte Critique Sentinelle: ${alert.title}. Voir les détails sur l'application.`,
                                  url: window.location.origin + `/alert/${alert.id}`
                                }).catch(() => {});
                              }
                            }}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-full flex items-center justify-center transition-all active:scale-95"
                          >
                            <Share2 size={14} className="mr-1" /> Partager
                          </button>
                          <span className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-2 shadow-lg shadow-red-600/50">
                             Urgence
                          </span>
                        </div>
                      </div>

                      <div className="mt-auto space-y-3 sm:space-y-4">
                        <h3 className="font-semibold leading-tight text-lg sm:text-2xl md:text-4xl lg:text-5xl font-light italic font-serif text-white tracking-tight line-clamp-3">
                          {alert.title}
                        </h3>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 sm:gap-4">
                          <div className="px-3 sm:px-6 py-2 sm:py-3 bg-red-600/20 text-red-100 border border-red-500/30 text-[9px] sm:text-xs font-bold uppercase rounded-full hover:bg-red-600/40 transition-colors backdrop-blur-md whitespace-nowrap">
                            Voir Détails
                          </div>
                          <div className="text-left sm:text-right">
                             <p className="text-[8px] sm:text-[10px] text-red-300 uppercase mb-1 tracking-tighter">Expiration dans</p>
                             <p className="font-mono font-bold text-sm sm:text-lg md:text-xl text-red-100">
                               <Countdown expiresAt={alert.expires_at} />
                             </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* All Alerts Feed */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Derniers Signalements</h2>
            </div>
            
            {filteredAlerts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    to={`/alert/${alert.id}`}
                    className="group flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 rounded-[20px] sm:rounded-[24px] bg-[var(--bg-card)] border border-[var(--border-color-strong)] transition-all hover:scale-[1.01] active:scale-95 hover:shadow-lg"
                  >
                    {getImageUrl(alert) ? (
                      <div className="w-full sm:w-24 lg:w-32 h-24 sm:h-24 lg:h-32 shrink-0 rounded-[16px] overflow-hidden bg-[var(--bg-primary)]">
                        <img 
                          src={getImageUrl(alert)!} 
                          alt={alert.title} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                        />
                      </div>
                    ) : (
                      <div className="w-full sm:w-24 lg:w-32 h-24 sm:h-24 lg:h-32 shrink-0 rounded-[16px] bg-[var(--bg-primary)] flex items-center justify-center border border-[var(--border-color)] text-[var(--text-tertiary)]">
                        <AlertTriangle size={24} strokeWidth={1} />
                      </div>
                    )}
                    
                    <div className="flex flex-col flex-1 py-1 gap-2">
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <span className="text-[9px] sm:text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest font-bold">
                          {alert.type}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-mono text-[var(--text-tertiary)]">
                          <Countdown expiresAt={alert.expires_at} />
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-sm sm:text-base lg:text-lg leading-tight text-[var(--text-primary)] group-hover:text-[var(--text-secondary)] transition-colors line-clamp-2">
                        {alert.title}
                      </h3>
                      
                      <div className="mt-auto flex items-center gap-1.5 text-[8px] sm:text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                        <MapPin size={12} />
                        <span className="truncate">{alert.neighborhood}, {alert.city}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-[var(--text-secondary)] text-sm border border-dashed border-[var(--border-color-strong)] rounded-[32px]">
                Aucun signalement pour cette zone.
              </div>
            )}
          </div>
        </section>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      </div>

      {/* Alert Reminder Modal */}
      {reminderAlert && (
        <AlertReminderModal
          isOpen={showReminderModal}
          alert={reminderAlert}
          onExtend={() => extendAlert(reminderAlert.id)}
          onResolve={() => resolveAlert(reminderAlert.id)}
          onClose={() => setShowReminderModal(false)}
        />
      )}
    </div>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  try {
    const date = parseISO(expiresAt);
    if (isPast(date)) return <span>Expiré</span>;
    return <span>{formatDistanceToNow(date, { locale: fr })}</span>;
  } catch (e) {
    return <span>-</span>;
  }
}
