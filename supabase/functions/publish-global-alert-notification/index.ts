import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleAuth } from "npm:google-auth-library";

// 1. Initialisation sécurisée de la lecture du Secret
const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
let serviceAccount: Record<string, unknown> | null = null;
let projectId = "";

if (serviceAccountJson) {
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
    projectId = (serviceAccount as any).project_id;
  } catch (error) {
    console.error("FIREBASE_SERVICE_ACCOUNT n'est pas un JSON valide.", error);
  }
} else {
  console.error("FIREBASE_SERVICE_ACCOUNT n'est pas injecté dans les variables d'environnement Supabase.");
}

// Initialisation de l'authentification Google OAuth2 (100% stable sur Deno)
let auth: GoogleAuth | null = null;
if (serviceAccount) {
  auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
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
    const notificationIconUrl = "https://res.cloudinary.com/droxtvmsy/image/upload/v1779060726/IMG-20260517-WA0007_rff0ko.png";

    if (!auth || !projectId) {
      throw new Error("Configuration Firebase manquante ou invalide.");
    }

    // 1. Génération du token d'accès OAuth2 à la volée
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    if (!accessToken) {
      throw new Error("Impossible de générer le jeton d'accès Firebase.");
    }

    // 2. Construction du payload conforme à l'API REST v1 de Firebase Messaging
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    
    const fcmPayload = {
      message: {
        topic: "global_alerts", // Le canal auquel s'abonnent tous les users
        notification: {
          title: notificationTitle,
          body: notificationBody,
          image: notificationIconUrl,
        },
        data: {
          type: "global_alert",
          alert_id: String(alertId),
          alert_type: String(alertType || "general"),
          cta_url: String(ctaUrl || ""), // Reçu par le frontend (Next.js/React) pour rediriger au clic
        },
        android: {
          notification: {
            icon: notificationIconUrl,
            image: notificationIconUrl,
          },
        },
        webpush: {
          notification: {
            icon: notificationIconUrl,
            image: notificationIconUrl,
          },
          headers: {
            TTL: "86400", // Durée de vie de 24 heures
          }
        }
      }
    };

    // 3. Envoi via la requête HTTP POST native
    const responseFCM = await fetch(fcmUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fcmPayload),
    });

    const resultFCM = await responseFCM.json();

    if (!responseFCM.ok) {
      console.error("Erreur renvoyée par l'API Firebase:", resultFCM);
      return new Response(JSON.stringify({ error: resultFCM }), { status: 400, headers });
    }

    console.log("Succès : Notification de diffusion générale publiée via REST v1 !");

    return new Response(JSON.stringify({ success: true, messageId: resultFCM?.name }), {
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
