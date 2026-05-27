# Production Setup Guide - Sentinelle V1

## 🎯 Objectif
Déployer l'application complètement fonctionnelle avec toutes les IA sur:
- `sentinelle-v1.netlify.app` (Netlify par défaut)
- `sentinelle.com` (domaine custom)

---

## 1️⃣ Configuration Netlify Dashboard

### Step 1: Domaines
1. Va à: **Site Settings → Domain Management**
2. Ajoute `sentinelle.com` comme domaine custom
3. Configure le DNS (voir instructions Netlify)

### Step 2: Environnement Production
1. Va à: **Build & Deploy → Environment**
2. Ajoute ces variables:

```
VITE_SUPABASE_URL = https://wcrkcuugancklxirqfyl.supabase.co
VITE_SUPABASE_ANON_KEY = sb_publishable_ccvNj5ojFxa0nZ4F0c8zgw_VIhwv34O
GEMINI_API_KEY = [TU_DOIS_AJOUTER_TA_CLE_ICI]
NODE_ENV = production
APP_URL = https://sentinelle.com
```

**Comment obtenir GEMINI_API_KEY?**
- Va sur: https://aistudio.google.com/apikey
- Clique: "Get API Key"
- Copie la clé générée

### Step 3: Build & Deploy
1. Va à: **Build & Deploy → Build settings**
2. Vérifie:
   - **Build command**: `npm install --legacy-peer-deps && npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `supabase/functions`

### Step 4: Redirects (optionnel, car netlify.toml le fait)
Va à: **Edge Functions & Redirects**
- Vérifie que la règle SPA existe: `/* → /index.html (200)`

---

## 2️⃣ Configuration Supabase (Edge Functions & API Keys)

### Step 1: Ajouter Secret GEMINI_API_KEY
1. Va à Supabase Dashboard: https://app.supabase.com/
2. Sélectionne ton projet
3. **Settings → Edge Functions → Secrets**
4. Ajoute un secret:
   ```
   Name: GEMINI_API_KEY
   Value: [TA_CLE_GEMINI_API_KEY]
   ```

### Step 2: Redéployer Edge Functions
```bash
# Depuis la racine du projet
supabase functions deploy --project-id wcrkcuugancklxirqfyl
```

Les Edge Functions critiques pour l'IA:
- `translate-message` - Utilise GEMINI_API_KEY ✓
- `publish-alert` - Analyse IA, détection doublons ✓
- `moderate-message` - Modération par IA ✓

### Step 3: Vérifier les Webhooks & Événements
1. Va à **Database → Webhooks**
2. Assure-toi que les webhooks pour les alertes/messages sont configurés
3. Chaque webhook appelle les Edge Functions appropriées

---

## 3️⃣ Configuration .env Locale (déjà OK)

Ton `.env` doit contenir:
```
APP_URL="https://sentinelle.com"
VITE_SUPABASE_URL="https://wcrkcuugancklxirqfyl.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_ccvNj5ojFxa0nZ4F0c8zgw_VIhwv34O"
GEMINI_API_KEY="ta_clé_ici"
NODE_ENV="production"
```

---

## 4️⃣ Configuration Domaine sentinelle.com

### Option A: Pointing to Netlify (Recommandé)
1. Va chez ton registrar de domaine (Namecheap, GoDaddy, etc.)
2. Configure DNS avec ces records:
   ```
   Type: CNAME
   Name: @
   Value: sentinelle-v1.netlify.app
   ```
   OU
   ```
   Type: A
   Name: @
   Value: 75.2.60.5 (IP Netlify - vérifie sur Netlify)
   ```

3. Configure ALIAS/ANAME pour le root (@)
4. Attends 5-48h pour la propagation DNS

### Option B: Netlify NS (Plus facile)
1. Laisse Netlify gérer le DNS complet
2. Dans Netlify: **Domain Management**
3. Clique: "Change nameservers"
4. Suis les instructions de Netlify
5. Configure tes registrar pour utiliser les NS de Netlify

---

## 5️⃣ Fonctionnalités IA à Tester

Après déploiement, vérifie que tout fonctionne:

### ✓ IA Features
1. **Création d'Alerte**
   - Analyse du contenu par Gemini ✓
   - Détection des doublons ✓
   - Classification du type d'alerte ✓

2. **Modération Message**
   - Analyse du contenu pour spam/violence ✓
   - Rejet automatique des messages violents ✓

3. **Traduction**
   - Traduction auto vers anglais ✓
   - Utilisée dans les broadcasts système ✓

4. **Analyse de Résolution**
   - Détection si une alerte est résolue ✓
   - Via commentaires utilisateur ✓

### Test Checklist
- [ ] Créer une alerte → vérifie l'analyse IA
- [ ] Envoyer un message → modération marche
- [ ] Voir les logs Edge Functions (Supabase Dashboard)
- [ ] Vérifie AUCUNE erreur 403 (permission denied)
- [ ] Vérifie AUCUNE erreur 429 (rate limit)

---

## 6️⃣ Dépannage Production

### Erreur: "GEMINI_API_KEY not found"
**Solution**: 
- Vérifie que la variable est ajoutée dans Netlify Dashboard
- Attends 5 min après l'ajout
- Redeploy manuellement: **Deploys → Trigger deploy**

### Erreur: "Edge Function timeout"
**Solution**:
- Augmente le timeout Edge Function (config Supabase)
- Vérifie que GEMINI_API_KEY secret est configuré dans Supabase
- Redeploy les functions: `supabase functions deploy`

### Erreur: "API key quota exceeded"
**Solution**:
- Upgrade ton compte Gemini API (gratuit → paid)
- Contacte Google Cloud Support

### Erreur: "Cors blocked"
**Solution**:
- Vérifie que les domaines sont ajoutés dans Supabase CORS
- Va à **Project Settings → API**
- Ajoute les domaines:
  ```
  https://sentinelle-v1.netlify.app
  https://sentinelle.com
  https://www.sentinelle.com
  ```

### Erreur: "Cannot find supabase project"
**Solution**:
- Vérifie `VITE_SUPABASE_URL` correct
- Vérifie `VITE_SUPABASE_ANON_KEY` correct
- Redis dans Netlify env vars

---

## 7️⃣ Vérification Finale

Exécute ce checklist complet:

### Frontend
- [ ] sentinelle-v1.netlify.app charge
- [ ] sentinelle.com charge (après DNS propagation)
- [ ] Page d'accueil responsive
- [ ] Dark theme affiche correctement
- [ ] Icons (lucide-react) chargent
- [ ] Console clean (F12)

### Authentification
- [ ] Inscription marche
- [ ] Login marche
- [ ] Logout marche
- [ ] Session persiste au rafraîchissement
- [ ] Protected routes bloquent non-auth

### Création d'Alerte (IA Core)
- [ ] Formulaire charge
- [ ] Locations (villes/quartiers) affichent
- [ ] Soumettre → IA analyse le contenu
- [ ] Doublons détectés correctement
- [ ] Alerte créée en DB
- [ ] Notification envoyée

### Chat & Discussions (IA Moderation)
- [ ] Créer discussion marche
- [ ] Poster message marche
- [ ] Messages modérés (spam/violence bloqués)
- [ ] Messages clean passent
- [ ] Real-time updates marche

### Admin Dashboard
- [ ] Accès admin authentifié
- [ ] Voir les messages en attente
- [ ] Approuver/Rejeter messages
- [ ] Broadcast système marche
- [ ] Translation vers EN marche

### Notifications
- [ ] Notifications real-time reçues
- [ ] Notifications persistées
- [ ] Notifications affichent les actions

### Performance
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 4s
- [ ] Aucun 404 sur assets
- [ ] Aucun CORS error

---

## 8️⃣ Configuration SSL Certificate

- ✓ Netlify: SSL auto-renouvelé (gratuit)
- ✓ sentinelle.com: SSL auto-renouvelé par Netlify (si via leur DNS)

Si domaine externe:
- Ajoute manuellement via Netlify Dashboard
- Ou utilise Let's Encrypt gratuit

---

## 9️⃣ Monitoring Production

### Logs à Surveiller
1. **Netlify Deploy Logs**
   - https://app.netlify.com/ → Select Site → Deploys

2. **Supabase Edge Function Logs**
   - Supabase Dashboard → Edge Functions → Select Function → Logs

3. **Supabase Database Logs**
   - Supabase Dashboard → SQL Editor → Logs

4. **Browser Console Errors**
   - Ouvre l'app en production
   - F12 → Console tab
   - Corrige les erreurs

### Alertes à Configurer
- [ ] Build failures (Netlify)
- [ ] Function errors (Supabase)
- [ ] Database errors (Supabase)

---

## 🔟 Support & Escalade

Si tout ne fonctionne pas:

1. **Logs Netlify** → Deploy failed?
   - Vérifie la section "Deploys" et "Build logs"

2. **Logs Supabase** → Functions failing?
   - Supabase Dashboard → Edge Functions → View logs

3. **Client Console** (F12) → Runtime errors?
   - Cherche les erreurs rouges
   - Cherche les CORS warnings

4. **Network Tab** (F12) → API call failing?
   - Vérifie les 401/403/429 responses
   - Vérifie les timeouts

---

## ✅ Checklist Finale Avant Live

- [ ] `npm run build` succeeds locally
- [ ] Netlify env vars configured (GEMINI_API_KEY, etc)
- [ ] Supabase Edge Function secret set
- [ ] Edge Functions deployed: `supabase functions deploy`
- [ ] Database migrations executed
- [ ] sentinelle-v1.netlify.app tested fully
- [ ] sentinelle.com DNS configured
- [ ] sentinelle.com SSL enabled
- [ ] All AI features tested
- [ ] Logs monitored
- [ ] Backups configured

---

**Status**: 🚀 Ready to Launch!

Tout est prêt. Suis ces étapes et l'app sera complètement fonctionnelle en production!
