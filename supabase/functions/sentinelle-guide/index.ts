import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://10.195.25.254:3000',
  'https://sentinelle-v1.netlify.app',
  'https://sentinelle.com',
  'https://www.sentinelle.com'
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin")
  const allowOrigin = ALLOWED_ORIGINS.includes(origin || '') ? origin! : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, DELETE',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apiKey, content-type',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const { message, language } = await req.json()
    const lang = (language || 'fr').toLowerCase() === 'en' ? 'en' : 'fr'

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message vide' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      console.error('[sentinelle-guide] GEMINI_API_KEY not configured')
      return new Response(JSON.stringify({ 
        reply: lang === 'en' 
          ? "Service temporarily unavailable. For emergencies: Police 117, Gendarmerie 118, Firefighters 120. WhatsApp: +237654016097"
          : "Service indisponible. Urgence: Police 117, Gendarmerie 118, Pompiers 120. WhatsApp: +237654016097"
      }), {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // Prompts multilingues
    const systemPromptFR = `Tu es l'Assistant Sentinelle, expert de la plateforme Sentinelle et spécialiste en sécurité citoyenne.

RÔLE: Répondre exhaustivement aux questions sur:
1. UTILISATION PLATEFORME: Comment créer alerte, contacter, partager, utiliser chat
2. SÉCURITÉ & PRÉVENTION: Vol, agression, arnaque, phishing, fraude
3. SECOURISME: Premiers secours, gestion des crises
4. URGENCES: Guidance immédiate pendant crises

NUMÉROS CAMEROUN:
- Police: 117
- Gendarmerie: 118
- Pompiers/SAMU: 120

CONTACTS SUPPORT:
- +237654016097
- +237652270756
- https://whatsapp.com/channel/0029VbD2ZtWJ93wc2NXu6M02

INSTRUCTIONS:
- Réponse directe, claire, exhaustive
- 2-3 paragraphes minimum
- Suggère numéros d'urgence si pertinent
- Empathique, rassurant, professionnel
- Pas d'emojis
- FRANÇAIS UNIQUEMENT`

    const systemPromptEN = `You are the Sentinelle Assistant, expert on the Sentinelle platform and citizen security specialist.

ROLE: Respond exhaustively to questions about:
1. PLATFORM USAGE: How to create alerts, contact users, share stories, use chat
2. SECURITY & PREVENTION: Theft, assault, scams, phishing, fraud
3. FIRST AID: Emergency response, crisis management
4. EMERGENCIES: Immediate guidance during crises

CAMEROON NUMBERS:
- Police: 117
- Gendarmerie: 118
- Firefighters/SAMU: 120

SUPPORT CONTACTS:
- +237654016097
- +237652270756
- https://whatsapp.com/channel/0029VbD2ZtWJ93wc2NXu6M02

INSTRUCTIONS:
- Direct, clear, exhaustive response
- 2-3 paragraphs minimum
- Suggest emergency numbers if relevant
- Empathetic, reassuring, professional
- No emojis
- ENGLISH ONLY`

    const systemPrompt = lang === 'en' ? systemPromptEN : systemPromptFR

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: message }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
          topP: 0.95,
          topK: 40
        }
      })
    })

    if (!response.ok) {
      console.error('[sentinelle-guide] Gemini error:', response.status)
      return new Response(JSON.stringify({
        reply: lang === 'en'
          ? "AI service unavailable. For emergencies: Police 117, Gendarmerie 118, Firefighters 120."
          : "Service IA indisponible. Urgences: Police 117, Gendarmerie 118, Pompiers 120."
      }), {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.warn('[sentinelle-guide] Invalid Gemini response')
      return new Response(JSON.stringify({
        reply: lang === 'en' ? "Unable to generate response." : "Impossible de générer une réponse."
      }), {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const reply = data.candidates[0].content.parts[0].text

    console.log(`[sentinelle-guide] Reply generated (${lang}). Length: ${reply.length}`)

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[sentinelle-guide] Error:', err)
    return new Response(JSON.stringify({
      error: err.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
