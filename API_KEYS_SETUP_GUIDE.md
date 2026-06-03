# 🔑 CONFIGURATION DES CLÉS API - GUIDE RAPIDE

**Date**: 3 Juin 2026  
**Purpose**: Récupérer les clés API requises pour la production  
**Time Required**: 10-15 minutes

---

## 📋 CLÉS À CONFIGURER

### 1️⃣ Google Gemini API

**Où**: https://aistudio.google.com/apikey

```
1. Aller à https://aistudio.google.com/apikey
2. Cliquer "Create API key"
3. Select project (or create new)
4. Copy la clé générée
5. Stocker dans:
   - Netlify: VITE_GEMINI_API_KEY
   - Supabase: GEMINI_API_KEY (secret)
```

**Limite gratuite**: 
- 60 appels/minute
- Augmenter via Google Cloud Console si besoin

**Utilisé pour**:
- Traduction messages
- Modération contenu
- Conseils sécurité IA
- Guide assistant

---

### 2️⃣ OneSignal Push Notifications

**Où**: https://dashboard.onesignal.com

```
1. S'inscrire/Login: https://dashboard.onesignal.com
2. Créer nouvelle app "Sentinelle"
3. Select "Web"
4. Remplir configuration
5. Copier "App ID"
6. Stocker dans:
   - Netlify: VITE_ONESIGNAL_APP_ID
```

**Configuration OneSignal**:
```
Platform: Web
Site Origin: https://sentinelle-v1.netlify.app
CORS: Enable
GCM Sender ID: [Obtain from Google Cloud Console]
```

**Utilisé pour**:
- Push notifications
- Message alerts
- User engagement
- Campaign sending

---

### 3️⃣ ImgBB Image Upload

**Où**: https://imgbb.com/api

```
1. S'inscrire: https://imgbb.com
2. Aller à Account Settings
3. Copier "API Key"
4. Stocker dans:
   - Netlify: VITE_IMGBB_API_KEY
   - Supabase: IMGBB_API_KEY (secret)
```

**Limites gratuites**:
- Unlimited uploads
- 32 MB max par image
- Stockage : 3 mois sans utilisations

**Utilisé pour**:
- Upload images alertes
- Image validation
- Image hosting CDN

---

## 🚀 CONFIGURATION NETLIFY

### Étape 1: Accès Netlify Dashboard

```
URL: https://app.netlify.com/sites/sentinelle-v1
```

### Étape 2: Environment Variables

```
1. Site settings → Build & deploy → Environment
2. Add environment variable:
   
   Name:  VITE_ONESIGNAL_APP_ID
   Value: [From OneSignal Dashboard]
   
   Name:  VITE_GEMINI_API_KEY
   Value: [From Google AI Studio]
   
   Name:  VITE_IMGBB_API_KEY
   Value: [From ImgBB]
```

### Étape 3: Save & Trigger Deploy

```
- Click "Save"
- Variables prennent effet au prochain deploy
- Redeploy via: Deploys → Trigger deploy
```

---

## 🗄️ CONFIGURATION SUPABASE

### Étape 1: Accès Supabase

```
URL: https://supabase.com → Select project
```

### Étape 2: Project Secrets

```
1. Project Settings → Secrets
2. New Secret:
   
   Name:  GEMINI_API_KEY
   Value: [Same as VITE_GEMINI_API_KEY]
   
   Name:  IMGBB_API_KEY
   Value: [Same as VITE_IMGBB_API_KEY]
```

### Étape 3: CORS Configuration

```
1. Project Settings → API → CORS
2. Add allowed origin:
   
   https://sentinelle-v1.netlify.app
   https://sentinelle.com
   (http://localhost:3000 for dev only)
```

---

## ✅ CHECKLIST DE CONFIGURATION

