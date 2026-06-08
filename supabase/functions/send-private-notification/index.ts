import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleAuth } from "npm:google-auth-library";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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

// Initialisation de l'authentification Google OAuth2 (100% stable sur Deno)
let auth: GoogleAuth | null = null;
if (serviceAccount) {
  auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
}

const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

serve(async (req) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const payload = await req.json();
    const record = payload?.record;

    if (!record) {
      return new Response(JSON.stringify({ error: "record manquant" }), {
        status: 400,
        headers,
      });
    }

    const roomId = record?.room_id;
    const senderId = record?.sender_id;
    const messageContent = record?.content;

    if (!roomId || !senderId || !messageContent) {
      return new Response(JSON.stringify({ error: "room_id, sender_id ou content manquant" }), {
        status: 400,
        headers,
      });
    }

    console.log(`Webhook reçu pour message dans room ${roomId} de la part de ${senderId}`);

    // Récupération de la room pour identifier le destinataire
    const { data: chatRoom, error: roomError } = await supabase
      .from("chat_rooms")
      .select("owner_id, finder_id")
      .eq("id", roomId)
      .single();

    if (roomError || !chatRoom) {
      console.error("Erreur lors de la récupération du chat_room:", roomError);
      return new Response(JSON.stringify({ error: "chat_room non trouvé" }), {
        status: 404,
        headers,
      });
    }

    const receiverId = chatRoom.owner_id === senderId ? chatRoom.finder_id : chatRoom.owner_id;
    console.log(`Destinataire identifié: ${receiverId}`);

    // Récupération des tokens FCM de l'utilisateur ciblé
    const { data: tokenRecords, error: tokenError } = await supabase
      .from("user_push_tokens")
      .select("token")
      .eq("user_id", receiverId);

    if (tokenError) {
      console.error("Erreur lors de la récupération des tokens:", tokenError);
      return new Response(JSON.stringify({ error: "Impossible de récupérer les tokens" }), {
        status: 500,
        headers,
      });
    }

    const tokens = tokenRecords?.map((record: { token: string }) => record.token) || [];

    if (tokens.length === 0) {
      console.log(`Aucun token FCM trouvé pour le destinataire ${receiverId}`);
      return new Response(JSON.stringify({ success: true, message: "Aucun token à notifier" }), {
        status: 200,
        headers,
      });
    }

    console.log(`${tokens.length} token(s) trouvé(s) pour le destinataire`);

    // Récupération de l'identité de l'expéditeur
    let senderName = "Utilisateur";
    try {
      const { data: senderProfile, error: profileError } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", senderId)
        .single();

      if (senderProfile) {
        senderName = senderProfile.full_name || senderProfile.username || "Utilisateur";
      }
    } catch (profileErr) {
      console.warn("Erreur lors de la récupération du profil sender:", profileErr);
    }

    const notificationTitle = `Nouveau message de ${senderName}`;
    const notificationBody = messageContent.substring(0, 100);
    const notificationIconUrl = "https://res.cloudinary.com/droxtvmsy/image/upload/v1779060726/IMG-20260517-WA0007_rff0ko.png";

    if (!auth || !projectId) {
      throw new Error("Configuration Firebase ou projet manquante.");
    }

    // 1. Génération du token d'accès OAuth2 à la volée
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    if (!accessToken) {
      throw new Error("Impossible de générer le jeton d'accès Firebase.");
    }

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // 2. Préparation et envoi des requêtes HTTP en parallèle pour chaque token (Multicast natif)
    const sendPromises = tokens.map(async (token) => {
      const fcmPayload = {
        message: {
          token: token,
          notification: {
            title: notificationTitle,
            body: notificationBody,
            image: notificationIconUrl,
          },
          data: {
            type: "private_message",
            sender_id: String(senderId),
            room_id: String(roomId),
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
              TTL: "3600", // Durée de vie plus courte pour de la messagerie instantanée (1h)
            }
          }
        }
      };

      const response = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fcmPayload),
      });

      return response.ok ? response.json() : Promise.reject(await response.json());
    });

    const results = await Promise.allSettled(sendPromises);
    console.log("Résultats des envois de notifications privées:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error("Erreur lors de l'envoi de la notification privée:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur interne" }), {
      status: 500,
      headers,
    });
  }
});
