# Guide des Corrections - Intégration IA Sentinelle Guide

## 📋 Résumé des Modifications

### 1️⃣ CORRECTION DU FRONTEND (GuideFAB.tsx)

**Fichier modifié** : `src/components/GuideFAB.tsx`

#### Améliorations apportées :

✅ **Gestion robuste de la réponse Edge Function**
- Extraction correcte de `data.reply` (format retourné par notre Edge Function)
- Logs détaillés pour déboguer les erreurs
- Try/catch sur le parsing JSON avec fallback
- Validation que la réponse n'est pas vide

✅ **UX du Chat déjà optimisée** :
- **Au démarrage** : `showInput = false` → affiche seulement les boutons d'actions rapides
- **Après réponse IA** : affiche les suggestions dynamiques contextuelles
- **Clic "Poser une autre question"** : fait apparaître l'input texte
- **Boutons dynamiques** : changent selon le type d'urgence (kidnapping, agression, accident, etc.)

#### Problème résolu :
- ❌ Ancien : `data.candidates[0].content` (Gemini direct)
- ✅ Nouveau : `data.reply` (format Edge Function)
- Ajout de logs console pour tracer chaque étape

---

### 2️⃣ CRÉATION DE L'EDGE FUNCTION (sentinelle-guide)

**Nouveaux fichiers créés** :
- `supabase/functions/sentinelle-guide/deno.json`
- `supabase/functions/sentinelle-guide/index.ts`

#### Caractéristiques de la fonction :

✅ **Entrée** :
```json
{
  "message": "Je suis kidnappé, aidez-moi !"
}
```

✅ **Traitement** :
1. Reçoit le message utilisateur
2. Utilise `Deno.env.get('GEMINI_API_KEY_GUIDE')`
3. Envoie à Gemini API avec un prompt système optimisé
4. Extrait la réponse de Gemini
5. Valide qu'une réponse existe
6. Retourne le format exact attendu

✅ **Sortie** :
```json
{
  "reply": "Je comprends votre situation critque. Appelez immédiatement la Police (117)..."
}
```

✅ **Gestion d'erreurs** :
- Validation du message (non-vide)
- Vérification de la clé API Gemini
- Logs détaillés pour déboguer
- Fallback gracieux en cas d'erreur Gemini
- Headers CORS configurés

---

## 🚀 ÉTAPES DE DÉPLOIEMENT

### A. Configuration Supabase

1. **Créer la clé Gemini** :
   - Allez sur https://ai.google.dev
   - Créez une clé API pour Gemini Pro
   - Copier la clé

2. **Ajouter le secret dans Supabase** :
   ```bash
   # Via Supabase Dashboard:
   # Settings → Secrets & Vault → Add Secret
   
   GEMINI_API_KEY_GUIDE = "votre_clé_gemini_ici"
   ```

### B. Déployer l'Edge Function

```bash
# Option 1: Via CLI Supabase (recommandé)
npx supabase functions deploy sentinelle-guide --project-id wcrkcuugancklxirqfyl

# Option 2: Via dashboard
# Functions → sentinelle-guide → Deploy
```

### C. Tester l'Edge Function

```bash
# Test via cURL (remplacer YOUR_ANON_KEY)
curl -X POST https://wcrkcuugancklxirqfyl.supabase.co/functions/v1/sentinelle-guide \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "J'\''ai un accident grave"}'

# Réponse attendue:
# {"reply": "Appelez immédiatement les Pompiers (120)..."}
```

---

## 🔍 LOGS DE DÉBOGAGE

Le frontend enregistre maintenant des logs détaillés :

```javascript
// Dans la console du navigateur (F12 → Console):

[GuideFAB] Sending message to sentinelle-guide: { text, hasToken }
[GuideFAB] Raw response: "..."
[GuideFAB] Parsed JSON response: { reply: "..." }
[GuideFAB] Extracted reply: "..."
```

Si vous voyez une erreur 400 :
1. Vérifiez que `GEMINI_API_KEY_GUIDE` est set dans Supabase Secrets
2. Regardez les logs de l'Edge Function dans Supabase Dashboard
3. Vérifiez que le message n'est pas vide

---

## 🎯 FLOW UTILISATEUR - UX FINALE

```
1. [Utilisateur clique sur le bouton Bot 🤖]
   ↓
2. [Chat s'ouvre avec message de bienvenue]
   ↓
3. [Affiche 4 boutons: Kidnapping, Agression, Accident, Perte]
   ↓
4. [Utilisateur clique sur un bouton (ex: "Agression")]
   ↓
5. [Message envoyé à Edge Function → Gemini → réponse]
   ↓
6. [Affiche la réponse IA + 3 suggestions contextuelles]
   ↓
7. [Utilisateur choisit: "Poser une autre question"]
   ↓
8. [Input texte apparaît]
   ↓
9. [Utilisateur tape sa question personnalisée]
   ↓
10. [Retour à l'étape 5]
```

---

## 📝 VARIABLES D'ENVIRONNEMENT

Vérifiez que dans votre `.env` vous avez :

```env
VITE_SUPABASE_URL=https://wcrkcuugancklxirqfyl.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_-iUsanguRB7-FZ2UTXJVLg_XyKpdZvz
```

Et dans Supabase Secrets (pour l'Edge Function) :
```
GEMINI_API_KEY_GUIDE = "votre_clé"
```

---

## ✅ CHECKLIST FINALE

- [ ] Clé Gemini créée sur AI Studio
- [ ] Secret `GEMINI_API_KEY_GUIDE` ajouté à Supabase
- [ ] Edge Function `sentinelle-guide` déployée
- [ ] Frontend relancé (`npm run dev`)
- [ ] Test dans le navigateur : clic sur 🤖, puis un bouton d'action
- [ ] Vérifier les logs console : `[GuideFAB]` messages visibles
- [ ] Vérifier Supabase Logs : pas d'erreurs

---

## 🐛 TROUBLESHOOTING

**Erreur 400: "Cannot read properties of undefined"**
→ Vérifiez que `GEMINI_API_KEY_GUIDE` est dans Supabase Secrets

**Erreur 401: "Unauthorized"**
→ Vérifiez que le token Bearer est valide

**Réponse vide**
→ Vérifiez que Gemini API retourne du contenu (pas quotum dépassé)

**Chat ne s'ouvre pas**
→ Vérifiez la console du navigateur, cherchez `[GuideFAB]` logs

---

## 📞 NUMÉROS D'URGENCE INTÉGRÉS

Le chat propose automatiquement :
- **Police** : 117
- **Gendarmerie** : 118
- **Pompiers** : 120

Ces numéros sont cliquables et déclenchent l'appel direct sur mobile.

---

Bon déploiement ! 🚀