```
[ ] Google Gemini API créée
[ ] Google API Key générée et copié
[ ] OneSignal account créé
[ ] OneSignal App ID copié
[ ] ImgBB account créé
[ ] ImgBB API Key copié
[ ] Netlify env vars configurées (3 vars)
[ ] Supabase secrets configurés (2 secrets)
[ ] Supabase CORS whitelist mis à jour
[ ] Deploy triggers sur Netlify
[ ] Production URL tested: https://sentinelle-v1.netlify.app
[ ] Console sans erreurs (F12)
[ ] Login works
[ ] Alert creation works
[ ] Chat works
[ ] Notifications works
```

---

## 🧪 TEST APRÈS CONFIGURATION

### Test 1: Traduction (Gemini)

```
1. Créer discussion
2. Poster message en français
3. Voir traduction anglaise générée
4. Vérifier pas d'erreur "GEMINI_API_KEY"
```

### Test 2: Images (ImgBB)

```
1. Créer alerte
2. Upload image
3. Image doit s'afficher
4. Vérifier pas d'erreur "IMGBB_API_KEY"
```

### Test 3: Notifications (OneSignal)

```
1. Login sur mobile browser
2. Accepter notification permission
3. Créer alerte depuis autre compte
4. Notification doit arriver
5. Vérifier pas d'erreur "ONESIGNAL_APP_ID"
```

---

## ⚠️ TROUBLESHOOTING

### "VITE_GEMINI_API_KEY is not defined"

```
✅ Vérifier: Netlify Dashboard → Environment variables
✅ Vérifier: Redeploy déclenché après ajout variable
✅ Vérifier: Valeur n'a pas d'espaces
✅ Tester: Hard refresh Ctrl+Shift+R
```

### "Failed to upload image"

```
✅ Vérifier: VITE_IMGBB_API_KEY configurée
✅ Vérifier: Image < 32 MB
✅ Vérifier: Format support (JPG, PNG, WebP)
✅ Vérifier: Supabase secret IMGBB_API_KEY configuré
```

### "No notifications received"

```
✅ Vérifier: VITE_ONESIGNAL_APP_ID correct
✅ Vérifier: Browser permission granted
✅ Vérifier: Service Worker registered (F12 → Application)
✅ Vérifier: OneSignal Dashboard → Logs
✅ Vérifier: Custom domain CORS whitelist
```

### "Translation not working"

```
✅ Vérifier: Supabase secret GEMINI_API_KEY existe
✅ Vérifier: Edge Function "translate-message" logs
✅ Vérifier: Quota Gemini API pas atteint
✅ Vérifier: Message > 10 caractères (minimum)
```

---

## 📊 MONITORING DES CLÉS API

### Quotidien
- [ ] Check API quotas dans dashboards respectifs
- [ ] Monitor error logs

### Hebdomadaire
- [ ] Review usage patterns
- [ ] Check rate limits approaching

### Mensuel
- [ ] Rotate keys if needed
- [ ] Review API costs
- [ ] Optimize API usage

---

## 🔒 SÉCURITÉ DES CLÉS

```
✅ NEVER commit .env files
✅ NEVER share API keys in chat/email
✅ ONLY store in Netlify/Supabase dashboards
✅ Rotate keys quarterly
✅ Monitor unusual usage patterns
✅ ANON_KEY (Supabase) is safe to commit
```

---

## 📞 SUPPORT

### Google Gemini
- Docs: https://ai.google.dev/docs
- Support: https://support.google.com/ai-studio

### OneSignal
- Docs: https://documentation.onesignal.com
- Dashboard: https://dashboard.onesignal.com

### ImgBB
- Docs: https://api.imgbb.com
- Support: https://imgbb.com/support

---

## ✨ PROCHAINES ÉTAPES

```
1. ✅ Obtenir toutes les clés (5-10 min)
2. ✅ Configurer Netlify (3 min)
3. ✅ Configurer Supabase (2 min)
4. ✅ Redeploy (2-3 min)
5. ✅ Tests (5 min)
6. ✅ Vérifier production (5 min)

Total: ~20 minutes jusqu'à full production
```

---

**Préparé pour**: Production Launch - June 3, 2026  
**Statut**: ✅ Prêt à configurer

