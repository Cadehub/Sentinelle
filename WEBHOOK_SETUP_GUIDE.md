# Configuration Webhooks Supabase → OneSignal

## 🎯 Objectif
Intercepter les nouveaux messages et alertes de Supabase, et envoyer des notifications push via OneSignal.

---

## 📋 Étape 1 : Obtenir les Clés OneSignal

### Sur onesignal.com
1. **Créer un compte gratuit** (si vous n'en avez pas)
2. **Dashboard** → "Create New App" → "Web Push"
3. **Ajouter votre site** : `https://your-domain.com`
4. **Accédez à Settings** → **Keys & IDs**
5. **Copier** :
   - `App ID` (ex: `12345678-1234-1234-1234-123456789012`)
   - `REST API Key` (sous "All Allowed", ex: `NGIwNDZjZDctZjc1...`)

### Ajouter à .env
```env
VITE_ONESIGNAL_APP_ID=12345678-1234-1234-1234-123456789012
ONESIGNAL_REST_API_KEY=NGIwNDZjZDctZjc1...
```

---

## 📋 Étape 2 : Créer les Webhooks Supabase

### Accéder aux Webhooks
1. **Supabase Dashboard** → Votre projet
2. **Database** → **Webhooks** (menu gauche)
3. **Create webhook**

### Webhook 1 : Nouveaux Messages

**Configuration :**
- **Table**: `chat_messages`
- **Event**: `INSERT` ✅
- **Webhook URL**: `https://sentinelle.com/api/webhooks/push`
  - ⚠️ Remplacer `sentinelle.com` par votre domaine réel
- **HTTP method**: `POST`

**Créer le webhook** → Supabase vous donne un **Secret Key** (affiché une seule fois)

**Copier le Secret** dans .env :
```env
SUPABASE_WEBHOOK_SECRET=votre_secret_ici
```

⚠️ **Important** : Le secret ne s'affiche qu'une fois. Conservez-le ou générez un nouveau si perdu.

### Webhook 2 : Nouvelles Alertes

**Même configuration que Webhook 1, mais :**
- **Table**: `alerts`
- **Event**: `INSERT` ✅
- **Webhook URL**: `https://sentinelle.com/api/webhooks/push` (identique)

⚠️ Les deux webhooks utilisent **la même clé secrète** dans .env.

---

## 📋 Étape 3 : Vérifier la Configuration

### Vérifier les variables d'environnement
```bash
cat .env
```

Assurez-vous d'avoir :
```env
VITE_ONESIGNAL_APP_ID=votre_app_id
ONESIGNAL_REST_API_KEY=votre_rest_api_key
SUPABASE_WEBHOOK_SECRET=votre_secret
```

### Redémarrer le serveur
```bash
npm run build
npm start
```

---

## 🧪 Étape 4 : Tester les Webhooks

### Test 1 : Tester avec cURL

**Ouvrir un terminal** et exécuter :

```bash
curl -X POST http://localhost:3000/api/webhooks/push \
  -H "Content-Type: application/json" \
  -H "x-supabase-webhook-secret: YOUR_SUPABASE_WEBHOOK_SECRET" \
  -d '{
    "table": "chat_messages",
    "type": "INSERT",
    "record": {
      "receiver_id": "12345678-1234-1234-1234-123456789012",
      "content": "Test message - Ignore please"
    }
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Push notification sent",
  "notificationId": "abcd-1234-..."
}
```

### Test 2 : Tester avec Postman

1. **Ouvrir Postman**
2. **Nouvelle requête** :
   - Method: `POST`
   - URL: `http://localhost:3000/api/webhooks/push`
3. **Headers** :
   - `Content-Type: application/json`
   - `x-supabase-webhook-secret: YOUR_SUPABASE_WEBHOOK_SECRET`
4. **Body** (raw JSON) :
   ```json
   {
     "table": "alerts",
     "type": "INSERT",
     "record": {
       "title": "Test Alert",
       "type": "PERDU",
       "city": "Douala",
       "neighborhood": "Akwa",
       "image_url": null
     }
   }
   ```
5. **Envoyer** → Vérifier la réponse

### Test 3 : Vérifier dans Supabase Dashboard

1. **Supabase** → **Database** → **Webhooks**
2. Sélectionner votre webhook
3. Aller à l'onglet **Recent Deliveries**
4. Voir si l'événement de test s'est déclenché
5. Vérifier la réponse HTTP (200, 401, 500, etc.)

### Test 4 : Vérifier dans OneSignal Dashboard

1. **OneSignal Dashboard** → **Notifications**
2. Vérifier que votre notification de test s'affiche
3. Voir les statistiques de delivery

---

## 🔍 Dépannage

### Erreur 401 (Unauthorized)
**Cause** : Mauvaise clé secrète Supabase
**Solution** :
1. Vérifier `SUPABASE_WEBHOOK_SECRET` dans .env
2. Comparer avec le secret Supabase Dashboard
3. S'ils ne correspondent pas, créer un nouveau webhook

### Erreur 500 (OneSignal API Error)
**Cause** : Clés OneSignal invalides
**Solution** :
1. Vérifier `VITE_ONESIGNAL_APP_ID` dans .env
2. Vérifier `ONESIGNAL_REST_API_KEY` dans .env
3. Sur OneSignal, vérifier que la clé REST a "All Allowed" permissions

### Webhook ne se déclenche pas
**Cause** : Webhook Supabase désactivé ou URL incorrecte
**Solution** :
1. Vérifier dans **Supabase Dashboard** → **Webhooks**
2. Le webhook est-il **Enabled** (case cochée) ?
3. L'URL est-elle correcte ? (vérifier `https://` et le domaine)
4. Insérer manuellement une ligne pour tester

### Notifications ne s'affichent pas sur le téléphone
**Cause** : Client OneSignal non inizialisé
**Solution** :
1. Vérifier que `useNotificationsWithOneSignal` hook est actif dans Layout.tsx
2. Vérifier dans DevTools → Console que OneSignal SDK se charge
3. Vérifier sur OneSignal Dashboard que l'utilisateur est **subscribed**

---

## 🎯 Vérification Finale

✅ **Checklist de Production** :

- [ ] `.env` contient VITE_ONESIGNAL_APP_ID
- [ ] `.env` contient ONESIGNAL_REST_API_KEY
- [ ] `.env` contient SUPABASE_WEBHOOK_SECRET
- [ ] Webhook Supabase pour `chat_messages` configuré
- [ ] Webhook Supabase pour `alerts` configuré
- [ ] Test cURL réussit avec réponse 200
- [ ] Notifications apparaissent dans OneSignal Dashboard
- [ ] Notifications reçues sur téléphone/navigateur
- [ ] Logs serveur affichent `[WEBHOOK] Push notification sent`

---

## 📚 Ressources

- [OneSignal Web SDK Docs](https://documentation.onesignal.com/docs/web-sdk-setup)
- [Supabase Webhooks Guide](https://supabase.com/docs/guides/database/webhooks)
- [OneSignal REST API Reference](https://documentation.onesignal.com/reference/rest-api)

---

## 🚀 Résumé du Flux

```
User envoie message dans Supabase
    ↓
INSERT event dans chat_messages
    ↓
Supabase envoie POST à /api/webhooks/push
    ↓
Serveur reçoit event
    ↓
Crée payload OneSignal
    ↓
Envoie vers OneSignal API
    ↓
OneSignal envoie push au utilisateur
    ↓
Notification reçue sur appareil
```

Vous êtes prêt ! 🎉
