# 📝 Edge Functions - Codes Complets Pour Déploiement Manuel

**Status**: ✅ Tous les ALLOWED_ORIGINS sont à jour avec `sentinelle-v1.netlify.app`

Chaque code ci-dessous est prêt à copier-coller directement dans Supabase.

---

## 📋 RÉSUMÉ DES CHANGEMENTS

✅ **5 functions corrigées** (delete-alert, moderate-message, update-alert, translate-message, upload-alert-images)  
✅ **Changement**: CORS headers `'*'` → ALLOWED_ORIGINS avec contrôle strict  
✅ **Nouveau domaine**: `https://sentinelle-v1.netlify.app` ajouté partout

### Domaines autorisés dans toutes les functions:
```
- http://localhost:3000
- http://10.195.25.254:3000
- https://sentinelle-v1.netlify.app  ← NOUVEAU
- https://sentinelle.com
- https://www.sentinelle.com
```

---

## 1️⃣ CHAT-GUARD

**Fonction**: Modération en temps réel des messages  
**Fichier**: `supabase/functions/chat-guard/index.ts`

```typescript
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
```

---

## 2️⃣ PUBLISH-ALERT

**Fonction**: Publier alerte avec modération IA  
**Fichier**: `supabase/functions/publish-alert/index.ts`

```typescript
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
    // 1. Parse request
    let requestBody: any
    try {
      requestBody = await req.json()
    } catch (parseErr) {
      console.error('[publish-alert] Invalid JSON:', parseErr.message)
      return new Response(JSON.stringify({ error: 'JSON invalide' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const { title, description, type, city, neighborhood, duration_days, recentAlerts } = requestBody

    // 2. Validate required fields
    if (!title?.trim() || !description?.trim()) {
      return new Response(JSON.stringify({ error: 'Titre et description requis' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    console.log('[publish-alert] Input validated - Title:', title?.substring(0, 30))

    // 3. Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[publish-alert] Missing env vars')
      return new Response(JSON.stringify({ error: 'Configuration serveur manquante' }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.warn('[publish-alert] Auth error:', userError?.message)
      return new Response(JSON.stringify({ error: 'Utilisateur non authentifié' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    console.log('[publish-alert] User:', user.id)

    // 4. Gemini analysis for moderation
    let geminiAnalysis = {
      is_safe: true,
      detected_type: type || 'Autre',
      severity: 'medium',
      corrected_text: description,
      reason: null
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (geminiKey) {
      try {
        console.log('[publish-alert] Calling Gemini for moderation...')
        const analysisPrompt = `Tu es un correcteur orthographique professionnel. Ta mission est de corriger impeccablement les fautes d'orthographe, de grammaire et de syntaxe de la description suivante : "${description}". Tu DOIS conserver la longueur, le ton et la structure de la phrase originale. Ne résume JAMAIS le texte.

APRÈS LA CORRECTION COMPLÈTE, analyse la sécurité et retourne UNIQUEMENT du JSON sur UNE SEULE LIGNE, sans texte supplémentaire:

{
  "is_safe": true ou false,
  "detected_type": "Vol"|"Perte"|"Objet Trouvé"|"Agression"|"Accident"|"Urgence Médicale"|"Incendie"|"Kidnapping"|"Drame"|"Autre",
  "severity": "low"|"medium"|"high",
  "corrected_text": "TEXTE COMPLET CORRIGÉ (jamais résumé, longueur conservée)",
  "reason": "raison du rejet si unsafe, null si safe"
}

IMPORTANT: Le champ "corrected_text" DOIT contenir la description COMPLÈTE corrigée, pas un résumé.

Alerte à corriger:
Titre: ${title}
Description: ${description}
Type: ${type}
Lieu: ${neighborhood}, ${city}`

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: analysisPrompt }] }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
            })
          }
        )

        if (!geminiRes.ok) {
          console.warn('[publish-alert] Gemini HTTP error:', geminiRes.status)
        } else {
          const geminiData = await geminiRes.json()

          if (geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
            const responseText = geminiData.candidates[0].content.parts[0].text.trim()
            const jsonMatch = responseText.match(/\{[\s\S]*\}/)

            if (jsonMatch) {
              try {
                const analysis = JSON.parse(jsonMatch[0])
                geminiAnalysis = analysis
                console.log('[publish-alert] Gemini analysis OK - is_safe:', analysis.is_safe)
              } catch (parseErr) {
                console.warn('[publish-alert] JSON parse error:', parseErr.message)
              }
            }
          }
        }
      } catch (geminiErr) {
        console.warn('[publish-alert] Gemini error (non-fatal):', geminiErr.message)
      }
    } else {
      console.warn('[publish-alert] GEMINI_API_KEY not configured')
    }

    // 5. Détection des alertes en doublon
    let is_duplicate = false
    let duplicate_id = null

    if (recentAlerts && Array.isArray(recentAlerts) && recentAlerts.length > 0) {
      console.log('[publish-alert] Checking for duplicates against', recentAlerts.length, 'recent alerts')
      
      // Simple similitude basée sur le titre (exact ou contient les mots-clés)
      const titleLower = title.toLowerCase()
      const descriptionLower = geminiAnalysis.corrected_text.toLowerCase()

      for (const alert of recentAlerts) {
        const alertTitleLower = alert.title.toLowerCase()
        const alertDescLower = alert.description.toLowerCase()

        // Vérification 1: Titre identique
        if (titleLower === alertTitleLower) {
          is_duplicate = true
          duplicate_id = alert.id
          console.log('[publish-alert] Duplicate found (exact title match):', alert.id)
          break
        }

        // Vérification 2: Titre contient les mots clés du titre existant (au moins 70% de similitude)
        const titleWords = titleLower.split(/\s+/)
        const alertTitleWords = alertTitleLower.split(/\s+/)
        
        // Compter les mots communs
        const commonWords = titleWords.filter(word => 
          word.length > 3 && alertTitleLower.includes(word)
        ).length

        if (titleWords.length > 0 && commonWords / titleWords.length >= 0.7) {
          is_duplicate = true
          duplicate_id = alert.id
          console.log('[publish-alert] Duplicate found (similar title):', alert.id)
          break
        }
      }
    }

    // 6. Return analysis result (NO DATABASE INSERT)
    if (geminiAnalysis.is_safe === false) {
      console.log('[publish-alert] Alert rejected by AI:', geminiAnalysis.reason)
      return new Response(JSON.stringify({
        success: false,
        error: `Alerte refusée: ${geminiAnalysis.reason}`,
        ai_analysis: geminiAnalysis
      }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // Safe - return analysis with duplicate check info
    console.log('[publish-alert] Alert approved by AI - is_duplicate:', is_duplicate)
    return new Response(JSON.stringify({
      success: true,
      ai_analysis: {
        ...geminiAnalysis,
        is_duplicate,
        duplicate_id
      }
    }), {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('[publish-alert] Catch error:', {
      message: err?.message,
      name: err?.name
    })
    return new Response(JSON.stringify({ error: 'Erreur serveur: ' + (err?.message || 'Unknown') }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
```

---

## 3️⃣ MODERATE-MESSAGE

**Fonction**: Modération temps-réel des messages  
**Fichier**: `supabase/functions/moderate-message/index.ts`

```typescript
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
```

Continuer dans le message suivant...
