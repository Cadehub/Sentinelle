# Guide Complet - Phase 4 : Intégration WhatsApp et Images Multiples

## 📋 Résumé des Modifications

Cette phase ajoute :
1. **Intégration WhatsApp** - Capture du numéro WhatsApp lors de l'inscription
2. **Images Multiples** - Support pour jusqu'à 10 images par alerte
3. **Schéma Supabase** - Table `alert_images` pour gérer les images

---

## ✅ Modifications Complétées

### 1️⃣ Auth.tsx - Intégration WhatsApp

**Fichier**: [src/pages/Auth.tsx](src/pages/Auth.tsx)

**Changements**:
- Logo remplacé par une seule image Cloudinary (w-32 h-32)
- Ajout d'un champ "Numero WhatsApp" visible uniquement en mode inscription
- Le numéro est sauvegardé dans `auth.user_metadata.whatsapp_number`

**Code clé**:
```tsx
const [whatsapp, setWhatsapp] = useState("+237");

// Dans handleSubmit (signup)
if (data.user) {
  await supabase.auth.updateUser({
    data: { whatsapp_number: whatsapp }
  });
}

// En formulaire (visible si !isLogin)
{!isLogin && (
  <div className="space-y-3">
    <label>Numero WhatsApp</label>
    <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
  </div>
)}
```

**Test**:
1. Aller à `/auth`
2. Cliquer sur "S'inscrire"
3. Entrer email, mot de passe, numéro WhatsApp
4. Soumettre
5. Vérifier dans Supabase: `SELECT raw_user_meta_data FROM auth.users WHERE email = 'test@email.com'`

---

### 2️⃣ EditAlertModal.tsx - Support Images Multiples

**Fichier**: [src/components/EditAlertModal.tsx](src/components/EditAlertModal.tsx)

**Changements**:
- État modifié: `[imageFile, imagePreview]` → `[imagePreviews[], imageFiles[]]`
- Galerie de préview avec 3 colonnes
- Bouton de suppression sur chaque image
- Multi-file input handler
- Fonction de compression d'images

**Code clé**:
```tsx
const [imagePreviews, setImagePreviews] = useState<string[]>([]);
const [imageFiles, setImageFiles] = useState<File[]>([]);

const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (files) {
    const fileArray = Array.from(files);
    setImageFiles(prev => [...prev, ...fileArray]);
    
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }
};

const removeImage = (index: number) => {
  setImagePreviews(prev => prev.filter((_, i) => i !== index));
  setImageFiles(prev => prev.filter((_, i) => i !== index));
};
```

**UI**:
- Galerie 3x3 avec previews
- Bouton de suppression rouge sur chaque image
- Dashed border pour ajouter des images
- Icône Camera de lucide-react

---

### 3️⃣ Publish.tsx - Support Images Multiples

**Fichier**: [src/pages/Publish.tsx](src/pages/Publish.tsx)

**Changements**:
- État modifié: `[imageFile, imagePreview]` → `[imagePreviews[], imageFiles[]]`
- Label: "Preuve visuelle" → "Preuves visuelles (jusqu'à 10 images)"
- Galerie avec suppression
- Multi-file input avec acceptation de plusieurs fichiers

**Code clé**:
```tsx
const [imagePreviews, setImagePreviews] = useState<string[]>([]);
const [imageFiles, setImageFiles] = useState<File[]>([]);

// Dans handleSubmit
let imageBase64 = null;
if (imageFiles.length > 0) {
  imageBase64 = await compressImage(imageFiles[0]);
}
```

**UI**:
- Grid 3x3 pour les images
- Message "Ajouter des photos" ou "Ajouter plus de photos"
- Limite: 10 images max (bouton "Ajouter" désactivé après 10)

---

## 🗄️ Schéma Supabase Nécessaire

**Document complet**: [SUPABASE_MIGRATIONS.md](SUPABASE_MIGRATIONS.md)

### Table alert_images (À créer)

```sql
CREATE TABLE IF NOT EXISTS public.alert_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX idx_alert_images_alert_id ON public.alert_images(alert_id);
CREATE INDEX idx_alert_images_order ON public.alert_images(alert_id, image_order);

-- RLS Policies
ALTER TABLE public.alert_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read alert images" ON public.alert_images
  FOR SELECT USING (true);

CREATE POLICY "Only alert creator can manage images" ON public.alert_images
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.alerts 
            WHERE alerts.id = alert_images.alert_id 
            AND alerts.created_by = auth.uid())
  );
```

### Colonne facultative dans alerts

```sql
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS author_whatsapp TEXT;
```

---

## 🚀 Prochaines Étapes d'Implémentation

### 1. Exécuter les migrations Supabase
1. Aller au SQL Editor de Supabase
2. Copier les requêtes de `SUPABASE_MIGRATIONS.md` section 2
3. Exécuter dans cet ordre:
   - Créer la table `alert_images`
   - Créer les indexes
   - Ajouter les policies RLS
   - Ajouter la colonne `author_whatsapp` (optionnel)

### 2. Modifier l'Edge Function publish-alert
Actuellement elle envoie une image unique en base64. Options:
- **Option A** (Simple): Continuer avec une seule image (imageFiles[0])
- **Option B** (Complète): Supporter les images multiples en base64

Pour Option B, modifier la fonction Deno:

