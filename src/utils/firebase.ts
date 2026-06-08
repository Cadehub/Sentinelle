import { getMessaging, getToken } from 'firebase/messaging';
import { app } from './firebaseConfig';
import { supabase } from '../lib/supabase';

const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export async function requestPushPermission(): Promise<string | null> {
  if (!messaging) {
    console.warn("Firebase Messaging n'est pas initialisé.");
    return null;
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("Notifications ne sont pas supportées dans ce navigateur.");
    return null;
  }

  try {
    console.log("Demande de permission pour les notifications...");
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.warn("Utilisateur a refusé les notifications.");
      return null;
    }

    return await getFirebaseToken();
  } catch (error) {
    console.error("Erreur Firebase lors de la récupération du token FCM:", error);
    return null;
  }
}

export async function getFirebaseToken(): Promise<string | null> {
  if (!messaging) {
    console.warn("Firebase Messaging n'est pas initialisé.");
    return null;
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("Notifications ne sont pas supportées dans ce navigateur.");
    return null;
  }

  try {
    const vapidKey = 'BHqFjUVmUaty7xtbxsodS6prP4zHX1m4ssuoLEq7TkPH_Cqq7_vLf8vqOYuKGUv_mU9lNPDuI1xhp8TVh3Qz4wE';
    const serviceWorkerRegistration = "serviceWorker" in navigator ? await navigator.serviceWorker.ready : undefined;
    const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration });

    if (currentToken) {
      console.log("Vrai Token FCM généré:", currentToken);
      return currentToken;
    } else {
      console.log("Aucun token disponible. Vérifie les permissions.");
      return null;
    }
  } catch (error) {
    console.error("Erreur Firebase lors de la récupération du token FCM:", error);
    return null;
  }
}

export async function saveTokenToSupabase(token: string): Promise<boolean> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Utilisateur non authentifié. Impossible d'enregistrer le token.");
      return false;
    }

    console.log("Enregistrement du token FCM pour l'utilisateur:", user.id);

    const { data, error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: user.id,
          token: token,
        },
        { onConflict: 'token' }
      )
      .select();

    if (error) {
      console.error("Erreur lors de l'enregistrement du token Supabase:", error);
      return false;
    }

    console.log("Token FCM enregistré avec succes dans Supabase:", data);
    return true;
  } catch (error) {
    console.error("Erreur critique lors de l'enregistrement du token:", error);
    return false;
  }
}

export async function handleNotificationRegistration(userId: string): Promise<boolean | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications ne sont pas supportées dans ce navigateur.');
    return null;
  }

  try {
    // CAS : l'utilisateur a déjà bloqué les notifications dans le navigateur
    if (Notification.permission === 'denied') {
      console.error('Notifications non autorisées. L\'utilisateur a bloqué l\'accès.');
      // Émettre un événement UI global pour que l'interface puisse afficher un message
      try {
        window.dispatchEvent(new CustomEvent('notification-permission-denied', { detail: { userId } }));
      } catch (e) {
        // ignore
      }
      return null;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log("Permission de notification refusée lors de la demande.");
        if (permission === 'denied') {
          try {
            window.dispatchEvent(new CustomEvent('notification-permission-denied', { detail: { userId } }));
          } catch (e) {}
          return null;
        }
        return null;
      }
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notifications non autorisées.');
      return null;
    }

    console.log(`Permission accordée. Récupération du token FCM pour l'utilisateur ${userId}...`);
    const token = await getFirebaseToken();

    if (!token) {
      console.warn('Aucun token FCM reçu.');
      return null;
    }

    const saved = await saveTokenToSupabase(token);
    if (saved) {
      console.log(`Token FCM enregistré dans Supabase pour l'utilisateur ${userId}.`);
    } else {
      console.warn(`Échec de l'enregistrement du token FCM pour l'utilisateur ${userId}.`);
    }

    return saved;
  } catch (error) {
    console.error('Erreur lors de la gestion automatique des notifications :', error);
    return null;
  }
}

export async function ensureNotificationPermissionAndToken(): Promise<boolean | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("Notifications ne sont pas supportées dans ce navigateur.");
    return null;
  }

  // CAS : l'utilisateur a explicitement bloqué les notifications
  if (Notification.permission === 'denied') {
    console.error("Notifications non autorisées. L'utilisateur a bloqué l'accès.");
    try {
      window.dispatchEvent(new CustomEvent('notification-permission-denied', { detail: {} }));
    } catch (e) {}
    return null;
  }

  if (Notification.permission === "default") {
    console.log("Demande de permission automatique pour les notifications...");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("L'utilisateur a refusé les notifications.");
      if (permission === 'denied') {
        try {
          window.dispatchEvent(new CustomEvent('notification-permission-denied', { detail: {} }));
        } catch (e) {}
      }
      return null;
    }
  }

  if (Notification.permission !== "granted") {
    console.warn("Notifications non autorisées.");
    return null;
  }

  const token = await getFirebaseToken();
  if (!token) {
    console.warn("Aucun token FCM reçu.");
    return null;
  }

  return saveTokenToSupabase(token);
}
