# Architecture IA & Déploiement - Sentinelle

## 📋 Vue d'ensemble

Toute l'IA de Sentinelle passe exclusivement par des **Supabase Edge Functions**. L'API Key de Gemini n'apparaît JAMAIS dans le frontend.

## 🔑 Configuration Supabase Secrets

Ajoute ces variables dans **Supabase → Settings → Secrets**:

```
GEMINI_API_KEY=<ta_clé_gemini>
IMGBB_API_KEY=<ta_clé_imgbb>
```

## 📡 Edge Functions Déployées

### 1. **publish-alert** ✅
- **Endpoint**: `POST /functions/v1/publish-alert`
- **Auth**: Bearer token (required)
- **Payload**:
```json
{
  "title": "Titre alerte",
  "description": "Description",
  "type": "Vol",
  "city": "Douala",
  "neighborhood": "Akwa",
  "contact": "+237...",
  "duration_days": "7",
  "imageBase64": "data:image/jpeg;base64,..."
}
```
- **Réponse**:
```json
{
  "success": true,
  "data": { id, title, description, ... },
  "ai_analysis": { status, detected_type, severity }
}
```
- **Gemini**: Modération + correction orthographe + classification type + détection sévérité

### 2. **moderate-message** ✅ (NEW)
- **Endpoint**: `POST /functions/v1/moderate-message`
- **Auth**: Bearer token (required)
- **Payload**:
```json
{
  "message": "Contenu du message",
  "room_id": "uuid-room"
}
```
- **Réponse**:
```json
{
  "success": true,
  "is_safe": true,
  "ai_analysis": { is_safe, reason }
}
```
- **Gemini**: Détecte haine, menaces, arnaque, harcèlement

### 3. **update-alert** ✅
- Même fonctionnement que `publish-alert`

### 4. **delete-alert** ✅
- Suppression d'alerte

### 5. **upload-alert-images** ✅
- Upload d'images ImgBB + enregistrement en DB

### 6. **sentinelle-guide** ✅
- Guide IA (bonus)

## 🎨 Frontend: Rendu des Contacts

Utilise le composant `ContactRenderer` pour transformer téléphones, e-mails, URLs en boutons cliquables:

```typescript
import { ContactRenderer } from '../lib/linkify';

// Dans JSX
<ContactRenderer 
  text={alert.contact} 
  className="text-sm"
/>
```

**Styles appliqués**:
- **Téléphone** (+237...): Bleu - `tel:` link
- **E-mail** (user@...): Vert - `mailto:` link
- **URL** (https://...): Violet - `target="_blank"`

## 🚀 Déploiement

```bash
# 1. Deploy functions
supabase functions deploy publish-alert
supabase functions deploy moderate-message
supabase functions deploy update-alert
supabase functions deploy delete-alert
supabase functions deploy upload-alert-images
supabase functions deploy sentinelle-guide

# 2. Set secrets
supabase secrets set GEMINI_API_KEY="<clé>"
supabase secrets set IMGBB_API_KEY="<clé>"

# 3. Verify deployment
supabase functions list
```

## 🔒 Sécurité

✅ Pas d'API Key en frontend
✅ Toutes les requêtes via HTTPS
✅ CORS restrictifs
✅ Bearer token validation
✅ Rate limiting recommandé

## 📊 Monitoring

Logs Edge Functions: **Supabase → Logs → Functions**

Cherche les erreurs:
- `[publish-alert] Gemini error`
- `[moderate-message] JSON parse error`

## 🐛 Troubleshooting

| Erreur | Cause | Solution |
|--------|-------|----------|
| 401 Unauthorized | Pas de token | Ajouter `Authorization: Bearer <token>` |
| 500 JSON parse error | Réponse Gemini invalide | Vérifier le prompt et format JSON |
| 404 Endpoint | Fonction non déployée | `supabase functions deploy <name>` |
| CORS error | Headers manquants | Vérifier `corsHeaders` dans Edge Function |

## 📝 Notes

- Gemini-flash-latest coûte ~$0.075/1M tokens
- ImgBB: 12.5MB max par image
- Realtime notifications pour les publications en temps réel
