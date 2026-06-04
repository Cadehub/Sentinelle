import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import admin from "npm:firebase-admin";

// 1. Initialisation sécurisée du SDK Firebase Admin
const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
let serviceAccount: Record<string, unknown> | null = null;

if (serviceAccountJson) {
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    console.error("FIREBASE_SERVICE_ACCOUNT n'est pas un JSON valide.", error);
  }
} else {
  console.error("FIREBASE_SERVICE_ACCOUNT n'est pas injecté dans les variables d'environnement Supabase.");
}

if (admin.apps.length === 0 && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
  });
}

// 2. Traitement du Webhook de la table public.system_broadcasts
serve(async (req) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const payload = await req.json();
    const record = payload?.record; // La ligne insérée dans system_broadcasts

    if (!record) {
      return new Response(JSON.stringify({ error: "Payload ou record Supabase manquant" }), {
        status: 400,
        headers,
      });
    }

    // Mapping chirurgical avec les colonnes réelles de ta table
    const alertId = record?.id;
    const alertType = record?.type;
    const alertMessage = record?.message; // Utilisation de .message au lieu de .title
    const ctaUrl = record?.cta_url;       // URL d'action si présente

    // Sécurité : Si pas d'identifiant ou de message textuel, on stoppe proprement
    if (!alertId || !alertMessage) {
      return new Response(JSON.stringify({ error: "Champs 'id' ou 'message' obligatoires manquants" }), {
        status: 400,
        headers,
      });
    }

    console.log(`[Broadcast] Traitement de l'annonce officielle ID: ${alertId} - Type: ${alertType}`);

    // Formatage propre de la notification push visible sur le téléphone/navigateur
    const notificationTitle = alertType ? `Sentinelle - ${alertType.toUpperCase()}` : "Alerte Officielle Sentinelle";
    const notificationBody = alertMessage.substring(0, 150); // Tronqué proprement pour l'affichage push

    const messaging = admin.messaging();

    // Construction du message FCM à destination du Topic unique global_alerts
    const notificationIconUrl = "https://res.cloudinary.com/droxtvmsy/image/upload/v1779060726/IMG-20260517-WA0007_rff0ko.png";
    const message = {
      notification: {
        title: notificationTitle,
        body: notificationBody,
        icon: notificationIconUrl,
        image: notificationIconUrl,
      },
      webpush: {
        notification: {
          icon: notificationIconUrl,
          badge: notificationIconUrl,
          image: notificationIconUrl,
        },
      },
      android: {
        notification: {
          icon: notificationIconUrl,
          image: notificationIconUrl,
        },
      },
      apns: {
        fcmOptions: {
          image: notificationIconUrl,
        },
      },
      data: {
        type: "global_alert",
        alert_id: alertId,
        alert_type: alertType || "general",
        cta_url: ctaUrl || "", // Reçu par le frontend (Next.js/React) pour rediriger au clic
      },
      topic: "global_alerts", // Le canal auquel s'abonnent tous les users
    };

    // Envoi synchrone à Firebase Cloud Messaging
    const result = await messaging.send(message);
    console.log("Succès : Notification de diffusion générale publiée via FCM :", result);

    return new Response(JSON.stringify({ success: true, messageId: result }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Échec critique lors de l'envoi de la notification globale :", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur interne Edge Function" }), {
      status: 500,
      headers,
    });
  }
});
