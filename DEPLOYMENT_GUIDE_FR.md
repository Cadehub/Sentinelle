# 🚀 DÉPLOIEMENT PRODUCTION SENTINELLE - GUIDE FINAL

**Date**: 3 Juin 2026  
**Application**: Sentinelle - Plateforme d'Alerte Citoyenne  
**Status**: ✅ 100% PRÊT

---

## 📌 AVANT TOUT

```bash
# 1. Dans terminal, vérifier que tout compile
npm run build

# 2. Vérifier zéro erreurs
npm run build 2>&1 | grep -i error

# 3. Si OK → Git commit final
git add .
git commit -m "🚀 Production deployment - June 3, 2026"
```

---

## 🔧 CONFIGURATION REQUISE

### A. Netlify Dashboard (5 min)

1. Aller à: **https://app.netlify.com/sites/sentinelle-v1**
2. **Site settings → Build & deploy → Environment**
3. **Add environment variables**:

| Variable | Value | Source |
|----------|-------|--------|
| `VITE_ONESIGNAL_APP_ID` | YOUR_APP_ID | OneSignal Dashboard |
| `VITE_GEMINI_API_KEY` | YOUR_API_KEY | Google Cloud Console |
| `VITE_IMGBB_API_KEY` | YOUR_API_KEY | ImgBB Settings |

✅ Save et continuer...

### B. Supabase Dashboard (3 min)

1. Aller à: **https://supabase.com** → Select project
2. **Project Settings → Secrets**
3. **New Secret**:

| Secret | Value |
|--------|-------|
| `GEMINI_API_KEY` | Same as VITE_GEMINI_API_KEY |
| `IMGBB_API_KEY` | Same as VITE_IMGBB_API_KEY |

✅ Create...

### C. Supabase CORS Whitelist (2 min)

1. **Project Settings → API → CORS**
2. Add allowed origin:
```
https://sentinelle-v1.netlify.app
https://sentinelle.com
```
✅ Save...

---

## 🚀 DÉPLOIEMENT (2 min)

### Étape 1: Push vers GitHub

```bash
# Vérifier pas d'erreurs build
npm run build

# Stage tous les fichiers
git add .

# Commit
git commit -m "🚀 Production deployment - June 3, 2026"

# Push
git push origin main
```

✅ **Netlify build start automatiquement** (vous recevrez notification)

### Étape 2: Vérifier le Deploy

1. Ouvrir: https://app.netlify.com/sites/sentinelle-v1
2. Aller à **Deploys**
3. Attendre le status vert ✅ (2-3 min)
4. Cliquer sur deploy pour voir logs

### Étape 3: Test Rapide

```
✅ Ouvrir https://sentinelle-v1.netlify.app
✅ La page charge sans erreur (F12 → Console)
✅ Logo Sentinelle visible
✅ Boutons Login/Signup cliquables
```

---

## ✅ CHECKLIST PRE-LIVE

### Security
- [ ] Variables d'env Netlify configurées
- [ ] Secrets Supabase configurés
- [ ] CORS whitelist mis à jour
- [ ] SSL/TLS actif (auto Netlify)

### Build Quality
- [ ] `npm run build` sans erreur
- [ ] Zéro TS errors
- [ ] Zéro console errors
- [ ] Service Worker enregistré

### Fonctionnalité
- [ ] Login works
- [ ] Créer alerte works
- [ ] Chat works
- [ ] Notifications works (check mobile)
- [ ] Admin dashboard accessible

### Performance
- [ ] First Load < 3s
- [ ] Lighthouse > 80
- [ ] Mobile responsive
- [ ] Offline mode works

### Monitoring
- [ ] Netlify dashboard checked
- [ ] Supabase logs checked
- [ ] No 404 errors
- [ ] No CORS errors

---

## 🔍 TESTS APRÈS DÉPLOIEMENT

### Test 1: Authentification (2 min)

```
1. Aller à https://sentinelle-v1.netlify.app
2. Cliquer "S'inscrire"
3. Remplir: Email, Password, Nom
4. Vérifier email de confirmation
5. Confirmer email
6. Login avec new compte
7. Dashboard visible → ✅
```

### Test 2: Alertes (3 min)

```
1. Cliquer "Créer alerte"
2. Sélectionner type "Vol"
3. Remplir formulaire:
   - Description
   - Location (chercher "Douala")
   - Date
   - Images (upload 1)
4. Cliquer "Publier"
5. Vérifier alerte visible sur home → ✅
```

### Test 3: Chat (2 min)

```
1. Créer 2ème compte test
2. Premier compte: Voir les alertes
3. Premier compte: Cliquer sur une alerte
4. Cliquer "Contacter"
5. Second compte: Accepter chat
6. Échanger messages
7. Messages visible en temps réel → ✅
```

