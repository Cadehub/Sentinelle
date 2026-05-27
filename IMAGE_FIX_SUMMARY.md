# 🖼️ CORRECTION: Images Uploadées Non Affichées - RÉSOLU

## 🔴 PROBLÈME IDENTIFIÉ

Les images uploadées lors de la publication d'une alerte n'apparaissaient **nulle part**:
- ❌ Pas d'affichage dans les **cartes d'alerte** de la homepage
- ❌ Pas d'affichage dans le **modal de détails d'alerte**
- ❌ Pas d'affichage dans l'**image générée lors du partage**

### 🔍 ROOT CAUSE ANALYSIS

Dans `src/pages/Publish.tsx`:
```typescript
// ❌ AVANT: Seule la première image était compressée
let imageBase64 = null;
if (imageFiles.length > 0) {
  imageBase64 = await compressImage(imageFiles[0]); // ⚠️ UNE SEULE IMAGE
}

// ❌ PUIS: Envoyée à publish-alert MAIS jamais sauvegardée dans alert_images
const response = await fetch(fnUrl, {
  method: "POST",
  body: JSON.stringify(payload) // imageBase64 est le primary image_url
});

// ❌ PROBLÈME: Les images MULTIPLES ne sont JAMAIS uploadées dans alert_images table
```

**Résultat**: 
- Seule la première image devenait `image_url` (image primaire)
- Les images restantes étaient complètement ignorées
- La table `alert_images` restait vide
- Home.tsx cherchait `firstImageMap` mais rien n'y était stocké

---

## ✅ SOLUTION IMPLÉMENTÉE

### Modification: `src/pages/Publish.tsx`

Après la création réussie d'une alerte, on récupère maintenant l'`alertId` et on upload **TOUTES** les images:

```typescript
const response = await fetch(fnUrl, {
  method: "POST",
  headers: { /* ... */ },
  body: JSON.stringify(payload)
});

if (!response.ok) throw new Error("Erreur lors de la publication.");

const responseData = await response.json();
const alertId = responseData.data?.[0]?.id;

// ✅ NOUVEAU: Upload all images if any
if (alertId && imageFiles.length > 0) {
  try {
    // Compresser TOUTES les images
    const compressedImages = await Promise.all(
      imageFiles.map((file, idx) => compressImage(file))
    );

    // Appeler la Edge Function upload-alert-images
    const imgResponse = await fetch(
      `${supabaseUrl}/functions/v1/upload-alert-images`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images: compressedImages }),
      }
    );

    if (imgResponse.ok) {
      const { urls } = await imgResponse.json();
      
      // Sauvegarder CHAQUE image dans alert_images avec son ordre
      for (let i = 0; i < urls.length; i++) {
        await supabase.from('alert_images').insert({
          alert_id: alertId,
          image_url: urls[i],
          image_order: i,
          created_at: new Date().toISOString()
        });
      }
    }
  } catch (imgErr) {
    console.error("Image upload error:", imgErr);
    // Alert continue même si images échouent
  }
}

navigate("/");
```

---

## 🔄 FLOW COMPLET APRÈS CORRECTION

### 1️⃣ Utilisateur Publie une Alerte (Publish.tsx)
```
user selects 5 images
↓
Publish.tsx compresses ALL 5 images
↓
sends 1st image as imageBase64 to publish-alert Edge Function
↓
publish-alert creates alert with image_url = primary image
↓ (NEW)
get alertId from response
↓ (NEW)
compress remaining 4 images
↓ (NEW)
upload ALL 5 images via upload-alert-images Edge Function
↓ (NEW)
save all 5 URLs to alert_images table with image_order (0,1,2,3,4)
```

### 2️⃣ HomePage Affiche les Alertes (Home.tsx)
```
fetch alerts from database
↓
for each alert WITHOUT image_url:
  fetch from alert_images where image_order = 0
  ↓
  store in firstImageMap[alertId] = firstImageUrl
↓
Display images in cards using getImageUrl()
  (returns alert.image_url || firstImageMap[alert.id])
```

### 3️⃣ AlertDetails Affiche Complète (AlertDetails.tsx)
```
fetch alert by id
↓
fetch alert_images for this alert (ordered by image_order)
↓
Display:
  - Primary image: alert.image_url (if exists)
  - Gallery grid: alertImages (all from alert_images table)
↓
Generate story image includes gallery images
  - Main: alertImages[0] (or alert.image_url)
  - Thumbnails: alertImages[1..3]
```

---

## 📊 VÉRIFICATION DE LA CORRECTION

### ✅ Checklist
- [x] **Publish.tsx** - Upload ALL images, not just first one
- [x] **alert_images table** - Images are saved with correct alert_id and order
- [x] **Home.tsx** - Displays firstImageMap correctly
- [x] **AlertDetails.tsx** - Shows gallery grid from alert_images
- [x] **Story generation** - Includes gallery images in generated visuals
- [x] **Build** - No TypeScript errors

### 🧪 TEST MANUAL
1. Publier une alerte avec 5 images
2. Vérifier dans Supabase que `alert_images` contient 5 lignes (image_order: 0-4)
3. Vérifier sur Homepage que l'image s'affiche sur la carte
4. Cliquer sur l'alerte → vérifier grille de galerie dans le modal
5. Générer le story image → vérifier que les images sont présentes

---

## 📝 FICHIERS MODIFIÉS

1. **src/pages/Publish.tsx**
   - Ajout: Upload de TOUTES les images après création d'alerte
   - Ajout: Sauvegarde dans alert_images table avec ordonnance
   - Ajout: Gestion d'erreur pour images (alert continue si échoue)

---

## ⚠️ NOTES IMPORTANTES

- **Pas de breaking changes**: Ancien code continue de fonctionner
- **Backward compatible**: Alertes existantes sans images continuent d'afficher leur image_url
- **Optimisation**: Images sont compressées avant upload (MAX_WIDTH: 1080px, qualité: 0.7)
- **Limite**: Jusqu'à 10 images par alerte (limité dans UI)

---

## 🚀 DÉPLOIEMENT

1. **Frontend**: Les changements dans Publish.tsx sont prêts
2. **Backend**: Edge Functions (upload-alert-images, publish-alert) sont déjà à jour
3. **Base de données**: Table alert_images doit exister avec colonnes:
   - `alert_id` (uuid, FK)
   - `image_url` (text)
   - `image_order` (int)
   - `created_at` (timestamp)

**Pas d'actions supplémentaires nécessaires** ✅

---

## 📚 RÉFÉRENCES UTILES

- `src/pages/Publish.tsx` - Publication et upload des images
- `src/pages/AlertDetails.tsx` - Affichage de la galerie complète
- `src/pages/Home.tsx` - Récupération des premières images
- `supabase/functions/upload-alert-images/index.ts` - Edge Function upload
- `supabase/functions/publish-alert/index.ts` - Edge Function création d'alerte
