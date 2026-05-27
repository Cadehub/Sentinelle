import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  fr: {
    translation: {
      common: {
        back: "Retour",
        loading: "Chargement...",
        save: "Enregistrer",
        add: "Ajouter"
      },
      settings: {
        profile: "Mon Profil",
        guest: "Mode Invité - Connectez-vous pour plus d'options.",
        system: "Système & Langue",
        language: "Langue de l'application",
        history: "Historique de mes Signalements",
        no_history: "Aucun signalement publié.",
        safety_zones: "Préférences & Zones de Sécurité",
        push: "Notifications Push",
        push_desc: "Soyez alerté en temps réel.",
        radius: "Mes Zones de Sécurité (Périmètre)",
        radius_desc: "Définissez le rayon pour recevoir les alertes proches de vous.",
        neighborhoods: "Quartiers suivis individuellement",
        cities: "Villes suivies",
        contacts: "Contacts d'Urgence Personnels",
        contacts_desc: "Enregistrez le numéro d'un proche à prévenir automatiquement par SMS en cas de déclenchement d'une Alerte Rouge.",
        contact_saved: "Contact actif :",
        no_notif_support: "Ce navigateur ne supporte pas les notifications.",
        notif_blocked: "Les notifications ont été bloquées dans les paramètres."
      },
      guide: {
        kidnapping: "Kidnapping / Disparition inquiétante",
        assault: "Agression / Vol en cours",
        accident: "Accident grave / Urgence Médicale",
        lost_item: "Perte ou trouvaille de document (CNI, etc.)",
        welcome: "Bonjour, je suis votre assistant Sentinelle. Comment puis-je vous aider en cas de crise ou pour toute procédure de signalement ?",
        contact_auth: "Contacter les autorités",
        generate_poster: "Générer une affiche de disparition",
        ask_other: "Poser une autre question",
        call_police: "Appeler la Police (117)",
        how_to_report: "Comment porter plainte ?",
        call_firefighters: "Appeler les Pompiers (120)",
        first_aid: "Gestes de premiers secours",
        what_else: "Que faire d'autre ?",
        service_unavailable: "Le service d'assistance est actuellement indisponible. En cas d'urgence, veuillez contacter les numéros de secours.",
        need_help: "Besoin d'aide ou Urgence ?",
        title: "Guide Sentinelle",
        absolute_emergency: "Urgence Absolue",
        police: "Police (117)",
        gendarmerie: "Gendarmerie (118)",
        firefighters: "Sapeurs-Pompiers (120)",
        placeholder: "Décrivez l'urgence ou votre question..."
      }
    }
  },
  en: {
    translation: {
      common: {
        back: "Back",
        loading: "Loading...",
        save: "Save",
        add: "Add"
      },
      settings: {
        profile: "My Profile",
        guest: "Guest Mode - Log in for more options.",
        system: "System & Language",
        language: "App Language",
        history: "My Alerts History",
        no_history: "No alerts published.",
        safety_zones: "Safety Zones & Preferences",
        push: "Push Notifications",
        push_desc: "Get real-time alerts.",
        radius: "My Safety Zones (Radius)",
        radius_desc: "Set the radius to receive alerts near you.",
        neighborhoods: "Individually tracked neighborhoods",
        cities: "Tracked cities",
        contacts: "Personal Emergency Contacts",
        contacts_desc: "Save a loved one's number to notify them automatically via SMS during a Red Alert.",
        contact_saved: "Active contact:",
        no_notif_support: "Browser does not support notifications.",
        notif_blocked: "Notifications are blocked in settings."
      },
      guide: {
        kidnapping: "Kidnapping / Missing Person",
        assault: "Assault / Robbery in progress",
        accident: "Severe Accident / Medical Emergency",
        lost_item: "Lost or Found Document (ID, etc.)",
        welcome: "Hello, I am your Sentinelle assistant. How can I help you during a crisis or with any reporting procedure?",
        contact_auth: "Contact authorities",
        generate_poster: "Generate missing poster",
        ask_other: "Ask another question",
        call_police: "Call Police (117)",
        how_to_report: "How to file a police report?",
        call_firefighters: "Call Firefighters (120)",
        first_aid: "First aid procedures",
        what_else: "What else to do?",
        service_unavailable: "The support service is currently unavailable. In an emergency, please contact rescue numbers.",
        need_help: "Need help or Emergency?",
        title: "Sentinelle Guide",
        absolute_emergency: "Absolute Emergency",
        police: "Police (117)",
        gendarmerie: "Gendarmerie (118)",
        firefighters: "Firefighters (120)",
        placeholder: "Describe the emergency or your question..."
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false, // react already safes from xss
    }
  });

export default i18n;
