import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Analyze if a comment resolves an alert
  app.post("/api/analyze-resolution", async (req, res) => {
    try {
      const { text } = req.body;
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      
      console.log('[API] Analyzing resolution text:', text.substring(0, 50));
      
      if (!GEMINI_API_KEY || GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
        console.warn('[API] GEMINI_API_KEY not configured - returning default false');
        return res.status(200).json({ isResolved: false });
      }

      if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ error: "Text field is required and must be a non-empty string" });
      }

      const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent'
      
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { 
                  text: `Tu es un expert en analyse de texte intelligent et précis. Ton rôle: analyser si l'auteur indique que son problème/alerte est RÉSOLU.

**Critères de RÉSOLUTION :**
- Mots-clés positifs: "retrouvé", "trouvé", "c'est bon", "résolu", "réglé", "fini", "terminé", "plus besoin", "alerte levée", "merci c'est ok"
- Contexte: la personne confirme que le problème n'existe plus
- Sentiment: soulagement, satisfaction

**Critères de NON-RÉSOLUTION :**
- Doutes ou inquiétudes persistent
- L'auteur demande encore de l'aide
- Situation toujours en cours

**Réponds UNIQUEMENT par :**
- "YES" ou "OUI" si RÉSOLU
- "NO" ou "NON" si NON-RÉSOLU

Texte à analyser: "${text}"`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 10,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[API] Gemini API error:", response.status, errorText);
        return res.status(200).json({ isResolved: false });
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        console.warn("[API] No candidates in Gemini response:", data);
        return res.status(200).json({ isResolved: false });
      }

      const responseText = data.candidates[0].content?.parts?.[0]?.text || '';
      const isResolved = responseText.toUpperCase().includes("YES") || responseText.toUpperCase().includes("OUI");
      
      console.log('[API] Resolution analysis result:', isResolved, 'Response:', responseText);
      res.json({ isResolved });
    } catch (error) {
      console.error("[API] Erreur lors de l'analyse sémantique:", error);
      res.status(200).json({ isResolved: false });
    }
  });

  // API Route: Supabase Webhooks → OneSignal Push Notifications
  app.post("/api/webhooks/push", async (req, res) => {
    try {
      // Verify webhook signature for security
      const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
      const headerSecret = req.headers["x-supabase-webhook-secret"];

      if (webhookSecret && headerSecret !== webhookSecret) {
        console.warn("[WEBHOOK] Invalid webhook secret");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { table, type, record } = req.body;

      if (!table || !record) {
        return res.status(400).json({ error: "Missing table or record" });
      }

      // Check if OneSignal is configured
      const oneSignalAppId = process.env.VITE_ONESIGNAL_APP_ID;
      const oneSignalRestKey = process.env.ONESIGNAL_REST_API_KEY;

      if (!oneSignalAppId || oneSignalAppId === "YOUR_ONESIGNAL_APP_ID_HERE" ||
          !oneSignalRestKey || oneSignalRestKey === "YOUR_ONESIGNAL_REST_API_KEY_HERE") {
        console.warn("[WEBHOOK] OneSignal not configured - skipping push notification");
        return res.status(200).json({ message: "OneSignal not configured" });
      }

      let pushPayload: any = {
        app_id: oneSignalAppId,
      };

      // Handle chat_messages table (private messages)
      if (table === "chat_messages" && type === "INSERT") {
        console.log("[WEBHOOK] Processing new chat message for user:", record.receiver_id);

        pushPayload = {
          ...pushPayload,
          headings: { en: "Nouveau message" },
          contents: { en: record.content || "Vous avez reçu un message" },
          include_external_user_ids: [record.receiver_id],
          ios_badgeType: "Increase",
          ios_badgeCount: 1,
        };

        console.log("[WEBHOOK] Chat message payload prepared:", {
          receiver: record.receiver_id,
          content: record.content?.substring(0, 50),
        });
      }
      // Handle alerts table (public security alerts)
      else if (table === "alerts" && type === "INSERT") {
        console.log("[WEBHOOK] Processing new alert:", record.title);

        const formattedTitle = `[${(record.type || "ALERTE").toUpperCase()}] ${record.title}`;
        const formattedBody = `Lieu: ${record.city}${record.neighborhood ? ` - ${record.neighborhood}` : " - Secteur non spécifié"}. Ouvrez l'application pour plus de détails.`;

        pushPayload = {
          ...pushPayload,
          headings: { en: formattedTitle },
          contents: { en: formattedBody },
          included_segments: ["All Users"],
          big_picture: record.image_url || undefined,
          ios_attachments: record.image_url ? { id: record.image_url } : undefined,
          priority: 10, // High priority for alerts
        };

        console.log("[WEBHOOK] Alert payload prepared:", {
          title: formattedTitle,
          body: formattedBody,
          image: record.image_url,
        });
      }
      // Handle chat_rooms table (new conversations)
      else if (table === "chat_rooms" && type === "INSERT") {
        console.log("[WEBHOOK] Processing new chat room:", record.id);

        const participants = [record.finder_id, record.owner_id].filter(Boolean);

        if (participants.length === 0) {
          console.warn("[WEBHOOK] No valid participants in chat room");
          return res.status(200).json({ message: "No valid participants" });
        }

        pushPayload = {
          ...pushPayload,
          headings: { en: "Nouvelle conversation" },
          contents: { en: "Une nouvelle conversation a été engagée. Cliquez pour discuter." },
          include_external_user_ids: participants,
          ios_badgeType: "Increase",
          ios_badgeCount: 1,
          priority: 8,
        };

        console.log("[WEBHOOK] Chat room payload prepared:", {
          participants: participants,
          alertId: record.alert_id,
        });
      } else {
        console.log("[WEBHOOK] Unsupported table or type:", table, type);
        return res.status(200).json({ message: "Unsupported table or type" });
      }

      // Send to OneSignal
      const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${oneSignalRestKey}`,
        },
        body: JSON.stringify(pushPayload),
      });

      if (!oneSignalResponse.ok) {
        const errorText = await oneSignalResponse.text();
        console.error("[WEBHOOK] OneSignal API error:", oneSignalResponse.status, errorText);
        return res.status(500).json({ error: "Failed to send push notification" });
      }

      const notificationData = await oneSignalResponse.json();
      console.log("[WEBHOOK] Push notification sent successfully:", notificationData.id);

      res.status(200).json({
        success: true,
        message: "Push notification sent",
        notificationId: notificationData.id,
      });
    } catch (error) {
      console.error("[WEBHOOK] Error processing webhook:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
