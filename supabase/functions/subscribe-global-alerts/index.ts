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
    const token = payload?.record?.token;

    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "token manquant ou invalide" }), {
        status: 400,
        headers,
      });
    }

    if (admin.apps.length === 0) {
      return new Response(JSON.stringify({ error: "Firebase Admin n'est pas initialisé" }), {
        status: 500,
        headers,
      });
    }

    const messaging = admin.messaging();
    const result = await messaging.subscribeToTopic([token], "global_alerts");

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Erreur lors de l'abonnement au topic global_alerts:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur interne" }), {
      status: 500,
      headers,
    });
  }
});
