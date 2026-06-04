import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import admin from "npm:firebase-admin";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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

    let senderName = "Utilisateur";
    try {
      const { data: senderProfile, error: profileError } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", senderId)
        .single();

      if (senderProfile) {
        senderName = senderProfile.full_name || senderProfile.username || "Utilisateur";
      } else if (!profileError) {
        console.log("Table 'profiles' non trouvée ou utilisateur sans profil, utilisation du nom par défaut");
      }
    } catch (profileErr) {
      console.warn("Erreur lors de la récupération du profil sender:", profileErr);
    }

    const notificationTitle = `Nouveau message de ${senderName}`;
    const notificationBody = messageContent.substring(0, 100);

    const messaging = admin.messaging();

    let sendResult;
    if (tokens.length === 1) {
      const notificationIconUrl = "https://res.cloudinary.com/droxtvmsy/image/upload/v1779060726/IMG-20260517-WA0007_rff0ko.png";
      sendResult = await messaging.send({
        token: tokens[0],
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
          type: "private_message",
          sender_id: senderId,
          room_id: roomId,
        },
      });
    } else {
      const notificationIconUrl = "https://res.cloudinary.com/droxtvmsy/image/upload/v1779060726/IMG-20260517-WA0007_rff0ko.png";
      sendResult = await messaging.sendEachForMulticast({
        tokens: tokens,
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
          type: "private_message",
          sender_id: senderId,
          room_id: roomId,
        },
      });
    }

    console.log("Notification(s) envoyée(s) avec succes:", sendResult);

    return new Response(JSON.stringify({ success: true, result: sendResult }), {
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
