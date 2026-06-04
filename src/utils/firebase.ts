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

    console.log("Permission accordée, récupération du token FCM...");
    const vapidKey = 'BHqFjUVmUaty7xtbxsodS6prP4zHX1m4ssuoLEq7TkPH_Cqq7_vLf8vqOYuKGUv_mU9lNPDuI1xhp8TVh3Qz4wE';

    const currentToken = await getToken(messaging, { vapidKey });
    
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
