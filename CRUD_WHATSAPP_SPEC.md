# Sentinelle - CRUD Complet et Système de Partage WhatsApp

## 📋 Fichiers Créés et Modifiés

### Edge Functions (Backend Supabase)

#### 1. **update-alert** (`/supabase/functions/update-alert/`)
- `deno.json` - Configuration Deno
- `index.ts` - Fonction pour mettre à jour une alerte
- **Méthode:** PATCH
- **Sécurité:** Vérifie que l'utilisateur est l'auteur (JWT)
- **Modération:** Correction via Gemini API si description modifiée
- **Réponse:** Alerte mise à jour

#### 2. **delete-alert** (`/supabase/functions/delete-alert/`)
- `deno.json` - Configuration Deno
- `index.ts` - Fonction pour supprimer une alerte
- **Méthode:** DELETE
- **Sécurité:** Vérifie que l'utilisateur est l'auteur (JWT)
- **Réponse:** Succès ou erreur

### Composants React (Frontend)

#### 1. **ShareStoryModal** (`/src/components/ShareStoryModal.tsx`)
**Fonctionnalités:**
- ✅ Modal pour le partage de story WhatsApp
- ✅ Affiche un aperçu de l'image story générée
- ✅ Copie automatique du lien unique dans le presse-papiers
- ✅ Message WhatsApp pré-rempli
- ✅ Bouton "Partager sur WhatsApp"
- ✅ Fermeture via croix ou clic extérieur

**Props:**
```typescript
interface ShareStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertId: string;
  alertTitle: string;
  storyImageUrl?: string;
}
```

#### 2. **EditAlertModal** (`/src/components/EditAlertModal.tsx`)
**Fonctionnalités:**
- ✅ Formulaire de modification complet
- ✅ Champs pré-remplis avec les données actuelles
- ✅ Validation de tous les champs
- ✅ Fermeture via croix ou bouton Annuler

**Props:**
```typescript
interface EditAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: any;
  onSave: (data: any) => Promise<void>;
  loading?: boolean;
}
```

### Pages Modifiées

#### **AlertDetails** (`/src/pages/AlertDetails.tsx`)
**Nouvelles Fonctionnalités:**
- ✅ Boutons Modifier et Supprimer (visibles uniquement pour l'auteur)
- ✅ Génération d'image story au format 9:16
- ✅ Logo Sentinelle depuis Cloudinary inclus dans l'image story
- ✅ Modal de partage WhatsApp
- ✅ Modal d'édition des alertes
- ✅ Appels aux Edge Functions update-alert et delete-alert

**Nouveaux États:**
```typescript
const [storyImageUrl, setStoryImageUrl] = useState<string>("");
const [isShareModalOpen, setIsShareModalOpen] = useState(false);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [isUpdating, setIsUpdating] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
```

**Nouvelles Fonctions:**
- `generateStoryImage()` - Génère l'image story au format 9:16
- `handleShareStory()` - Ouvre le modal de partage
- `handleUpdateAlert(formData)` - Appelle update-alert
- `handleDeleteAlert()` - Appelle delete-alert avec confirmation

## 🎨 Design de l'Image Story

### Dimensions: 540px × 960px (9:16)
**Structure:**
1. **Haut:** Logo Sentinelle (Cloudinary) + "SENTINELLE" + "Alerte Citoyenne"
2. **Milieu:** Image de preuve (si disponible) + Type + Titre + Localisation
3. **Bas:** CTA "Partagez cette alerte" + Instructions

**Styling:**
- Fond: gradient noir (slate-900 à black)
- Texte blanc avec accents rouges pour alertes critiques
- Logo optimisé pour mobile

## 🔐 Sécurité

### Authentication:
- ✅ JWT token validation dans les Edge Functions
- ✅ Vérification user_id pour ownership
- ✅ Erreur 403 si l'utilisateur n'est pas l'auteur

### Content Moderation:
- ✅ Gemini API pour détection de contenu inapproprié
- ✅ Correction orthographique automatique
- ✅ Rejet si contenu REJECT

## 📱 Intégration WhatsApp

### Message Pré-rempli:
```
🚨 Voici une alerte citoyenne importante sur la plateforme Sentinelle:

"[Titre de l'alerte]"

[Lien unique vers l'alerte]
```

### Lien Unique:
- Format: `https://[app-url]/alert/[alert-id]`
- Copié automatiquement dans le presse-papiers
- Partageable sur WhatsApp et autres platforms

## 🚀 Déploiement

### Edge Functions:
```bash
# Déployer les nouvelles functions
supabase functions deploy update-alert
supabase functions deploy delete-alert
```

### Variables d'Environnement:
Assurez-vous que `.env` contient:
```
VITE_SUPABASE_URL=https://[votre-url].supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
GEMINI_API_KEY=...
IMGBB_API_KEY=...
```

## 📡 Flux Complet CRUD

### CREATE (Création)
- ✅ Edge Function: `publish-alert` (existant)
- ✅ Frontend: Page Publish.tsx

### READ (Lecture)
- ✅ Edge Function: Query Supabase (existant)
- ✅ Frontend: Home.tsx et AlertDetails.tsx

### UPDATE (Modification)
- ✅ Edge Function: `update-alert` (nouveau)
- ✅ Frontend: Bouton "Modifier" → Modal EditAlertModal

### DELETE (Suppression)
- ✅ Edge Function: `delete-alert` (nouveau)
- ✅ Frontend: Bouton "Supprimer" → Confirmation → Suppression

## 🧪 Tests Recommandés

1. **Modification d'alerte:**
   - Cliquer sur "Modifier" en tant qu'auteur
   - Modifier les champs
   - Cliquer "Mettre à jour"
   - Vérifier que les données sont mises à jour

2. **Suppression d'alerte:**
   - Cliquer sur "Supprimer" en tant qu'auteur
   - Confirmer la suppression
   - Vérifier redirection vers home

3. **Partage WhatsApp:**
   - Cliquer sur "Story WhatsApp"
   - Vérifier l'image story est générée
   - Cliquer "Partager sur WhatsApp"
   - Vérifier que le lien est dans le message

4. **Sécurité:**
   - Tenter de modifier/supprimer une alerte d'un autre utilisateur
   - Vérifier que les boutons ne s'affichent que pour l'auteur

## 💡 Notes Importantes

- Les images story sont générées côté client avec `html-to-image`
- Le logo Sentinelle est chargé depuis Cloudinary
- Les modals se ferment en cliquant la croix ou en cliquant à l'extérieur
- Les alertes supprimées sont irréversibles
- La modération Gemini est appliquée à chaque modification de description