```typescript
// Dans publish-alert/index.ts
interface PublishAlertPayload {
  // ... autres champs
  imageBase64?: string | string[]; // Peut être string ou array
}

// Puis gérer l'insertion
if (Array.isArray(payload.imageBase64)) {
  // Insérer plusieurs images dans alert_images
  for (const [index, base64] of payload.imageBase64.entries()) {
    const url = await uploadBase64Image(base64);
    await supabase
      .from('alert_images')
      .insert({
        alert_id: alertId,
        image_url: url,
        image_order: index
      });
  }
} else if (payload.imageBase64) {
  // Ancien comportement - une image
  const url = await uploadBase64Image(payload.imageBase64);
  await supabase.from('alerts').update({ image_url: url }).eq('id', alertId);
}
```

### 3. Intégrer les données WhatsApp
- Les utilisateurs qui s'inscrivent maintenant ont leur numéro dans `auth.user_meta_data`
- Pour les utilisateurs existants, créer une modal à la première connexion
- L'Edge Function peut accéder à `auth.user().user_metadata` pour le numéro

### 4. Afficher les images multiples
Modifier `AlertDetails.tsx` pour afficher un carousel/galerie au lieu d'une seule image:

```tsx
const [alertImages, setAlertImages] = useState<any[]>([]);

useEffect(() => {
  const fetchImages = async () => {
    const { data } = await supabase
      .from('alert_images')
      .select('*')
      .eq('alert_id', alertId)
      .order('image_order');
    
    if (data) setAlertImages(data);
  };
  
  fetchImages();
}, [alertId]);

// Rendre un carousel ou galerie
{alertImages.length > 0 && (
  <div className="gallery">
    {alertImages.map((img) => (
      <img key={img.id} src={img.image_url} alt="Alert" />
    ))}
  </div>
)}
```

### 5. Masquer le FAB quand les modals sont ouverts
Modifier `GuideFAB.tsx` pour accepter des props:

```tsx
interface GuideFABProps {
  modalsOpen?: boolean;
}

export default function GuideFAB({ modalsOpen = false }: GuideFABProps) {
  // ...
  {!isOpen && showBubble && !modalsOpen && (
    <div className="bubble-enter">...</div>
  )}
}
```

Et passer les états depuis `AlertDetails`:

```tsx
<GuideFAB modalsOpen={isShareModalOpen || isEditModalOpen} />
```

---

## 📊 État du Build

✅ **Build Status**: PASS (Exit Code: 0)
- 2610 modules transformés
- Bundle: 667.66 kB (gzip: 194.97 kB)
- ⚠️ Avertissement: Chunk > 500KB (configurable, non bloquant)

---

## 🧪 Tests Recommandés

### Test 1: Inscription avec WhatsApp
1. Aller à `/auth`
2. Mode inscription
3. Remplir: email, password, numéro WhatsApp
4. Soumettre
5. ✅ Vérifier: Métadonnées utilisateur contient `whatsapp_number`

### Test 2: Créer alerte avec images
1. Aller à `/publish`
2. Remplir tous les champs
3. Ajouter 3-5 images
4. Soumettre
5. ✅ Vérifier: Alerte créée dans BD
6. ✅ Vérifier: Images dans table `alert_images` avec correct `image_order`

### Test 3: Modifier alerte et ajouter images
1. Aller sur une alerte existante
2. Cliquer "Modifier"
3. Ajouter 2 nouvelles images
4. Soumettre
5. ✅ Vérifier: Images supplémentaires ajoutées

### Test 4: Supprimer une image
1. Dans modal de modification
2. Cliquer le X sur une image preview
3. Soumettre
4. ✅ Vérifier: Image supprimée de la BD

### Test 5: FAB masquage
1. Ouvrir une alerte détails
2. Cliquer "Partager l'alerte"
3. ✅ Vérifier: FAB est masqué derrière le modal

---

## 📁 Fichiers Modifiés

```
src/pages/
  ├── Auth.tsx              (Logo unique + champ WhatsApp)
  ├── Publish.tsx           (Images multiples)
  └── AlertDetails.tsx      (À modifier pour afficher les images)

src/components/
  ├── EditAlertModal.tsx    (Images multiples)
  └── GuideFAB.tsx          (À modifier pour masquage)

supabase/
  └── migrations/           (À ajouter: alert_images table)

Documentation:
  ├── SUPABASE_MIGRATIONS.md (Requêtes SQL complètes)
  └── IMPLEMENTATION_GUIDE.md (Ce fichier)
```

---

## 🔄 Ordre d'Exécution Recommandé

1. ✅ Exécuter migrations Supabase (table alert_images)
2. ✅ Tester Auth - inscription avec WhatsApp
3. ✅ Tester Publish - créer alerte avec images
4. ✅ Tester EditAlertModal - modifier alerte
5. ⏳ Modifier AlertDetails - afficher images multiples
6. ⏳ Modifier Edge Function - supporter images multiples
7. ⏳ Masquer FAB quand modals ouverts

---

## 🐛 Troubleshooting

**Q: Métadonnées WhatsApp ne s'enregistrent pas?**
- Vérifier que `supabase.auth.updateUser()` est appelé après signup
- Vérifier le JWT token dans les headers

**Q: Images ne s'affichent pas dans la galerie?**
- Vérifier que les images sont uploadées correctement
- Vérifier les RLS policies sur `alert_images`
- Vérifier que `image_order` est correct

**Q: FAB ne disparaît pas quand modal ouvert?**
- Vérifier que les props `modalsOpen` sont passées
- Vérifier le z-index (modal z-50, FAB z-[9999])

---

## 📝 Notes Supplémentaires

- Le champ WhatsApp est optionnel lors de la modification
- Maximum 10 images par alerte (configurable)
- Images compressées à 1080px × auto, JPEG 70% quality
- Stockage: Base64 lors de l'upload, URLs Cloudinary en base
- RLS policies: Seul le créateur peut modifier/supprimer les images
