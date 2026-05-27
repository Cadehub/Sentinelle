# Code Complet à Déployer dans Supabase

## 📁 Structure à Créer

```
supabase/functions/
├── publish-alert/
│   ├── index.ts
│   └── deno.json
├── moderate-message/
│   ├── index.ts
│   └── deno.json
├── update-alert/
│   ├── index.ts
│   └── deno.json
├── delete-alert/
│   ├── index.ts
│   └── deno.json
├── upload-alert-images/
│   ├── index.ts
│   └── deno.json
└── sentinelle-guide/
    ├── index.ts
    └── deno.json
```

---

## 1️⃣ PUBLISH-ALERT

### `supabase/functions/publish-alert/index.ts`

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
      return new Response(JSON.stringify({ error: 'Jeton de connexion manquant' }), {
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
      return new Response(JSON.stringify({ error: 'Utilisateur non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { title, description, type, city, neighborhood, contact, duration_days, imageBase64 } = await req.json()

    // 1. Upload de l'image facultative sur ImgBB
    let imageUrl = null
    if (imageBase64) {
      const imgbbKey = Deno.env.get('IMGBB_API_KEY')
      if (imgbbKey) {
        try {
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
            }
          } else {
            console.warn('[publish-alert] ImgBB upload failed:', imgbbRes.status)
          }
        } catch (imgErr) {
          console.warn('[publish-alert] Image upload error:', imgErr)
        }
      }
    }

    // 2. Analyse Gemini (modération, correction, classification)
    let finalDescription = description
    let finalType = type
    let geminiAnalysis = null

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (geminiKey) {
      try {
        const prompt = `Tu es un analyseur IA pour Sentinelle (application d'alerte citoyenne).

Analyse cette alerte et retourne UNIQUEMENT du JSON brut (pas de texte) sur une seule ligne:

{
  "status": "approved" ou "rejected",
  "corrected_text": "texte corrigé" ou texte original,
  "detected_type": "catégorie" (Vol, Perte, Objet Trouvé, Agression, Accident, Urgence Médicale, Incendie, Kidnapping, Drame, Autre),
  "severity": "low", "medium" ou "high",
  "reason": "raison si rejeté"
}

Alerte:
Titre: ${title}
Description: ${description}
Type: ${type}
Lieu: ${neighborhood}, ${city}`

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
          })
        })

        const geminiData = await geminiRes.json()

        if (!geminiRes.ok || !geminiData.candidates || !geminiData.candidates[0]) {
          console.error('[publish-alert] Gemini error:', geminiData)
        } else {
          try {
            const geminiText = geminiData.candidates[0].content.parts[0].text.trim()
            const jsonMatch = geminiText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const analysis = JSON.parse(jsonMatch[0])
              geminiAnalysis = analysis

              if (analysis.status === 'rejected') {
                return new Response(JSON.stringify({ error: `Contenu inapproprié: ${analysis.reason}` }), {
                  status: 400,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
              }

              finalDescription = analysis.corrected_text || description
              finalType = analysis.detected_type || type
            }
          } catch (parseErr) {
            console.warn('[publish-alert] JSON parse error:', parseErr)
          }
        }
      } catch (geminiErr) {
        console.warn('[publish-alert] Gemini error:', geminiErr)
      }
    }

    // 3. Calcul de la date d'expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + parseInt(duration_days))

    // 4. Insertion en BDD
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
        duration_days: parseInt(duration_days),
        expires_at: expiresAt.toISOString(),
        image_url: imageUrl,
        status: 'actif'
      })
      .select()

    if (insertError) throw insertError

    return new Response(JSON.stringify({
      success: true,
      data,
      ai_analysis: geminiAnalysis
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[publish-alert] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### `supabase/functions/publish-alert/deno.json`

```json
{
  "imports": {
    "https://deno.land/std@0.168.0/http/server.ts": "https://deno.land/std@0.168.0/http/server.ts",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

---

## 2️⃣ MODERATE-MESSAGE (NEW)

### `supabase/functions/moderate-message/index.ts`

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
      return new Response(JSON.stringify({ error: 'Jeton manquant' }), {
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
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { message, room_id } = await req.json()

    if (!message || !room_id) {
      return new Response(JSON.stringify({ error: 'Message ou room_id manquant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Modération Gemini
    let isSafe = true
    let aiAnalysis = null

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (geminiKey) {
      try {
        const moderationPrompt = `Tu es un modérateur pour Sentinelle (chat sécurisé).

Analyse ce message et détecte UNIQUEMENT:
1. Insultes, mots offensants, haine
2. Menaces, violence
3. Harcèlement, spam
4. Arnaque, phishing, extorsion
5. Contenu sexuel inapproprié

Retourne UNIQUEMENT du JSON sur UNE LIGNE:
{
  "is_safe": true/false,
  "reason": "explication si unsafe"
}

Message: "${message}"`

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: moderationPrompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
          })
        })

        const geminiData = await geminiRes.json()

        if (geminiRes.ok && geminiData.candidates && geminiData.candidates[0]) {
          try {
            const geminiText = geminiData.candidates[0].content.parts[0].text.trim()
            const jsonMatch = geminiText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              aiAnalysis = JSON.parse(jsonMatch[0])
              isSafe = aiAnalysis.is_safe !== false
            }
          } catch (parseErr) {
            console.warn('[moderate-message] JSON parse error:', parseErr)
          }
        } else {
          console.error('[moderate-message] Gemini error:', geminiData)
        }
      } catch (geminiErr) {
        console.warn('[moderate-message] Gemini error:', geminiErr)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      is_safe: isSafe,
      ai_analysis: aiAnalysis
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[moderate-message] Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### `supabase/functions/moderate-message/deno.json`

```json
{
  "imports": {
    "https://deno.land/std@0.168.0/http/server.ts": "https://deno.land/std@0.168.0/http/server.ts",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

---

## 3️⃣ UPDATE-ALERT

### `supabase/functions/update-alert/index.ts`

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
      return new Response(JSON.stringify({ error: 'Jeton de connexion manquant' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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
      return new Response(JSON.stringify({ error: 'Jeton invalide' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { id, title, description, type, city, neighborhood, contact, duration_days, status } = await req.json()

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID de l\'alerte manquant' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Vérifier que l'utilisateur est bien l'auteur
    const { data: alert, error: fetchError } = await supabaseClient
      .from('alerts')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !alert) {
      return new Response(JSON.stringify({ error: 'Alerte non trouvée' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (alert.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Vous n\'êtes pas autorisé à modifier cette alerte' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Correction via Gemini si description modifiée
    let correctedDescription = description
    let detectedType = type
    if (description) {
      const geminiKey = Deno.env.get('GEMINI_API_KEY')
      if (geminiKey) {
        try {
          const geminiModerationPrompt = `Tu es un modérateur et correcteur pour "Sentinelle" (application d'alerte citoyenne).

TÂCHES:
1. MODÉRATION: Si le texte contient des insultes, menaces, harcèlement ou contenu haineux (peu importe la langue), réponds EXACTEMENT "REJECT"
2. CORRECTION: Sinon, corrige discrètement TOUTES les fautes d'orthographe et grammaire (français ET anglais)
3. TYPE_DÉTECTION: Détecte automatiquement le type d'alerte selon le contenu (détection: Vol, Perte, Objet Trouvé, Agression, Accident, Urgence Médicale, Incendie, Kidnapping, Drame, Autre)

RÉPONSE: JSON uniquement sur UNE SEULE LIGNE
{
  "status": "approved" ou "rejected",
  "corrected_text": "texte corrigé" (ou texte original si aucune correction),
  "detected_type": "type détecté" (ex: Vol, Agression, etc),
  "reason": "raison si rejeté"
}

TEXTE À ANALYSER:
Title: "${title || ''}"
Description: "${description}"
Type soumis: "${type}"
Quartier: "${neighborhood}"
Ville: "${city}"`

          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiModerationPrompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
            })
          })

          const geminiData = await geminiRes.json()
          
          if (!geminiRes.ok || !geminiData.candidates || !geminiData.candidates[0]) {
            console.error('[update-alert] Gemini error:', geminiData)
          } else {
            const geminiResponse = geminiData.candidates[0].content.parts[0].text.trim()
            
            try {
              const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                const moderationResult = JSON.parse(jsonMatch[0])
                
                if (moderationResult.status === 'rejected') {
                  return new Response(JSON.stringify({ error: `Contenu inapproprié: ${moderationResult.reason}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
                }
                
                correctedDescription = moderationResult.corrected_text || description
                detectedType = moderationResult.detected_type || type
              }
            } catch (parseErr) {
              console.warn('[update-alert] JSON parse error:', parseErr)
            }
          }
        } catch (err) {
          console.warn('[update-alert] Gemini error:', err)
        }
      }
    }

    // Calculer la nouvelle date d'expiration si duration_days est fourni
    let expiresAt = undefined
    if (duration_days) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(duration_days))
      expiresAt = expiresAt.toISOString()
    }

    // Préparer les données à mettre à jour
    const updateData: any = {}
    if (title) updateData.title = title
    if (correctedDescription) updateData.description = correctedDescription
    if (detectedType) updateData.type = detectedType
    if (city) updateData.city = city
    if (neighborhood) updateData.neighborhood = neighborhood
    if (contact) updateData.contact = contact
    if (expiresAt) updateData.expires_at = expiresAt
    if (status) updateData.status = status

    if (Object.keys(updateData).length === 0) {
      return new Response(JSON.stringify({ error: 'Aucune donnée à mettre à jour' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Mettre à jour l'alerte
    const { data: updatedAlert, error: updateError } = await supabaseClient
      .from('alerts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return new Response(JSON.stringify({ success: true, alert: updatedAlert }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('[update-alert]', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
```

### `supabase/functions/update-alert/deno.json`

```json
{
  "imports": {
    "https://deno.land/std@0.168.0/http/server.ts": "https://deno.land/std@0.168.0/http/server.ts",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

---

## 4️⃣ DELETE-ALERT

### `supabase/functions/delete-alert/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
      return new Response(JSON.stringify({ error: 'Jeton de connexion manquant' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Utilisateur non autorisé' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { id } = await req.json()

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID de l\'alerte manquant' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Vérifier que l'utilisateur est bien l'auteur
    const { data: alert, error: fetchError } = await supabaseClient
      .from('alerts')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !alert) {
      return new Response(JSON.stringify({ error: 'Alerte non trouvée' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (alert.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Vous n\'êtes pas autorisé à supprimer cette alerte' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Supprimer l'alerte
    const { error: deleteError } = await supabaseClient
      .from('alerts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return new Response(JSON.stringify({ success: true, message: 'Alerte supprimée avec succès' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('[delete-alert]', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
```

### `supabase/functions/delete-alert/deno.json`

```json
{
  "imports": {
    "https://deno.land/std@0.168.0/http/server.ts": "https://deno.land/std@0.168.0/http/server.ts",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

---

## 5️⃣ UPLOAD-ALERT-IMAGES

### `supabase/functions/upload-alert-images/index.ts`

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

    if (!images || images.length === 0) {
      return new Response(JSON.stringify({ error: 'No images provided' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const imgbbKey = Deno.env.get('IMGBB_API_KEY')
    if (!imgbbKey) {
      return new Response(JSON.stringify({ error: 'ImgBB API key not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const uploadedImages: string[] = []

    for (const base64 of images) {
      const formData = new FormData()
      formData.append('image', base64.split(',')[1])

      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: 'POST',
        body: formData,
      })

      if (!imgbbRes.ok) {
        console.error(`ImgBB upload failed: ${imgbbRes.statusText}`)
        continue
      }

      const imgbbData = await imgbbRes.json()
      uploadedImages.push(imgbbData.data.url)
    }

    return new Response(JSON.stringify({ urls: uploadedImages }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
```

### `supabase/functions/upload-alert-images/deno.json`

```json
{
  "imports": {
    "https://deno.land/std@0.168.0/http/server.ts": "https://deno.land/std@0.168.0/http/server.ts"
  }
}
```

---

## 🔐 SECRETS À AJOUTER

Dans **Supabase Console → Settings → Secrets** ajoute:

```
GEMINI_API_KEY=<ta_clé_gemini>
IMGBB_API_KEY=<ta_clé_imgbb>
```

---

## ✅ VALIDATION

Après déploiement, vérifie dans **Supabase → Logs → Functions** qu'il n'y a pas d'erreurs.
