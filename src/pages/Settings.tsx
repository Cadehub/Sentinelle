import { usePreferences } from "../lib/preferences";
import { Bell, BellOff, ArrowLeft, Target, X, Globe, History, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { Link } from "react-router";
import { cn } from "../lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";
import { requestPushPermission } from "../utils/firebase";

const CITIES = ["Douala", "Yaoundé", "Garoua", "Bamenda", "Maroua", "Bafoussam", "Ngaoundéré", "Kribi", "Buea"];
const ALERT_TYPES = ["Vol", "Perte", "Objet Trouvé", "Agression", "Accident", "Urgence Médicale", "Incendie", "Autre"];
const RADII_KM = [2, 5, 10, 20, 50];

export default function Settings() {
  const { preferences, setPreferences } = usePreferences();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const [activeSection, setActiveSection] = useState<string | null>("preferences");
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [radarInput, setRadarInput] = useState("");
  const [radius, setRadius] = useState<number>(preferences.dangerRadius || 5);

  useEffect(() => {
    if (activeSection === "history" && user) {
      loadHistory();
    }
  }, [activeSection, user]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    if (data) setHistory(data);
    setLoadingHistory(false);
  };

  const handleToggleCity = (city: string) => {
    const isSubscribed = preferences.subscribedCities.includes(city);
    if (isSubscribed) {
      setPreferences({ subscribedCities: preferences.subscribedCities.filter(c => c !== city) });
    } else {
      setPreferences({ subscribedCities: [...preferences.subscribedCities, city] });
    }
  };

  const handleToggleType = (type: string) => {
    const isSubscribed = preferences.subscribedTypes.includes(type);
    if (isSubscribed) {
      setPreferences({ subscribedTypes: preferences.subscribedTypes.filter(t => t !== type) });
    } else {
      setPreferences({ subscribedTypes: [...preferences.subscribedTypes, type] });
    }
  };

  const addRadarNeighborhood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!radarInput.trim()) return;
    const val = radarInput.trim();
    if (!preferences.radarNeighborhoods.includes(val)) {
      setPreferences({ radarNeighborhoods: [...preferences.radarNeighborhoods, val] });
    }
    setRadarInput("");
  };

  const removeRadarNeighborhood = (n: string) => {
    setPreferences({ radarNeighborhoods: preferences.radarNeighborhoods.filter((x: string) => x !== n) });
  };



  const requestNotificationPermission = async () => {
    console.log("Clic détecté sur le switch, tentative de récupération du token...");
    
    try {
      const token = await requestPushPermission();
      
      if (token) {
        console.log("Token Firebase reçu:", token);
        setPreferences({ notificationsEnabled: true });
      } else {
        console.warn("Aucun token reçu, notifications refusées ou bloquées.");
        setPreferences({ notificationsEnabled: false });
      }
    } catch (error) {
      console.error("Erreur Firebase lors de la récupération du token:", error);
      setPreferences({ notificationsEnabled: false });
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setPreferences({ language: lng });
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-8 px-3 sm:px-4 md:px-0 animate-in fade-in zoom-in-95 duration-500">
      <Link to="/" className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 sm:mb-8 transition-all active:scale-95">
        <ArrowLeft size={16} /> {t('common.back', 'Retour')}
      </Link>

      <div className="mb-8 sm:mb-10 text-center md:text-left">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-light italic font-serif tracking-tight mb-2 uppercase">{t('settings.profile', 'Mon Profil')}</h1>
        <p className="text-[9px] sm:text-sm text-[var(--text-secondary)] font-medium">
          {user ? user.email : t('settings.guest', 'Mode Invité - Connectez-vous pour plus d\'options.')}
        </p>
      </div>

      <div className="space-y-4">

        {/* 1. System & Language */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color-strong)] rounded-[32px] overflow-hidden">
          <button onClick={() => toggleSection('system')} className="w-full flex items-center justify-between p-6 hover:bg-[var(--bg-primary)] transition-colors active:scale-[0.99]">
            <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3">
              <Globe size={18} className="text-[var(--text-primary)]" />
              {t('settings.system', 'Système & Langue')}
            </h2>
            {activeSection === 'system' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {activeSection === 'system' && (
            <div className="p-6 pt-0 border-t border-[var(--border-color-strong)] mt-2">
              <div className="py-4">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">
                  {t('settings.language', 'Langue de l\'application')}
                </label>
                <div className="flex gap-2">
                   <button onClick={() => changeLanguage('fr')} className={cn("px-4 py-2 rounded-[12px] text-xs font-bold uppercase border transition-all active:scale-95", i18n.language.startsWith('fr') ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]" : "bg-transparent text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]")}>
                     [FR] Français
                   </button>
                   <button onClick={() => changeLanguage('en')} className={cn("px-4 py-2 rounded-[12px] text-xs font-bold uppercase border transition-all active:scale-95", i18n.language.startsWith('en') ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]" : "bg-transparent text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]")}>
                     [EN] English
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. My Alerts History */}
        {user && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color-strong)] rounded-[32px] overflow-hidden">
            <button onClick={() => toggleSection('history')} className="w-full flex items-center justify-between p-6 hover:bg-[var(--bg-primary)] transition-colors active:scale-[0.99]">
              <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3">
                <History size={18} className="text-[var(--text-primary)]" />
                {t('settings.history', 'Historique de mes Signalements')}
              </h2>
              {activeSection === 'history' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {activeSection === 'history' && (
              <div className="p-6 pt-0 border-t border-[var(--border-color-strong)] mt-2">
                <div className="py-4 flex flex-col gap-3">
                  {loadingHistory ? (
                     <p className="text-xs text-[var(--text-tertiary)] text-center py-4">{t('common.loading', 'Chargement...')}</p>
                  ) : history.length === 0 ? (
                     <p className="text-xs text-[var(--text-tertiary)] text-center py-4">{t('settings.no_history', 'Aucun signalement publié.')}</p>
                  ) : (
                    history.map(alert => (
                      <Link to={`/alert/${alert.id}`} key={alert.id} className="flex items-center justify-between p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[16px] hover:border-[var(--text-primary)] transition-all active:scale-95">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold uppercase mb-1">{alert.title}</span>
                           <span className="text-[10px] text-[var(--text-secondary)]">{new Date(alert.created_at).toLocaleDateString()} • {alert.neighborhood}</span>
                        </div>
                        <span className="text-[9px] font-bold bg-[var(--text-primary)] text-[var(--bg-primary)] px-2 py-1 rounded-full">{alert.type}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Safety Zones & Preferences */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color-strong)] rounded-[32px] overflow-hidden">
          <button onClick={() => toggleSection('preferences')} className="w-full flex items-center justify-between p-6 hover:bg-[var(--bg-primary)] transition-colors active:scale-[0.99]">
            <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3">
              <Target size={18} className="text-[var(--text-primary)]" />
              {t('settings.safety_zones', 'Préférences & Zones de Sécurité')}
            </h2>
            {activeSection === 'preferences' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {activeSection === 'preferences' && (
            <div className="p-6 pt-0 border-t border-[var(--border-color-strong)] mt-2">
              <div className="flex items-center justify-between py-6 border-b border-[var(--border-color)]">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-1">
                    {preferences.notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                    {t('settings.push', 'Notifications Push')}
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)] max-w-[200px]">
                    {t('settings.push_desc', 'Soyez alerté en temps réel.')}
                  </p>
                </div>
                <button
                  onClick={requestNotificationPermission}
                  className={cn("relative h-6 w-12 shrink-0 cursor-pointer rounded-full transition-all", preferences.notificationsEnabled ? "bg-[var(--text-primary)]" : "bg-[var(--border-color-strong)]")}
                >
                  <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--bg-primary)] shadow transition mt-0.5 ml-0.5", preferences.notificationsEnabled ? "translate-x-6" : "translate-x-0")} />
                </button>
              </div>

              <div className="py-6 border-b border-[var(--border-color)]">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MapPin size={16} /> {t('settings.radius', 'Mes Zones de Sécurité (Périmètre)')}
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)] mb-4">
                  {t('settings.radius_desc', 'Définissez le rayon pour recevoir les alertes proches de vous.')}
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {RADII_KM.map(km => (
                    <button
                      key={km}
                      onClick={() => { setRadius(km); setPreferences({ dangerRadius: km }); }}
                      className={cn("px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all active:scale-95 border", radius === km ? "bg-red-600 text-white border-red-600" : "bg-transparent text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-primary)]")}
                    >
                      {km} KM
                    </button>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block">{t('settings.neighborhoods', 'Quartiers suivis individuellement')}</label>
                  <form onSubmit={addRadarNeighborhood} className="flex gap-2">
                    <input type="text" value={radarInput} onChange={(e) => setRadarInput(e.target.value)} placeholder="Ex: Bonamoussadi..." className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color-strong)] rounded-[12px] p-2 text-xs focus:outline-none focus:border-[var(--text-primary)]" />
                    <button type="submit" className="px-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-[12px] text-[10px] font-bold uppercase">{t('common.add', 'Ajouter')}</button>
                  </form>
                </div>
                <div className="flex flex-wrap gap-2">
                  {preferences.radarNeighborhoods.map((neighborhood: string) => (
                    <div key={neighborhood} className="flex items-center gap-1 pl-3 pr-2 py-1 rounded-full text-[10px] font-bold uppercase bg-[var(--text-primary)]/10 text-[var(--text-primary)]">
                      {neighborhood}
                      <button onClick={() => removeRadarNeighborhood(neighborhood)} className="p-0.5 hover:bg-[var(--text-primary)]/20 rounded-full"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="py-6 border-b border-[var(--border-color)]">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-4">
                  {t('settings.cities', 'Villes suivies')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {CITIES.map(city => (
                    <button key={city} onClick={() => handleToggleCity(city)} className={cn("px-3 py-1.5 rounded-full text-[9px] font-bold uppercase transition-all active:scale-95 border", preferences.subscribedCities.includes(city) ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]" : "bg-transparent text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-primary)]")}>
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>


      </div>
    </div>
  );
}
