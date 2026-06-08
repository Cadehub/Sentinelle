import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleAuth } from "npm:google-auth-library";

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
  console.error("FIREBASE_SERVICE_ACCOUNT n'est pas défini.");
}

// Initialisation de l'authentification Google OAuth2 (HTTPS classique, 100% stable sur Deno)
let auth: GoogleAuth | null = null;
if (serviceAccount) {
  auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
}

serve(async (req) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const payload = await req.json();
    const record = payload?.record; // La ligne insérée dans la table 'alerts'

    if (!record) {
      return new Response(JSON.stringify({ error: "record manquant" }), {
        status: 400,
        headers,
      });
    }

    // Extraction des données spécifiques aux signalements terrain
    const alertId = record?.id;
    const alertType = record?.type;   // Ex: "Accident", "Incendie"
    const alertTitle = record?.title;  // Ex: "Gros carambolage sur l'axe lourd"
    const alertCity = record?.city;    // Ex: "Douala"

    if (!alertId || !alertType || !alertTitle) {
      return new Response(JSON.stringify({ error: "id, type ou title manquant" }), {
        status: 400,
        headers,
      });
    }

    console.log(`[Signalement] Nouvelle alerte terrain reçue - Type: ${alertType}, Ville: ${alertCity}`);

    // Formatage dynamique de la notification push pour le citoyen
    const notificationTitle = `Nouvelle alerte : ${alertType}`;
    const notificationBody = `${alertTitle}${alertCity ? ` à ${alertCity}` : ""}`.substring(0, 150);
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

    // 2. Construction du payload de l'API REST v1 de Firebase Messaging
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    
    const fcmPayload = {
      message: {
        topic: "global_alerts", // Diffusé à tout le monde
        notification: {
          title: notificationTitle,
          body: notificationBody,
          image: notificationIconUrl,
        },
        data: {
          type: "citizen_alert",
          alert_id: String(alertId),
          alert_type: String(alertType),
          city: String(alertCity || "Inconnue"),
        },
        android: {
          notification: {
            icon: notificationIconUrl, // Doit correspondre à une ressource native ou URL selon ton setup client
            image: notificationIconUrl,
          },
        },
        webpush: {
          notification: {
            icon: notificationIconUrl,
            image: notificationIconUrl,
          },
          headers: {
            TTL: "86400", // Durée de vie de la notification (24h)
          }
        }
      }
    };

    // 3. Envoi via une simple requête HTTP POST native
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

    console.log("Notification d'alerte citoyenne envoyée avec succès via REST !");

    return new Response(JSON.stringify({ success: true, result: resultFCM }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Erreur lors de la publication de l'alerte citoyenne :", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur interne" }), {
      status: 500,
      headers,
    });
  }
});
