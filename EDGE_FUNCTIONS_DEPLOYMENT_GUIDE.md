# 🚀 EDGE FUNCTIONS - GUIDE DE DÉPLOIEMENT

**Status**: ✅ Tous les ALLOWED_ORIGINS mis à jour  
**Domaines autorisés**: localhost:3000, sentinelle-v1.netlify.app, sentinelle.com  
**Deno.json**: ✅ Standardisé sur toutes les 8 functions

---

## 📋 RÉSUMÉ DES CORRECTIONS

| Function | Status | Changes |
|----------|--------|---------|
| **chat-guard** | ✅ BON | CORS pattern = ALLOWED_ORIGINS |
| **publish-alert** | ✅ BON | CORS pattern = ALLOWED_ORIGINS |
| **moderate-message** | ✅ CORRIGÉ | Wildcard `*` → ALLOWED_ORIGINS |
| **delete-alert** | ✅ CORRIGÉ | Wildcard `*` → ALLOWED_ORIGINS |
| **update-alert** | ✅ CORRIGÉ | Wildcard `*` → ALLOWED_ORIGINS |
| **sentinelle-guide** | ✅ BON | CORS pattern = ALLOWED_ORIGINS |
| **translate-message** | ✅ CORRIGÉ | Wildcard `*` → ALLOWED_ORIGINS |
| **upload-alert-images** | ✅ CORRIGÉ | Wildcard `*` → ALLOWED_ORIGINS |

---

## 🔐 PATTERN CORS STANDARD (Toutes les Functions)

Chaque function doit avoir ce pattern en haut du fichier:

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
    // ... code de la function
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
```

---

## 🎯 CHAQUE FUNCTION DOIT AVOIR SON deno.json:

```json
{
  "imports": {
    "std/": "https://deno.land/std@0.168.0/",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

---

## 📦 DÉPLOYER LES 8 FUNCTIONS

### Option 1: CLI Supabase (Recommandé)

```bash
# Setup initial
supabase link --project-id wcrkcuugancklxirqfyl

# Déployer TOUTES les functions d'un coup
supabase functions deploy

# OU déployer une par une
supabase functions deploy chat-guard
supabase functions deploy publish-alert
supabase functions deploy moderate-message
supabase functions deploy delete-alert
supabase functions deploy update-alert
supabase functions deploy sentinelle-guide
supabase functions deploy translate-message
supabase functions deploy upload-alert-images
```

### Option 2: Dashboard Supabase

1. Aller à https://app.supabase.com
2. Sélectionner project: **wcrkcuugancklxirqfyl**
3. Menu **Edge Functions**
4. Pour chaque function:
   - Click "New Function" ou Edit existante
   - Copier-coller le code
   - Click "Deploy"

### Option 3: Git Push (Si intégration GitHub)

```bash
git add supabase/functions/*/index.ts
git add supabase/functions/*/deno.json
git commit -m "chore: deploy edge functions with updated CORS origins"
git push origin main
# Supabase déploiera automatiquement via webhook
```

---

## ✅ TESTER LES FUNCTIONS POST-DÉPLOIEMENT

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

# Test upload-alert-images
curl -X POST https://wcrkcuugancklxirqfyl.supabase.co/functions/v1/upload-alert-images \
  -H "Content-Type: application/json" \
  -d '{"images": ["data:image/png;base64,iVBORw0KGgoAAAANS..."]}'
```

---

## 📄 VÉRIFIER LES LOGS

```bash
# Afficher les logs d'une function
supabase functions logs chat-guard --project-id wcrkcuugancklxirqfyl --limit 100

# Tail les logs en temps-réel (alternative)
supabase functions logs chat-guard --project-id wcrkcuugancklxirqfyl --follow
```

---

## 🔍 CHECKLIST DE DÉPLOIEMENT

- [ ] Tous les `deno.json` ont les bons imports
- [ ] Chaque function a le pattern ALLOWED_ORIGINS
- [ ] Variables d'env configurées (GEMINI_API_KEY, IMGBB_API_KEY)
- [ ] Chaque function testée localement: `supabase functions serve`
- [ ] Tous les fichiers committé et pushé: `git push origin main`
- [ ] Functions déployées: `supabase functions deploy`
- [ ] Tests POST-déploiement effectués (curl commands)
- [ ] Logs vérifiés pour erreurs
- [ ] Frontend testé depuis sentinelle-v1.netlify.app
- [ ] Production prêt ✅

---

## 🆘 TROUBLESHOOTING

### Erreur: "Origin not allowed"
**Solution**: Vérifier que le domaine d'appel est dans ALLOWED_ORIGINS

### Erreur: "GEMINI_API_KEY not configured"
**Solution**: 
```bash
supabase secrets set GEMINI_API_KEY=AIzaSyD... --project-id wcrkcuugancklxirqfyl
```

### Erreur: "Module not found"
**Solution**: Vérifier imports dans `deno.json`:
```json
{
  "imports": {
    "std/": "https://deno.land/std@0.168.0/",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

### Function timeout (> 60s)
**Solution**: Vérifier les appels API externes, ajouter timeouts

---

## 📞 RÉFÉRENCES

- **Documentation**: Voir `CAHIER_DE_CHARGES_COMPLET.md`
- **Project ID**: `wcrkcuugancklxirqfyl`
- **API URL**: `https://wcrkcuugancklxirqfyl.supabase.co`
- **Functions Docs**: https://supabase.com/docs/guides/functions

**Prêt pour déploiement! 🚀**
