import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { usePreferences } from "../lib/preferences";
import { useAuth } from "../lib/AuthContext";
import { useAlertReminder } from "../lib/useAlertReminder";
import { AlertTriangle, Bone, Car, FileText, MapPin, Package, Search, Share2, Sliders, Users, Map, X, ArrowLeft } from "lucide-react";
import AlertReminderModal from "../components/AlertReminderModal";
import AlertsMap from "../components/AlertsMap";
import { getRegionFromCity, SELECTABLE_REGIONS } from "../lib/regions";

type Alert = {
  id: string;
  title: string;
  description: string;
  type: string;
  sub_type?: string | null;
  item_category?: string | null;
  city: string;
  neighborhood: string;
  latitude?: number | null;
  longitude?: number | null;
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
  const [locationQuery, setLocationQuery] = useState("");
  const [isCompactBar, setIsCompactBar] = useState(false);
  const [filterStep, setFilterStep] = useState<1 | 2 | 3>(1);
  const filterBarRef = useRef<HTMLDivElement | null>(null);
  const [filterBarHeight, setFilterBarHeight] = useState(0);
  
  const [filterRegion, setFilterRegion] = useState(
    preferences.subscribedRegions.length > 0 ? "Mes régions" : "Toutes"
  );
  const [filterMainType, setFilterMainType] = useState<"all" | "lost" | "found">("all");
  const [filterSubType, setFilterSubType] = useState<"all" | "document" | "object" | "person" | "vehicle" | "animal">("all");

  // Show reminder modal when an alert needs one
  useEffect(() => {
    if (reminderAlert) {
      setShowReminderModal(true);
    }
  }, [reminderAlert]);

  useEffect(() => {
    const onScroll = () => {
      setIsCompactBar(window.scrollY > 120);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mesure la hauteur de la barre de filtre (utile car elle est fixed)
  useEffect(() => {
    const el = filterBarRef.current;
    if (!el) return;

    const measure = () => setFilterBarHeight(Math.ceil(el.getBoundingClientRect().height));
    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener("resize", measure, { passive: true } as any);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure as any);
    };
  }, [isCompactBar]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from("alerts")
          .select("*")
          .in("status", ["active", "actif"])
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Supabase fetch failed", error);
        } else if (data) {
          console.log('Fetched active alerts:', data.length);
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
          // Only add alerts with 'active' status to match filter
          if (payload.new?.status === "active" || payload.new?.status === "actif") {
            console.log('New active alert received:', payload.new.id);
            setAlerts((prev) => [payload.new as Alert, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  const subscribedRegions = preferences.subscribedRegions.filter((r) => r !== "Autre");

  const regions = [
    "Toutes",
    ...(subscribedRegions.length > 0 ? ["Mes régions"] : []),
    ...SELECTABLE_REGIONS,
  ];

  const filteredAlerts = alerts.filter((a) => {
    // Certaines alertes ont une "city" au format adresse complète (ou une rue).
    // On utilise city + neighborhood pour détecter la région de façon fiable.
    const region = getRegionFromCity(`${a.city || ""} ${a.neighborhood || ""}`);
    const matchRegion = filterRegion === "Mes régions"
      ? subscribedRegions.includes(region)
      : (filterRegion === "Toutes" || region === filterRegion);

    const mainType = ((a.main_type || a.type) || "").toLowerCase();
    const matchMainType = filterMainType === "all" ? true : mainType === filterMainType;
    const matchSubType = filterSubType === "all" ? true : ((a.sub_type || "") || "").toLowerCase() === filterSubType;

    const locationHaystack = `${a.neighborhood || ""} ${a.city || ""}`.toLowerCase();
    const matchLocation = locationQuery.trim() === "" || locationHaystack.includes(locationQuery.trim().toLowerCase());

    const matchSearch = searchQuery === "" || 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((a.main_type || a.type || "") as string).toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((a.item_category || "") as string).toLowerCase().includes(searchQuery.toLowerCase());
    return matchRegion && matchMainType && matchSubType && matchLocation && matchSearch;
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

  const hasActiveFilters =
    searchQuery !== "" ||
    locationQuery !== "" ||
    filterRegion !== "Toutes" ||
    filterMainType !== "all" ||
    filterSubType !== "all";

  const activeFilterCount =
    (searchQuery !== "" ? 1 : 0) +
    (locationQuery !== "" ? 1 : 0) +
    (filterRegion !== "Toutes" ? 1 : 0) +
    (filterMainType !== "all" ? 1 : 0) +
    (filterSubType !== "all" ? 1 : 0);

  const criticalAlerts = filteredAlerts.filter(isCritical);
  const normalAlerts = filteredAlerts.filter((a) => !isCritical(a));

  const typeLabel = filterMainType === "all" ? "Perdu / Trouvé" : filterMainType === "lost" ? "Perdu" : "Trouvé";

  const subTypes = [
    { id: "all" as const, label: "Tout", icon: null },
    { id: "document" as const, label: "Document", icon: <FileText size={16} /> },
    { id: "object" as const, label: "Objet", icon: <Package size={16} /> },
    { id: "person" as const, label: "Personne", icon: <Users size={16} /> },
    { id: "vehicle" as const, label: "Véhicule", icon: <Car size={16} /> },
    { id: "animal" as const, label: "Animal", icon: <Bone size={16} /> },
  ];

  const openFilters = () => {
    setShowFilters(true);
    setFilterStep(filterMainType === "all" ? 1 : filterSubType === "all" ? 2 : 3);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setLocationQuery("");
    setFilterRegion("Toutes");
    setFilterMainType("all");
    setFilterSubType("all");
    setFilterStep(1);
  };

  const subTypeLabel = subTypes.find((s) => s.id === filterSubType)?.label;
  const filterSummary = [
    filterMainType === "all" ? null : filterMainType === "lost" ? "Perdu" : "Trouvé",
    filterSubType === "all" ? null : subTypeLabel,
    filterRegion === "Toutes" ? null : filterRegion,
    locationQuery.trim() ? locationQuery.trim() : null,
  ].filter(Boolean).join(" • ");

  return (
    <div className="animate-in fade-in duration-700">
      <div className="space-y-8 sm:space-y-10 md:space-y-12 max-w-7xl mx-auto">
        {/* Espace réservé (la barre est en fixed) */}
        <div style={{ height: filterBarHeight }} />

        {/* Barre de filtre FIXE (ne disparaît jamais au scroll) */}
        <div
          className="fixed left-0 right-0 z-40"
          style={{ top: "calc(var(--app-header-height, 64px) + 8px)" }}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <div ref={filterBarRef} className={cn("ui-card overflow-visible", isCompactBar ? "p-3" : "p-4")}>
              <div className={cn("flex items-center gap-3", isCompactBar ? "flex-row" : "flex-col sm:flex-row")}>
                <button
                  type="button"
                  onClick={openFilters}
                  className={cn(
                    "h-11 px-5 rounded-full border flex items-center gap-2 font-semibold transition-all active:scale-95",
                    hasActiveFilters
                      ? "bg-[var(--text-primary)] text-[var(--bg-card)] border-[var(--text-primary)]"
                      : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--border-color-strong)]"
                  )}
                >
                  <Sliders size={18} />
                  Filtrer
                  {hasActiveFilters && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/15">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div className={cn("flex-1 min-w-0", isCompactBar ? "" : "w-full")}>
                  <div className={cn("text-xs font-semibold truncate", filterSummary ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]")}>
                    {filterSummary || "Perdu/Trouvé → catégorie → région → lieu"}
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="ui-icon-button active:scale-95 transition-transform"
                    aria-label="Réinitialiser"
                    title="Réinitialiser"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Fermer"
              onClick={() => setShowFilters(false)}
            />
            <div className="relative w-full sm:max-w-lg ui-card p-4 sm:p-5 rounded-t-[28px] sm:rounded-[28px] border border-[var(--border-color-strong)]">
              <div className="flex items-center justify-between gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setFilterStep((s) => (s > 1 ? ((s - 1) as any) : s))}
                  className={cn("ui-icon-button active:scale-95 transition-transform", filterStep === 1 && "opacity-40 pointer-events-none")}
                  aria-label="Retour"
                  title="Retour"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  Filtrer les alertes
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="ui-icon-button active:scale-95 transition-transform"
                  aria-label="Fermer"
                  title="Fermer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilterStep(s as any)}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full transition-all",
                      filterStep === s ? "bg-[var(--color-accent)]" : "bg-[var(--border-color-strong)]"
                    )}
                    aria-label={`Étape ${s}`}
                    title={`Étape ${s}`}
                  />
                ))}
              </div>

                {filterStep === 1 && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-[var(--text-tertiary)]">
                      Étape 1 • Perdu ou Trouvé
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterMainType("lost");
                          setFilterStep(2);
                        }}
                        className={cn(
                          "h-12 rounded-2xl border font-semibold transition-all active:scale-[0.99]",
                          filterMainType === "lost"
                            ? "bg-[var(--text-primary)] text-[var(--bg-card)] border-[var(--text-primary)]"
                            : "bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--border-color-strong)]"
                        )}
                      >
                        Perdu
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterMainType("found");
                          setFilterStep(2);
                        }}
                        className={cn(
                          "h-12 rounded-2xl border font-semibold transition-all active:scale-[0.99]",
                          filterMainType === "found"
                            ? "bg-[var(--text-primary)] text-[var(--bg-card)] border-[var(--text-primary)]"
                            : "bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--border-color-strong)]"
                        )}
                      >
                        Trouvé
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterMainType("all");
                        setFilterStep(2);
                      }}
                      className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] font-semibold hover:border-[var(--border-color-strong)] active:scale-[0.99] transition-all"
                    >
                      Tous
                    </button>
                  </div>
                )}

                {filterStep === 2 && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-[var(--text-tertiary)]">
                      Étape 2 • Catégorie
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {subTypes.filter((s) => s.id !== "all").map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setFilterSubType(st.id);
                            setFilterStep(3);
                          }}
                          className={cn(
                            "h-12 rounded-2xl border font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-2",
                            filterSubType === st.id
                              ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                              : "bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--border-color-strong)]"
                          )}
                        >
                          {st.icon}
                          {st.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterSubType("all");
                        setFilterStep(3);
                      }}
                      className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] font-semibold hover:border-[var(--border-color-strong)] active:scale-[0.99] transition-all"
                    >
                      Tout
                    </button>
                  </div>
                )}

                {filterStep === 3 && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-[var(--text-tertiary)]">
                      Étape 3 • Région et lieu
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {regions.map((region) => (
                        <button
                          key={region}
                          type="button"
                          onClick={() => setFilterRegion(region)}
                          className={cn(
                            "h-9 px-4 rounded-full text-sm font-semibold transition-all active:scale-95 border whitespace-nowrap",
                            filterRegion === region
                              ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm"
                              : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--border-color-strong)] hover:text-[var(--text-primary)]"
                          )}
                        >
                          {region}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                      <input
                        type="text"
                        placeholder="Lieu exact (quartier, rue...)"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm focus:shadow-md focus:outline-none focus:border-[var(--color-accent)] text-sm"
                      />
                    </div>

                    <div className="relative">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                      <input
                        type="text"
                        placeholder="Rechercher (titre, description...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm focus:shadow-md focus:outline-none focus:border-[var(--color-accent)] text-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="h-11 flex-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] font-semibold hover:border-[var(--border-color-strong)] active:scale-[0.99] transition-all"
                      >
                        Réinitialiser
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFilters(false)}
                        className="h-11 flex-1 rounded-2xl bg-[var(--color-accent)] text-white font-semibold active:scale-[0.99] transition-all"
                      >
                        Voir
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        <div className="space-y-5">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-7 rounded-full bg-[var(--color-accent)]" />
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Flux de signalement
                </h1>
              </div>
              <p className="text-sm text-[var(--text-secondary)] max-w-lg leading-relaxed">
                Réseau d'alerte citoyenne interactif. Restez informé des incidents signalés dans votre périphérie.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2">
              <div className="text-[10px] text-[var(--text-tertiary)] font-semibold">
                {filteredAlerts.length} alerte{filteredAlerts.length !== 1 ? "s" : ""}
              </div>
            </div>
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
            Aucune alerte pour le moment dans cette rubrique.
          </p>
        </div>
      ) : (
        <section className="space-y-8">
          {/* Interactive Map Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Map size={18} className="text-[var(--text-tertiary)]" />
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Carte interactive</h2>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                {filteredAlerts.filter(a => a.latitude && a.longitude).length} alerte{filteredAlerts.filter(a => a.latitude && a.longitude).length !== 1 ? 's' : ''} géolocalisée{filteredAlerts.filter(a => a.latitude && a.longitude).length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="ui-card p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: "rgba(59,130,246,0.95)" }} />
                  Perdu
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: "rgba(16,185,129,0.95)" }} />
                  Trouvé
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: "rgba(15,23,42,0.90)" }} />
                  Autre
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: "rgba(239,68,68,0.95)" }} />
                  Urgence (halo rouge)
                </div>
              </div>
            </div>
            <div className="ui-card p-3 sm:p-4">
              <AlertsMap 
                alerts={filteredAlerts}
                onAlertClick={(alertId) => {
                  window.location.href = `/alert/${alertId}`;
                }}
              />
            </div>
          </div>

          {/* Critical Alerts Carousel */}
          {criticalAlerts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Urgences & situations critiques</h2>
              </div>
              
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory hide-scrollbar">
                {criticalAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    to={`/alert/${alert.id}`}
                    className="ui-card group shrink-0 snap-center w-[86vw] sm:w-[520px] p-4 sm:p-5 border-l-4 border-l-red-500 transition-transform active:scale-[0.98]"
                  >
                    <div className="flex gap-4">
                      {getImageUrl(alert) ? (
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-muted)] shrink-0">
                          <img src={getImageUrl(alert)!} alt={alert.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] shrink-0 flex items-center justify-center text-red-500/70">
                          <AlertTriangle size={22} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-[var(--text-tertiary)] mb-1">
                              {alert.city} • {alert.neighborhood}
                            </p>
                            <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] line-clamp-2">
                              {alert.title}
                            </h3>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20 whitespace-nowrap">
                            Urgence
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (navigator.share) {
                                navigator.share({
                                  title: `Urgence: ${alert.title}`,
                                  text: `Alerte Sentinelle: ${alert.title}. Voir les détails sur l'application.`,
                                  url: window.location.origin + `/alert/${alert.id}`
                                }).catch(() => {});
                              }
                            }}
                            className="h-9 px-4 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color-strong)] active:scale-95 transition-transform"
                          >
                            <Share2 size={16} className="inline -mt-0.5 mr-1" />
                            Partager
                          </button>
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
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Derniers signalements</h2>
            </div>
            
            {normalAlerts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {normalAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    to={`/alert/${alert.id}`}
                    className="ui-card group flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 transition-transform active:scale-[0.98]"
                  >
                    {getImageUrl(alert) ? (
                      <div className="w-full sm:w-24 lg:w-28 h-24 sm:h-24 lg:h-28 shrink-0 rounded-2xl overflow-hidden bg-[var(--bg-muted)] border border-[var(--border-color)]">
                        <img 
                          src={getImageUrl(alert)!} 
                          alt={alert.title} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                        />
                      </div>
                    ) : (
                      <div className="w-full sm:w-24 lg:w-28 h-24 sm:h-24 lg:h-28 shrink-0 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center border border-[var(--border-color)] text-[var(--text-tertiary)]">
                        <AlertTriangle size={24} strokeWidth={1} />
                      </div>
                    )}
                    
                    <div className="flex flex-col flex-1 min-w-0 py-1 gap-2">
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <span className="text-xs text-[var(--text-tertiary)] font-semibold">
                          {alert.type}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-base leading-tight text-[var(--text-primary)] line-clamp-2 break-words">
                        {alert.title}
                      </h3>
                      
                      <div className="mt-auto flex items-center gap-1.5 text-xs text-[var(--text-secondary)] min-w-0">
                        <MapPin size={12} />
                        <span className="truncate min-w-0">{alert.neighborhood}, {alert.city}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-[var(--text-secondary)] text-sm border border-dashed border-[var(--border-color-strong)] rounded-[32px]">
                Aucun signalement pour cette rubrique.
              </div>
            )}
          </div>
        </section>
      )}
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
