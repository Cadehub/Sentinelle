import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import admin from "npm:firebase-admin";

const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
let serviceAccount: Record<string, unknown> | null = null;

if (serviceAccountJson) {
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    console.error("FIREBASE_SERVICE_ACCOUNT n'est pas un JSON valide.", error);
  }
} else {
  console.error("FIREBASE_SERVICE_ACCOUNT n'est pas défini.");
}

if (admin.apps.length === 0 && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
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
    const notificationBody = `${alertTitle}${alertCity ? ` a ${alertCity}` : ""}`.substring(0, 150);

    const messaging = admin.messaging();

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
        type: "citizen_alert",
        alert_id: alertId,
        alert_type: alertType,
        city: alertCity || "Inconnue",
      },
      topic: "global_alerts", // Diffusé a tout le monde
    };

    const result = await messaging.send(message);

    console.log("Notification d'alerte citoyenne envoyee avec succes au topic :", result);

    return new Response(JSON.stringify({ success: true, result }), {
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
