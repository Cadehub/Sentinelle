-- 🔴 COPIER/COLLER TOUT CE CONTENU DANS SUPABASE SQL EDITOR ET EXÉCUTER

-- ============================================
-- SENTINELLE - CORRECTION RLS ERREURS 500
-- ============================================

-- Étape 1: Supprimer TOUTES les anciennes policies (ancien + nouveau naming)
DROP POLICY IF EXISTS "Users can see own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can see all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "audit_logs_select_admin" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_admin" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_update_admin" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete_admin" ON audit_logs;
DROP POLICY IF EXISTS "Everyone can view active broadcasts" ON system_broadcasts;
DROP POLICY IF EXISTS "Admins can view all broadcasts" ON system_broadcasts;
DROP POLICY IF EXISTS "Admins can insert broadcasts" ON system_broadcasts;
DROP POLICY IF EXISTS "Admins can update broadcasts" ON system_broadcasts;
DROP POLICY IF EXISTS "Admins can delete broadcasts" ON system_broadcasts;
DROP POLICY IF EXISTS "Public can read active broadcasts" ON system_broadcasts;
DROP POLICY IF EXISTS "Admins can read all broadcasts" ON system_broadcasts;
DROP POLICY IF EXISTS "broadcasts_select_public" ON system_broadcasts;
DROP POLICY IF EXISTS "broadcasts_select_admin" ON system_broadcasts;
DROP POLICY IF EXISTS "broadcasts_insert_admin" ON system_broadcasts;
DROP POLICY IF EXISTS "broadcasts_update_admin" ON system_broadcasts;
DROP POLICY IF EXISTS "broadcasts_delete_admin" ON system_broadcasts;

-- Étape 2: Créer la fonction sécurisée (SECURITY DEFINER = pas de récursion)
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;

CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  admin_count INT;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM profiles
  WHERE id = user_id AND role = 'admin' AND is_banned = false;
  
  RETURN admin_count > 0;
END;
$$;

ALTER FUNCTION is_admin(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated, anon;

-- Étape 3: Nettoyer et réactiver RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_broadcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Étape 4: Créer les politiques RLS pour PROFILES
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin"
ON profiles FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_admin"
ON profiles FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "profiles_insert_admin"
ON profiles FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Étape 5: Créer les politiques RLS pour SYSTEM_BROADCASTS
CREATE POLICY "broadcasts_select_public"
ON system_broadcasts FOR SELECT
USING (is_active = true);

CREATE POLICY "broadcasts_select_admin"
ON system_broadcasts FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "broadcasts_insert_admin"
ON system_broadcasts FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "broadcasts_update_admin"
ON system_broadcasts FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "broadcasts_delete_admin"
ON system_broadcasts FOR DELETE
USING (is_admin(auth.uid()));

-- Étape 6: Créer les politiques RLS pour AUDIT_LOGS
CREATE POLICY "audit_logs_select_admin"
ON audit_logs FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "audit_logs_insert_admin"
ON audit_logs FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- FINI! Tout est exécuté.
-- ============================================
-- Vérifiez avec ces requêtes (optionnel):

-- Voir les policies créées:
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- Vérifier la fonction existe:
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'is_admin';

-- Tester la fonction (remplacez YOUR_USER_ID):
-- SELECT is_admin('YOUR_USER_ID'::uuid);
