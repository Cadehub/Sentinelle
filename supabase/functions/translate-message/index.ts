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
    const { text, targetLanguage = 'en', sourceLanguage = 'fr' } = await req.json()

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text parameter required' }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        }
      )
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      console.error('GEMINI_API_KEY not configured')
      return new Response(
        JSON.stringify({
          translatedText: null,
          error: 'Translation service not available'
        }),
        {
          status: 503,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        }
      )
    }

    const prompt = `Translate the following ${sourceLanguage} text to ${targetLanguage}. Return only the translated text, nothing else.

Text to translate:
"${text}"`

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Gemini API error:', errorData)
      return new Response(
        JSON.stringify({
          translatedText: null,
          error: 'Translation failed'
        }),
        {
          status: 503,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json()
    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || null

    return new Response(
      JSON.stringify({
        translatedText,
        success: !!translatedText
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Translation error:', error)
    return new Response(
      JSON.stringify({
        translatedText: null,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      }
    )
  }
})
