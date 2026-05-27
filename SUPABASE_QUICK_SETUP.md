# Requêtes Supabase à Exécuter Immédiatement

## 🎯 Objectif
Configurer la base de données pour supporter les images multiples et les numéros WhatsApp.

---

## 1️⃣ ÉTAPE 1 - Créer la table alert_images (ESSENTIEL)

Copier-coller dans Supabase SQL Editor:

```sql
-- Créer la table pour gérer plusieurs images par alerte
CREATE TABLE IF NOT EXISTS public.alert_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_alert_images_alert_id 
  ON public.alert_images(alert_id);

CREATE INDEX IF NOT EXISTS idx_alert_images_order 
  ON public.alert_images(alert_id, image_order);
```

**Temps d'exécution**: ~2 secondes
**Résultat attendu**: "Query executed successfully"

---

## 2️⃣ ÉTAPE 2 - Ajouter les Row Level Security (RLS) policies

```sql
-- Activer RLS
ALTER TABLE public.alert_images ENABLE ROW LEVEL SECURITY;

-- Policy 1: Tout le monde peut lire les images
CREATE POLICY "Anyone can read alert images" 
  ON public.alert_images
  FOR SELECT 
  USING (true);

-- Policy 2: Seul le créateur de l'alerte peut ajouter des images
CREATE POLICY "Only alert creator can manage images" 
  ON public.alert_images
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.alerts 
      WHERE alerts.id = alert_images.alert_id 
      AND alerts.created_by = auth.uid()
    )
  );

-- Policy 3: Seul le créateur de l'alerte peut supprimer des images
CREATE POLICY "Only alert creator can delete images" 
  ON public.alert_images
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.alerts 
      WHERE alerts.id = alert_images.alert_id 
      AND alerts.created_by = auth.uid()
    )
  );
```

**Temps d'exécution**: ~3 secondes
**Résultat attendu**: 3 policies créées (vérifier dans Supabase UI)

---

## 3️⃣ ÉTAPE 3 - (OPTIONNEL) Ajouter colonne pour WhatsApp de l'auteur

```sql
-- Ajouter une colonne pour stocker le numéro WhatsApp de l'auteur
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS author_whatsapp TEXT;
```

**Temps d'exécution**: ~1 seconde
**Note**: Optionnel, mais améliore les performances pour afficher le numéro de l'auteur

---

## 4️⃣ ÉTAPE 4 - (OPTIONNEL) Créer le trigger pour auto-remplir author_whatsapp

```sql
-- Créer la fonction trigger
CREATE OR REPLACE FUNCTION public.update_alert_author_whatsapp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.author_whatsapp IS NULL THEN
    NEW.author_whatsapp := (
      SELECT raw_user_meta_data->>'whatsapp_number'
      FROM auth.users
      WHERE id = NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Activer le trigger
DROP TRIGGER IF EXISTS trigger_update_alert_author_whatsapp ON public.alerts;
CREATE TRIGGER trigger_update_alert_author_whatsapp
BEFORE INSERT OR UPDATE ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_alert_author_whatsapp();
```

**Temps d'exécution**: ~2 secondes
**Avantage**: Auto-synchronise le numéro WhatsApp depuis les métadonnées de l'utilisateur

---

## ✅ Vérification - Exécuter ces requêtes après

### Vérifier la table
```sql
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'alert_images';
```

**Résultat attendu**: 1 row - alert_images

---

### Vérifier les index
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'alert_images';
```

**Résultat attendu**: 2 rows - idx_alert_images_alert_id, idx_alert_images_order

---

### Vérifier les RLS policies
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'alert_images';
```

**Résultat attendu**: 3 rows - les 3 policies créées

---

### Vérifier la colonne author_whatsapp
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'alerts' AND column_name = 'author_whatsapp';
```

**Résultat attendu**: 1 row - author_whatsapp, text

---

## 🔄 Ordre d'Exécution

1. ✅ ÉTAPE 1 (Obligatoire) - Table + Indexes
2. ✅ ÉTAPE 2 (Obligatoire) - RLS Policies
3. ⏳ ÉTAPE 3 (Optionnel) - Colonne author_whatsapp
4. ⏳ ÉTAPE 4 (Optionnel) - Trigger pour synchronisation

**Minimum à faire**: Étapes 1 + 2 (5 minutes)
**Complet**: Étapes 1 + 2 + 3 + 4 (10 minutes)

---

## 📊 Après Exécution - Données Attendues

### Les utilisateurs qui s'inscrivent maintenant auront:
```json
{
  "id": "uuid-user",
  "email": "user@example.com",
  "user_metadata": {
    "whatsapp_number": "+237XXXXXXXXX"
  }
}
```

### Les alertes auront des images liées:
```
alerts (id, title, created_by, author_whatsapp)
  ├── alert_images (alert_id=uuid, image_url, image_order=0)
  ├── alert_images (alert_id=uuid, image_url, image_order=1)
  └── alert_images (alert_id=uuid, image_url, image_order=2)
```

---

## 🐛 Si Quelque Chose Échoue

### Erreur: "Relation already exists"
- Requête déjà exécutée auparavant
- Utiliser `CREATE TABLE IF NOT EXISTS` pour éviter
- ✅ Les requêtes ci-dessus incluent déjà `IF NOT EXISTS`

### Erreur: "Permission denied"
- Vérifier que vous êtes connecté avec compte Supabase admin
- Aller à Database → SQL Editor (pas l'éditeur de SQL de schéma)

### Erreur: "FK constraint violation"
- La colonne `alerts.id` n'existe pas
- Vérifier que la table `alerts` existe: `SELECT * FROM alerts LIMIT 1;`

---

## 🚀 Prochaine Étape

Après exécution des migrations:
1. Tester l'inscription avec numéro WhatsApp
2. Vérifier `SELECT raw_user_meta_data FROM auth.users;`
3. Modifier `publish-alert` Edge Function pour supporter images multiples
4. Tester création d'alerte avec 3+ images

---

## 📝 Notes

- ⏱️ Temps total: ~10 minutes
- 🔒 Sécurité: RLS policies protègent les données utilisateur
- 📈 Performance: Index sur alert_id + image_order
- 🔄 Rétrocompatibilité: Garder colonne image_url existante pour backward compatibility

---

**Status**: Prêt pour exécution
**Complexité**: Basse (copier-coller)
**Impact**: Élevé (architecture base données)
