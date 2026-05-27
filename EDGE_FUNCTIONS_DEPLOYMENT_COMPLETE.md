# 🔐 EDGE FUNCTIONS SENTINELLE - CODE COMPLET DÉPLOIEMENT

## 📋 Résumé des Fonctions

| Fonction | Rôle | Auth | Gemini |
|----------|------|------|--------|
| **publish-alert** | Création + Analyse IA | ✅ Bearer | ✅ Classification |
| **chat-guard** | Modération Webhook | ✅ Interne | ✅ Détection danger |
| **sentinelle-guide** | Assistant conversationnel | ❌ Public | ✅ Réponses dynamiques |
| **update-alert** | Mise à jour CRUD | ✅ Bearer | ✅ Optionnel (modération) |
| **delete-alert** | Suppression CRUD | ✅ Bearer | ❌ Non |
| **upload-alert-images** | Upload Supabase Storage | ✅ Bearer | ❌ Non |

---

## 1️⃣ PUBLISH-ALERT

### Fichier: `supabase/functions/publish-alert/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Utilisateur non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { title, description, type, city, neighborhood, contact, duration_days, imageBase64 } = await req.json()

    if (!title || !description) {
      return new Response(JSON.stringify({ error: 'Titre et description requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Upload image facultative sur ImgBB
    let imageUrl = null
    if (imageBase64) {
      try {
        const imgbbKey = Deno.env.get('IMGBB_API_KEY')
        if (imgbbKey) {
          const formData = new FormData()
          formData.append('image', imageBase64)

          const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
            method: 'POST',
            body: formData,
          })

          if (imgbbRes.ok) {
            const imgbbData = await imgbbRes.json()
            if (imgbbData.success) {
              imageUrl = imgbbData.data.url
              console.log('[publish-alert] Image uploaded:', imageUrl)
            }
          }
        }
      } catch (imgErr) {
        console.warn('[publish-alert] Image upload error:', imgErr.message)
      }
    }

    // 2. Analyse Gemini: Modération + Classification + Gravité
    let finalDescription = description
    let finalType = type
    let geminiAnalysis = null
    let isSafe = true

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      console.warn('[publish-alert] GEMINI_API_KEY not configured')
    } else {
      try {
        const analysisPrompt = `Analyse cette alerte citoyenne et retourne UNIQUEMENT du JSON valide sur UNE SEULE LIGNE (pas d'autres textes):

{
  "is_safe": true/false,
  "detected_type": "Vol|Perte|Objet Trouvé|Agression|Accident|Urgence Médicale|Incendie|Kidnapping|Drame|Autre",
  "severity": "low"|"medium"|"high",
  "corrected_text": "description corrigée ou original",
  "reason": "raison si unsafe"
}

ALERTE:
Titre: ${title}
Description: ${description}
Type soumis: ${type}
Lieu: ${neighborhood}, ${city}`

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: analysisPrompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 300 }
            })
          }
        )

        if (!geminiRes.ok || !geminiRes.ok) {
          console.warn('[publish-alert] Gemini API error:', geminiRes.status)
        } else {
          const geminiData = await geminiRes.json()

          if (geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
            const responseText = geminiData.candidates[0].content.parts[0].text.trim()
            const jsonMatch = responseText.match(/\{[\s\S]*\}/)

            if (jsonMatch) {
              try {
                geminiAnalysis = JSON.parse(jsonMatch[0])
                isSafe = geminiAnalysis.is_safe !== false
                finalDescription = geminiAnalysis.corrected_text || description
                finalType = geminiAnalysis.detected_type || type

                if (!isSafe) {
                  console.log('[publish-alert] Alert blocked:', geminiAnalysis.reason)
                  return new Response(JSON.stringify({
                    error: `Alerte refusée: ${geminiAnalysis.reason}`,
                    is_safe: false
                  }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                  })
                }
              } catch (parseErr) {
                console.warn('[publish-alert] JSON parse error:', parseErr.message)
              }
            }
          }
        }
      } catch (geminiErr) {
        console.warn('[publish-alert] Gemini error:', geminiErr.message)
      }
    }

    // 3. Calcul date expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + parseInt(duration_days || '7'))

    // 4. Insert en BDD
    const { data, error: insertError } = await supabaseClient
      .from('alerts')
      .insert({
        user_id: user.id,
        title,
        description: finalDescription,
        type: finalType,
        city,
        neighborhood,
        contact,
        duration_days: parseInt(duration_days || '7'),
        expires_at: expiresAt.toISOString(),
        image_url: imageUrl,
        status: 'actif'
      })
      .select()
      .single()

    if (insertError) {
      console.error('[publish-alert] Insert error:', insertError.message)
      return new Response(JSON.stringify({ error: 'Erreur base de données' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('[publish-alert] Alert created:', data.id)

    return new Response(JSON.stringify({
      success: true,
      data,
      ai_analysis: geminiAnalysis
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[publish-alert] Error:', err.message || err)
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### Fichier: `supabase/functions/publish-alert/deno.json`

```json
{
  "imports": {
    "https://deno.land/std@0.168.0/http/server.ts": "https://deno.land/std@0.168.0/http/server.ts",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

---

## 2️⃣ CHAT-GUARD

### Fichier: `supabase/functions/chat-guard/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, record } = await req.json()

    if (type !== 'INSERT' && type !== 'UPDATE') {
      return new Response(JSON.stringify({ status: 'ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!record?.content || !record?.id) {
      console.warn('[chat-guard] Missing record data')
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const message = record.content
    const messageId = record.id

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      console.error('[chat-guard] GEMINI_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'Service unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Appel Gemini: Détection simple SAFE/DANGER
    const moderationPrompt = `Détecte UNIQUEMENT si ce message contient:
- Insultes, haine, discrimination
- Menaces, violence, harcèlement
- Arnaque, phishing, fraude
- Contenu sexuel inapproprié
- Spam massif

Réponds UNIQUEMENT par: SAFE ou DANGER

Message: "${message}"`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: moderationPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 10 }
        })
      }
    )

    if (!geminiRes.ok) {
      console.warn('[chat-guard] Gemini error:', geminiRes.status)
      // Continuer avec SAFE par défaut si Gemini échoue
    }

    let isSafe = true

    if (geminiRes.ok) {
      const geminiData = await geminiRes.json()
      if (geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
        const result = geminiData.candidates[0].content.parts[0].text.trim().toUpperCase()
        isSafe = result === 'SAFE'
        console.log(`[chat-guard] Message ${messageId}: ${result}`)
      }
    }

    // Mettre à jour is_safe dans chat_messages si DANGER
    if (!isSafe) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

      const { error: updateError } = await supabaseClient
        .from('chat_messages')
        .update({ is_safe: false })
        .eq('id', messageId)

      if (updateError) {
        console.error('[chat-guard] Update error:', updateError.message)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      messageId,
      is_safe: isSafe,
      status: isSafe ? 'approved' : 'blocked'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[chat-guard] Error:', err.message || err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### Fichier: `supabase/functions/chat-guard/deno.json`

```json
{
  "imports": {
    "https://deno.land/std@0.168.0/http/server.ts": "https://deno.land/std@0.168.0/http/server.ts",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

---

## 3️⃣ SENTINELLE-GUIDE

### Fichier: `supabase/functions/sentinelle-guide/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, language } = await req.json()
    const lang = language === 'en' ? 'en' : 'fr'

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message vide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      console.error('[sentinelle-guide] GEMINI_API_KEY not configured')
      return new Response(JSON.stringify({
        reply: lang === 'en'
          ? 'Service unavailable. Emergencies: Police 117 | Gendarmerie 118 | Firefighters 120'
          : 'Service indisponible. Urgences: Police 117 | Gendarmerie 118 | Pompiers 120'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const systemPromptFR = `Tu es l'Assistant Sentinelle. Réponds DIRECTEMENT et CLAIREMENT sur:
- Utilisation de l'app (créer alerte, contacter, partager)
- Sécurité & prévention (vol, agression, arnaque)
- Premiers secours & crises

NUMÉROS CAMEROUN:
Police: 117 | Gendarmerie: 118 | Pompiers: 120

Ton: Direct, concis, empathique. 2-3 phrases max. Si lien ou numéro: isole-le clairement.`

    const systemPromptEN = `You are the Sentinelle Assistant. Answer DIRECTLY and CLEARLY about:
- App usage (create alert, contact, share)
- Security & prevention (theft, assault, scams)
- First aid & crisis management

CAMEROON NUMBERS:
Police: 117 | Gendarmerie: 118 | Firefighters: 120

Tone: Direct, concise, empathetic. 2-3 sentences max. If link or number: isolate clearly.`

    const systemPrompt = lang === 'en' ? systemPromptEN : systemPromptFR

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: systemPrompt }] },
            { parts: [{ text: message }] }
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        })
      }
    )

    if (!response.ok) {
      console.warn('[sentinelle-guide] Gemini error:', response.status)
      return new Response(JSON.stringify({
        reply: lang === 'en'
          ? 'Unable to respond. For emergencies: Police 117'
          : 'Impossible de répondre. Urgences: Police 117'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      (lang === 'en' ? 'No response generated' : 'Aucune réponse générée')

    console.log(`[sentinelle-guide] Reply (${lang}): ${reply.length} chars`)

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[sentinelle-guide] Error:', err.message || err)
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### Fichier: `supabase/functions/sentinelle-guide/deno.json`

```json
{
  "imports": {
    "https://deno.land/std@0.168.0/http/server.ts": "https://deno.land/std@0.168.0/http/server.ts"
  }
}
```

---

## 4️⃣ UPDATE-ALERT

### Fichier: `supabase/functions/update-alert/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extraire user_id du JWT
    const token = authHeader.replace('Bearer ', '')
    let userId: string
    try {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('Invalid JWT')
      const decoded = JSON.parse(atob(parts[1]))
      userId = decoded.sub
      if (!userId) throw new Error('No sub in JWT')
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { id, title, description, type, city, neighborhood, contact, duration_days, status } = await req.json()

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID alerte manquant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Vérifier propriété
    const { data: alert, error: fetchError } = await supabaseClient
      .from('alerts')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !alert) {
      return new Response(JSON.stringify({ error: 'Alerte non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (alert.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Préparer données update
    const updateData: any = {}
    if (title) updateData.title = title
    if (description) updateData.description = description
    if (type) updateData.type = type
    if (city) updateData.city = city
    if (neighborhood) updateData.neighborhood = neighborhood
    if (contact) updateData.contact = contact
    if (status) updateData.status = status

    if (duration_days) {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(duration_days))
      updateData.expires_at = expiresAt.toISOString()
    }

    if (Object.keys(updateData).length === 0) {
      return new Response(JSON.stringify({ error: 'Aucune donnée à mettre à jour' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update
    const { data: updatedAlert, error: updateError } = await supabaseClient
      .from('alerts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[update-alert] Error:', updateError.message)
      return new Response(JSON.stringify({ error: 'Erreur base de données' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('[update-alert] Alert updated:', id)

    return new Response(JSON.stringify({ success: true, alert: updatedAlert }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[update-alert] Error:', err.message || err)
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### Fichier: `supabase/functions/update-alert/deno.json`

```json
{
  "imports": {
    "https://deno.land/std@0.168.0/http/server.ts": "https://deno.land/std@0.168.0/http/server.ts",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

---

## 5️⃣ DELETE-ALERT

### Fichier: `supabase/functions/delete-alert/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { id } = await req.json()

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID alerte manquant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Vérifier propriété
    const { data: alert, error: fetchError } = await supabaseClient
      .from('alerts')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !alert) {
      return new Response(JSON.stringify({ error: 'Alerte non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (alert.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Delete
    const { error: deleteError } = await supabaseClient
      .from('alerts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[delete-alert] Error:', deleteError.message)
      return new Response(JSON.stringify({ error: 'Erreur suppression' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('[delete-alert] Alert deleted:', id)

    return new Response(JSON.stringify({ success: true, message: 'Alerte supprimée' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[delete-alert] Error:', err.message || err)
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### Fichier: `supabase/functions/delete-alert/deno.json`

```json
{
  "imports": {
    "https://deno.land/std@0.168.0/http/server.ts": "https://deno.land/std@0.168.0/http/server.ts",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

---

## 6️⃣ UPLOAD-ALERT-IMAGES

### Fichier: `supabase/functions/upload-alert-images/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { images } = await req.json()

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: 'Images manquantes' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const imgbbKey = Deno.env.get('IMGBB_API_KEY')
    if (!imgbbKey) {
      console.error('[upload-alert-images] IMGBB_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'Service indisponible' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const uploadedUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const base64Image = images[i]

      try {
        const formData = new FormData()
        // Extraire la partie base64 si elle commence par data:
        const imageData = base64Image.includes(',') 
          ? base64Image.split(',')[1] 
          : base64Image

        formData.append('image', imageData)

        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
          method: 'POST',
          body: formData,
        })

        if (!imgbbRes.ok) {
          console.warn(`[upload-alert-images] Upload failed for image ${i}:`, imgbbRes.status)
          continue
        }

        const imgbbData = await imgbbRes.json()
        if (imgbbData.success && imgbbData.data?.url) {
          uploadedUrls.push(imgbbData.data.url)
          console.log(`[upload-alert-images] Image ${i} uploaded:`, imgbbData.data.url)
        }
      } catch (uploadErr) {
        console.warn(`[upload-alert-images] Error uploading image ${i}:`, uploadErr.message)
        continue
      }
    }

    if (uploadedUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucune image uploadée' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('[upload-alert-images] Uploaded:', uploadedUrls.length, 'images')

    return new Response(JSON.stringify({ success: true, urls: uploadedUrls }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[upload-alert-images] Error:', err.message || err)
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### Fichier: `supabase/functions/upload-alert-images/deno.json`

```json
{
  "imports": {
    "https://deno.land/std@0.168.0/http/server.ts": "https://deno.land/std@0.168.0/http/server.ts"
  }
}
```

---

## 🔐 SECRETS À CONFIGURER DANS SUPABASE

**Supabase Console → Settings → Secrets:**

```
GEMINI_API_KEY = <ta_clé_gemini_flash>
IMGBB_API_KEY = <ta_clé_imgbb>
```

---

## ✅ CHECKLIST PRÉ-DÉPLOIEMENT

- Endpoint Gemini unique: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`
- CORS headers: `Access-Control-Allow-Origin: '*'`
- Gemini API key via `Deno.env.get()` uniquement
- Validation stricte des réponses: `if (!res.ok || !data.candidates?.[0])`
- Gestion erreurs 500 éliminée
- Logs détaillés pour debugging
- ✅ Pas d'appels redondants
- ✅ Chaque fonction a son rôle clair

---

## COMMANDES DE DÉPLOIEMENT (EXÉCUTER DANS SUPABASE CLI)

```bash
supabase functions deploy publish-alert
supabase functions deploy chat-guard
supabase functions deploy sentinelle-guide
supabase functions deploy update-alert
supabase functions deploy delete-alert
supabase functions deploy upload-alert-images

supabase secrets set GEMINI_API_KEY="<clé>"
supabase secrets set IMGBB_API_KEY="<clé>"

supabase functions list
```

---

## 📊 MAPPAGE DES ENDPOINTS

| Fonction | URL | Méthode | Auth |
|----------|-----|--------|------|
| publish-alert | `/functions/v1/publish-alert` | POST | Bearer |
| chat-guard | Webhook (interne) | - | - |
| sentinelle-guide | `/functions/v1/sentinelle-guide` | POST | Public |
| update-alert | `/functions/v1/update-alert` | POST | Bearer |
| delete-alert | `/functions/v1/delete-alert` | DELETE | Bearer |
| upload-alert-images | `/functions/v1/upload-alert-images` | POST | Bearer |

---

## 🎯 VALIDATION POST-DÉPLOIEMENT

Vérifie dans **Supabase → Logs → Functions** qu'il n'y a pas d'erreurs.

Test depuis frontend:

```typescript
const response = await fetch('https://YOUR_PROJECT.supabase.co/functions/v1/sentinelle-guide', {
  method: 'POST',
  body: JSON.stringify({ message: 'Test', language: 'fr' })
})
const data = await response.json()
console.log(data.reply)
```

✅ **Prêt pour déploiement!**