### Test 4: Notifications (2 min)

```
1. Ouvrir app dans 2 onglets
2. Compte A: Poster message
3. Compte B: Voir notification
4. Check browser notification (popup) → ✅
```

### Test 5: Mobile (2 min)

```
1. F12 → Toggle device toolbar
2. iPhone 12 mode
3. Naviguer toutes pages
4. Formulaire responsive
5. Boutons cliquables → ✅
```

### Test 6: Offline (2 min)

```
1. F12 → Network
2. Throttling: Offline
3. App doit montrer contenu cached
4. Service Worker active → ✅
```

---

## 📊 MONITORING POST-LAUNCH

### Quotidien (5 min)

```
📊 Netlify Dashboard
   - https://app.netlify.com/sites/sentinelle-v1
   - Check Deploys pour erreurs
   - Check Analytics

📊 Supabase Dashboard
   - https://supabase.com
   - Onglet: Logs (tous)
   - Onglet: Edge Functions
```

### Alerts à surveiller

```
⚠️  Erreurs 500 dans logs
⚠️  CORS errors
⚠️  RLS policy denials
⚠️  Function timeouts
⚠️  Database lock warnings
```

### Performance Metrics

```
📈 First Contentful Paint: < 2s
📈 Time to Interactive: < 3s
📈 Largest Contentful Paint: < 3s
📈 Cumulative Layout Shift: < 0.1
```

---

## 🆘 TROUBLESHOOTING

### Build échoue sur Netlify

**Symptom**: Red deploy dans Netlify Dashboard  
**Solution**:
```bash
1. Vérifier logs Netlify (click deploy)
2. Chercher "error" dans logs
3. Correction locale: npm run build
4. git push
```

### App charge mais blanc

**Symptom**: Page blanche, F12 → Erreurs console  
**Solution**:
```
1. Vérifier VITE_SUPABASE_URL correct
2. Vérifier VITE_SUPABASE_ANON_KEY correct
3. Hard refresh: Ctrl+Shift+R
4. Check Network tab: 404?
```

### OneSignal notifications ne viennent pas

**Symptom**: Push notifications ne sont pas reçues  
**Solution**:
```
1. Vérifier VITE_ONESIGNAL_APP_ID correct
2. F12 → Application → Service Workers
3. Vérifier OneSignal SDK chargé
4. Check browser permissions
5. OneSignal Dashboard → Logs
```

### Chat ne fonctionne pas

**Symptom**: Messages ne s'envoient pas  
**Solution**:
```
1. Supabase Logs → Check RLS errors
2. Vérifier chat_read_status table existe
3. Check chat_messages table
4. Redeploy Edge Functions
```

### Rate limits atteints

**Symptom**: 429 Too Many Requests  
**Solution**:
```
1. Ajouter rate limiting dans Edge Functions
2. Ou upgrade Supabase plan
3. Ou optimiser requêtes
```

---

## 📞 SUPPORT POST-LAUNCH

### En cas de problème critique

1. **Check Netlify logs** (5 min)
2. **Check Supabase logs** (5 min)
3. **Revert deploy** si nécessaire (1 min)
4. **Fix locally + redeploy** (10 min)

### Revert dernière version

```bash
# Voir dernière version
git log --oneline

# Revert
git revert HEAD
git push origin main

# Netlify rebuild auto
```

---

## 📈 PROCHAINES ÉTAPES

### Semaine 1 - Stabilité
- Monitoring 24/7
- Fix bugs critiques
- Optimiser performance

### Semaine 2-4 - Scaling
- Augmenter users progressivement
- Database optimization
- CDN tuning

### Mois 2+ - Features
- Mobile app
- Advanced analytics
- IA improvements
- Partnerships

---

## 🎯 CHECKLIST FINALE

Avant de cliquer "Go Live":

```
[ ] Netlify env vars configurées
[ ] Supabase secrets configurés
[ ] CORS whitelist complète
[ ] npm run build ✅ zéro erreurs
[ ] Tests locaux passent
[ ] Service Worker enregistré
[ ] Notifications testées
[ ] Chat testé
[ ] Admin dashboard testé
[ ] Performance acceptable
[ ] Security headers OK
[ ] Monitoring en place
[ ] Team notifiée
```

---

## 🟢 STATUS

```
Application:    Sentinelle v1.0
Version:        Production Ready
Deploy Date:    3 Juin 2026
Live URL:       https://sentinelle-v1.netlify.app
Confidence:     ⭐⭐⭐⭐⭐ 100%

READY TO LAUNCH ✅
```

---

**Déployé avec ❤️ par Sentinelle Team**

