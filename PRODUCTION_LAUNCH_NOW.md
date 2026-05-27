# 🚀 QUICK PRODUCTION LAUNCH - 15 Minutes

## ⚡ Pour que TOUT fonctionne en production (IA incluse):

### 1. Obtenir GEMINI_API_KEY (2 min)
```
https://aistudio.google.com/apikey
```
- Clique: "Get API Key"
- Copie la clé

### 2. Mettre à jour .env (1 min)
```bash
# Dans .env local, remplace:
GEMINI_API_KEY="COLLE_TA_CLE_ICI"
```

### 3. Commit & Push (2 min)
```bash
git add .
git commit -m "Ready for production deployment - all IA features enabled"
git push origin main
```

### 4. Netlify Environment Variables (3 min)

Va sur: https://app.netlify.com/
- Sélectionne ton site
- **Build & Deploy → Environment**
- Ajoute ces 4 variables:

```
VITE_SUPABASE_URL = https://wcrkcuugancklxirqfyl.supabase.co
VITE_SUPABASE_ANON_KEY = sb_publishable_ccvNj5ojFxa0nZ4F0c8zgw_VIhwv34O
GEMINI_API_KEY = [COLLE_TA_CLE_ICI]
NODE_ENV = production
```

### 5. Supabase Edge Function Secret (2 min)

Va sur: https://app.supabase.com/
- Sélectionne ton projet
- **Settings → Edge Functions → Secrets**
- Ajoute:
```
GEMINI_API_KEY = [COLLE_TA_CLE_ICI]
```

### 6. Redeploy Edge Functions (2 min)
```bash
supabase functions deploy --project-id wcrkcuugancklxirqfyl
```

### 7. Déclencher le Redeploy Netlify (2 min)
- Va à Netlify Dashboard
- **Deploys → Trigger deploy**
- Attends la fin du build

### 8. Ajouter Domaine sentinelle.com (1 min)

**Sur Netlify:**
- **Domain Management**
- Ajoute: `sentinelle.com`
- Note les nameservers

**Sur ton registrar de domaine:**
- Configure les nameservers Netlify

### ✅ DONE! 

Teste sur:
- https://sentinelle-v1.netlify.app (devrait marcher immédiatement)
- https://sentinelle.com (après propagation DNS, ~5-48h)

---

## 🧪 Tester que tout marche

1. **Créer une alerte** → IA analyse le contenu ✓
2. **Poster un message** → IA modère ✓
3. **Admin dashboard** → Broadcast system marche ✓
4. **Console (F12)** → Pas d'erreurs ✓

---

## ⚠️ Important

**Sans GEMINI_API_KEY:**
- Les alertes peuvent être créées MAIS sans analyse IA
- Les messages ne seront pas modérés par IA
- Les traductions ne marcheront pas

**Avec GEMINI_API_KEY:**
- Tout fonctionne à 100% ✓

---

**Status**: 🟢 PRÊT À LANCER

C'est tout! L'app est maintenant en production avec toutes les IA fonctionnelles.
