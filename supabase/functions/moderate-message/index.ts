import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Jeton de connexion manquant' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Utilisateur non autorisé' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const { message, room_id } = await req.json()

    if (!message || !room_id) {
      return new Response(JSON.stringify({ error: 'Message ou room_id manquant' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // Modération via Gemini
    let isSafe = true
    let geminiAnalysis = null

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (geminiKey) {
      try {
        const prompt = `Tu es un modérateur de sécurité pour une application de messagerie (Sentinelle).

Analyse ce message et retourne UNIQUEMENT du JSON brut sur une seule ligne:

{
  "is_safe": true ou false,
  "reason": "explication courte" (vide si safe)
}

Ne modère que pour:
- Contenu haineux ou discriminatoire
- Menaces ou violences
- Tentatives d'arnaque/phishing
- Harcèlement

Message: "${message}"`

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 200 }
          })
        })

        const geminiData = await geminiRes.json()

        if (!geminiRes.ok || !geminiData.candidates || !geminiData.candidates[0]) {
          console.error('[moderate-message] Gemini error:', geminiData)
        } else {
          try {
            const geminiText = geminiData.candidates[0].content.parts[0].text.trim()
            const jsonMatch = geminiText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const analysis = JSON.parse(jsonMatch[0])
              geminiAnalysis = analysis
              isSafe = analysis.is_safe !== false
            }
          } catch (parseErr) {
            console.warn('[moderate-message] JSON parse error:', parseErr)
          }
        }
      } catch (geminiErr) {
        console.warn('[moderate-message] Gemini error:', geminiErr)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      is_safe: isSafe,
      ai_analysis: geminiAnalysis
    }), {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[moderate-message] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
