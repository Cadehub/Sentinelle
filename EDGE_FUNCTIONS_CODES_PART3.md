# 📝 Edge Functions - Codes Complets Pour Déploiement Manuel (Part 3)

Suite du document [EDGE_FUNCTIONS_CODES_PART2.md](./EDGE_FUNCTIONS_CODES_PART2.md)

---

## 7️⃣ TRANSLATE-MESSAGE

**Fonction**: Traduction FR ↔ EN des messages  
**Fichier**: `supabase/functions/translate-message/index.ts`

```typescript
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
```

---

## 8️⃣ UPLOAD-ALERT-IMAGES

**Fonction**: Upload images vers ImgBB  
**Fichier**: `supabase/functions/upload-alert-images/index.ts`

```typescript
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
    const { images } = await req.json()

    if (!images || images.length === 0) {
      return new Response(JSON.stringify({ error: 'No images provided' }), { 
        status: 400, 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      })
    }

    const imgbbKey = Deno.env.get('IMGBB_API_KEY')
    if (!imgbbKey) {
      return new Response(JSON.stringify({ error: 'ImgBB API key not configured' }), { 
        status: 500, 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
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
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
```

---

# 🚀 DÉPLOIEMENT MANUEL DANS SUPABASE

## Étapes de déploiement

### 1️⃣ Prérequis
- ✅ Accès au dashboard Supabase: https://app.supabase.com
- ✅ Project ID: `wcrkcuugancklxirqfyl`
- ✅ CLI Supabase installé (optionnel mais recommandé)

### 2️⃣ Via CLI (Recommandé)

```bash
# Depuis la racine du projet
supabase functions deploy chat-guard --project-id wcrkcuugancklxirqfyl
supabase functions deploy publish-alert --project-id wcrkcuugancklxirqfyl
supabase functions deploy moderate-message --project-id wcrkcuugancklxirqfyl
supabase functions deploy delete-alert --project-id wcrkcuugancklxirqfyl
supabase functions deploy update-alert --project-id wcrkcuugancklxirqfyl
supabase functions deploy sentinelle-guide --project-id wcrkcuugancklxirqfyl
supabase functions deploy translate-message --project-id wcrkcuugancklxirqfyl
supabase functions deploy upload-alert-images --project-id wcrkcuugancklxirqfyl
```

### 3️⃣ Via Dashboard Supabase (UI)

1. Aller à **Edge Functions** dans le dashboard
2. Cliquer **Create a new function** (ou éditer une existante)
3. Sélectionner le langage: **TypeScript**
4. Copier-coller le code complet de la function
5. Déployer (Deploy)

### 4️⃣ Via Git Push (Si Supabase GitHub intégré)

```bash
git add supabase/functions/*/index.ts
git commit -m "chore: update CORS headers for sentinelle-v1.netlify.app"
git push origin main  # Supabase déploiera automatiquement
```

---

# ✅ VÉRIFICATION POST-DÉPLOIEMENT

Après déploiement, tester chaque function:

```bash
# Test chat-guard
curl -X POST https://wcrkcuugancklxirqfyl.supabase.co/functions/v1/chat-guard \
  -H "Content-Type: application/json" \
  -d '{"message": "Bonjour, comment ça va?"}'

# Test translate-message
curl -X POST https://wcrkcuugancklxirqfyl.supabase.co/functions/v1/translate-message \
  -H "Content-Type: application/json" \
  -d '{"text": "Bonjour le monde", "sourceLanguage": "fr", "targetLanguage": "en"}'

# Test sentinelle-guide
curl -X POST https://wcrkcuugancklxirqfyl.supabase.co/functions/v1/sentinelle-guide \
  -H "Content-Type: application/json" \
  -d '{"message": "Comment créer une alerte?", "language": "fr"}'
```

---

# 📋 RÉSUMÉ DES CHANGEMENTS

| Function | Status | Changement |
|----------|--------|-----------|
| **chat-guard** | ✅ DÉJÀ BON | Aucun changement (avait ALLOWED_ORIGINS) |
| **publish-alert** | ✅ DÉJÀ BON | Aucun changement (avait ALLOWED_ORIGINS) |
| **moderate-message** | ✅ CORRIGÉ | Wildcard `*` → ALLOWED_ORIGINS |
| **delete-alert** | ✅ CORRIGÉ | Wildcard `*` → ALLOWED_ORIGINS |
| **update-alert** | ✅ CORRIGÉ | Wildcard `*` → ALLOWED_ORIGINS |
| **sentinelle-guide** | ✅ DÉJÀ BON | Aucun changement (avait ALLOWED_ORIGINS) |
| **translate-message** | ✅ CORRIGÉ | Wildcard `*` → ALLOWED_ORIGINS |
| **upload-alert-images** | ✅ CORRIGÉ | Wildcard `*` → ALLOWED_ORIGINS |

---

# 🔐 SÉCURITÉ CORS

Tous les codes utilisent maintenant ce pattern sécurisé:

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',           // Dev local
  'http://10.195.25.254:3000',       // Dev réseau
  'https://sentinelle-v1.netlify.app', // ← Nouveau domaine ✨
  'https://sentinelle.com',          // Domaine principal
  'https://www.sentinelle.com'       // Variante www
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
```

✅ Remplace le wildcard dangereux `'*'`  
✅ Valide l'origin avant de le renvoyer  
✅ Appliqué à tous les endpoints  
✅ Supporte domaines multiples

---

# 🎯 PROCHAINES ÉTAPES

1. ✅ Déployer les 8 Edge Functions
2. ✅ Tester depuis https://sentinelle-v1.netlify.app
3. ✅ Vérifier les logs Supabase pour erreurs
4. ✅ Basculer le traffic production si tests OK
5. ✅ Mettre à jour DNS sentinelle.com si nécessaire

**Tous les codes sont prêts à déployer! 🚀**
