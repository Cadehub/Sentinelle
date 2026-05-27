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
    // Log incoming request
    console.log('[chat-guard] Incoming request from:', req.headers.get('origin'))
    
    const { message } = await req.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ blocked: false }), {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // SECURITY INTERCEPTION: Check forbidden words before any other processing
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

      if (supabaseUrl && supabaseAnonKey) {
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

        // Fetch all forbidden words from the table
        const { data: forbiddenWords, error: fetchError } = await supabaseClient
          .from('forbidden_words')
          .select('word')

        if (fetchError) {
          console.warn('[chat-guard] Error fetching forbidden words:', fetchError.message)
        } else if (forbiddenWords && forbiddenWords.length > 0) {
          // Convert message to lowercase for comparison
          const lowerMessage = message.toLowerCase()

          // Check if any forbidden word is contained in the message
          for (const wordObj of forbiddenWords) {
            const forbiddenWord = wordObj.word.toLowerCase()
            if (lowerMessage.includes(forbiddenWord)) {
              console.log('[chat-guard] Policy violation detected - forbidden word:', forbiddenWord)
              
              // Immediately return 403 with policy_violation error
              return new Response(JSON.stringify({ success: false, error: 'policy_violation' }), {
                status: 403,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
              })
            }
          }
        }
      }
    } catch (forbiddenWordsErr) {
      console.warn('[chat-guard] Forbidden words check error:', forbiddenWordsErr)
      // Don't block if the check fails - continue to normal flow
    }

    // Optional authentication verification (logs but doesn't block)
    const authHeader = req.headers.get('authorization')
    let userId: string | null = null
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
        
        if (supabaseUrl && supabaseAnonKey) {
          const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
          })
          
          const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
          if (user && !userError) {
            userId = user.id
            console.log('[chat-guard] Authenticated user:', userId)
          } else {
            console.warn('[chat-guard] Auth verification failed:', userError?.message)
          }
        }
      } catch (authErr) {
        console.warn('[chat-guard] Auth parsing error:', authErr)
      }
    } else {
      console.warn('[chat-guard] No authorization header provided')
    }

    const geminiKey = Deno.env.get('GEMINI_CHAT_GUARD_KEY')
    if (!geminiKey) {
      console.error('[chat-guard] GEMINI_CHAT_GUARD_KEY not configured')
      // Pass through if API not configured (don't block)
      return new Response(JSON.stringify({ blocked: false }), {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // Analysis prompt for Gemini
    const analysisPrompt = `Analyse ce message. Cherche toute demande d'argent, extorsion, ou partage de coordonnées (numéro, email, réseaux sociaux). Tu DOIS répondre UNIQUEMENT par un objet JSON valide, sans markdown, sans explication supplémentaire.
Si tu détectes une infraction, renvoie : {"blocked": true, "reason": "explication courte"}.
Si le message est sain, renvoie : {"blocked": false, "reason": null}.

Message: "${message}"`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
        })
      }
    )

    if (!geminiRes.ok) {
      console.error('[chat-guard] Gemini error:', geminiRes.status)
      // Pass through if Gemini fails (don't block)
      return new Response(JSON.stringify({ blocked: false, reason: null }), {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const geminiData = await geminiRes.json()

    if (!geminiData.candidates || !geminiData.candidates[0]) {
      console.warn('[chat-guard] Invalid Gemini response')
      return new Response(JSON.stringify({ blocked: false, reason: null }), {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    try {
      const responseText = geminiData.candidates[0].content.parts[0].text.trim()
      console.log('[chat-guard] Gemini raw response:', responseText)
      
      // Parse JSON response from Gemini
      const analysisResult = JSON.parse(responseText)
      
      // Validate response structure
      if (typeof analysisResult.blocked !== 'boolean') {
        console.warn('[chat-guard] Invalid response structure, missing or invalid blocked field')
        return new Response(JSON.stringify({ blocked: false, reason: null }), {
          status: 200,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        })
      }

      console.log(`[chat-guard] Message analysis result:`, analysisResult)

      // Return the parsed JSON directly
      return new Response(JSON.stringify(analysisResult), {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })

    } catch (parseErr) {
      console.warn('[chat-guard] JSON parse error:', parseErr)
      return new Response(JSON.stringify({ blocked: false, reason: null }), {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

  } catch (err) {
    console.error('[chat-guard] Error:', err)
    return new Response(JSON.stringify({ blocked: false, reason: null }), {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
