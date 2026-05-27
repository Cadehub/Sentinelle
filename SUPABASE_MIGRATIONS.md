# Migrations Supabase pour l'intégration WhatsApp et les images multiples

## Vue d'ensemble
Ce document contient toutes les migrations SQL nécessaires pour:
1. Stocker les numéros WhatsApp des utilisateurs
2. Supporter les images multiples par alerte
3. Gérer les métadonnées utilisateur

---

## 1. Vérification de la structure existante

```sql
-- Vérifier les colonnes existantes dans la table alerts
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'alerts';

-- Vérifier les métadonnées utilisateur dans auth.users
SELECT id, raw_user_meta_data, created_at 
FROM auth.users 
LIMIT 1;
```

---

## 2. Créer la table pour les images multiples

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
CREATE INDEX IF NOT EXISTS idx_alert_images_alert_id ON public.alert_images(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_images_order ON public.alert_images(alert_id, image_order);

-- RLS Policy
ALTER TABLE public.alert_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read alert images" ON public.alert_images
  FOR SELECT USING (true);

CREATE POLICY "Only alert creator can manage images" ON public.alert_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.alerts 
      WHERE alerts.id = alert_images.alert_id 
      AND alerts.created_by = auth.uid()
    )
  );

CREATE POLICY "Only alert creator can delete images" ON public.alert_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.alerts 
      WHERE alerts.id = alert_images.alert_id 
      AND alerts.created_by = auth.uid()
    )
  );
```

---

## 3. Ajouter la colonne pour le numéro WhatsApp de l'auteur (optionnel)

```sql
-- Ajouter une colonne pour stocker le numéro WhatsApp de l'auteur de l'alerte
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS author_whatsapp TEXT;

-- Créer un trigger pour automatiquement remplir avec le numéro WhatsApp de l'utilisateur
CREATE OR REPLACE FUNCTION update_alert_author_whatsapp()
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

DROP TRIGGER IF EXISTS trigger_update_alert_author_whatsapp ON public.alerts;
CREATE TRIGGER trigger_update_alert_author_whatsapp
BEFORE INSERT OR UPDATE ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION update_alert_author_whatsapp();
```

---

## 4. Migrer les images existantes (si nécessaire)

```sql
-- Si la table alerts a une colonne image_url simple, migrer les données existantes
INSERT INTO public.alert_images (alert_id, image_url, image_order, created_at)
SELECT 
  id as alert_id,
  image_url,
  0 as image_order,
  created_at
FROM public.alerts
WHERE image_url IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.alert_images 
  WHERE alert_images.alert_id = alerts.id
);

-- Si vous préférez, vous pouvez ensuite supprimer la colonne image_url de la table alerts
-- ALTER TABLE public.alerts DROP COLUMN image_url;
-- Mais ce n'est pas recommandé pour éviter de perdre les données
```

---

## 5. Vérifier les données stockées

```sql
-- Vérifier les images stockées
SELECT 
  ai.alert_id,
  ai.image_url,
  ai.image_order,
  a.title,
  a.description
FROM public.alert_images ai
JOIN public.alerts a ON ai.alert_id = a.id
ORDER BY ai.alert_id, ai.image_order;

-- Vérifier les numéros WhatsApp des utilisateurs
SELECT 
  id,
  email,
  raw_user_meta_data->>'whatsapp_number' as whatsapp_number,
  created_at
FROM auth.users
WHERE raw_user_meta_data->>'whatsapp_number' IS NOT NULL;

-- Vérifier les numéros WhatsApp des auteurs d'alertes
SELECT 
  id,
  title,
  author_whatsapp,
  created_at
FROM public.alerts
WHERE author_whatsapp IS NOT NULL
ORDER BY created_at DESC;
```

---

## 6. Requêtes utiles pour l'application

### Récupérer toutes les images d'une alerte

```sql
SELECT 
  ai.id,
  ai.image_url,
  ai.image_order
FROM public.alert_images ai
WHERE ai.alert_id = $1
ORDER BY ai.image_order ASC;
```

### Ajouter une image à une alerte

```sql
INSERT INTO public.alert_images (alert_id, image_url, image_order)
VALUES ($1, $2, (
  SELECT COALESCE(MAX(image_order), -1) + 1
  FROM public.alert_images
  WHERE alert_id = $1
))
RETURNING id, image_url, image_order;
```

### Supprimer une image

```sql
DELETE FROM public.alert_images
WHERE id = $1
AND alert_id IN (
  SELECT alerts.id FROM public.alerts
  WHERE alerts.created_by = auth.uid()
);
```

### Réorganiser les images (drag & drop)

```sql
UPDATE public.alert_images
SET image_order = $1
WHERE id = $2
AND alert_id IN (
  SELECT alerts.id FROM public.alerts
  WHERE alerts.created_by = auth.uid()
);
```

### Mettre à jour le numéro WhatsApp d'un utilisateur (stocké dans auth metadata)

```sql
-- Cette opération se fait via l'API Supabase Auth, pas directement en SQL
-- Utilisez: supabase.auth.updateUser({ data: { whatsapp_number: '+237...' } })
```

---

## 7. Notes d'implémentation

### Points clés:

1. **auth.user_metadata (whatsapp_number)**
   - Stocké automatiquement par Supabase lors de `supabase.auth.updateUser({ data: { whatsapp_number } })`
   - Accessible via `raw_user_meta_data` en PostgreSQL
   - Supporté nativement, aucune modification de schéma nécessaire

2. **alert_images table**
   - Crée une relation 1:N entre alerts et images
   - Permet jusqu'à 999+ images par alerte
   - Inclut l'ordre pour afficher les images dans le bon ordre
   - RLS policies assurent que seul le créateur peut gérer les images

3. **author_whatsapp column**
   - Optionnelle, améliore les performances de requête
   - Stockée dans la table alerts pour éviter des JOINs
   - Auto-remplie par un trigger

4. **Migration des données**
   - Conservez la colonne `image_url` existante pour la rétrocompatibilité
   - Les nouvelles images iront dans la table `alert_images`
   - Vous pouvez migrer progressivement

---

## 8. Ordre d'exécution recommandé

1. Exécuter la création de la table `alert_images`
2. Exécuter les migrations de RLS policies
3. Ajouter la colonne `author_whatsapp` (optionnel)
4. Créer le trigger pour `author_whatsapp` (optionnel)
5. Migrer les données existantes (optionnel)
6. Vérifier les données avec les requêtes de vérification

---

## 9. Rollback (si nécessaire)

```sql
-- Supprimer le trigger
DROP TRIGGER IF EXISTS trigger_update_alert_author_whatsapp ON public.alerts;
DROP FUNCTION IF EXISTS update_alert_author_whatsapp();

-- Supprimer la colonne author_whatsapp
ALTER TABLE public.alerts DROP COLUMN IF EXISTS author_whatsapp;

-- Supprimer les policies RLS
DROP POLICY IF EXISTS "Anyone can read alert images" ON public.alert_images;
DROP POLICY IF EXISTS "Only alert creator can manage images" ON public.alert_images;
DROP POLICY IF EXISTS "Only alert creator can delete images" ON public.alert_images;

-- Supprimer les index
DROP INDEX IF EXISTS idx_alert_images_order;
DROP INDEX IF EXISTS idx_alert_images_alert_id;

-- Supprimer la table
DROP TABLE IF EXISTS public.alert_images;
```
