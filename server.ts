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

  // Vite middleware for development
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
