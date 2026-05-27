-- ========================================
-- SCRIPT SQL À EXÉCUTER DANS SUPABASE
-- ========================================
-- 📌 IMPORTANT: Exécutez ce script EN ENTIER dans le SQL Editor de Supabase
-- 📌 Ce script corrige les erreurs 500 et la récursion infinie RLS

-- ========================================
-- ÉTAPE 1: SUPPRIMER LES POLICIES DÉFECTUEUSES
-- ========================================

DROP POLICY IF EXISTS "Users can see own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can see all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
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

-- ========================================
-- ÉTAPE 2: CRÉER LA FONCTION SÉCURISÉE
-- ========================================
-- Cette fonction est la CLÉ pour éviter la récursion infinie
-- Elle s'exécute avec les droits du propriétaire (postgres)
-- et contourne complètement les RLS

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

-- ========================================
-- ÉTAPE 3: NETTOYER ET RÉACTIVER RLS
-- ========================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_broadcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ÉTAPE 4: POLICIES RLS - PROFILES
-- ========================================

-- ✅ Utilisateur lit son propre profil
CREATE POLICY "profiles_select_own"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- ✅ Admin lit tous les profils (utilise is_admin() pour éviter la récursion)
CREATE POLICY "profiles_select_admin"
ON profiles
FOR SELECT
USING (is_admin(auth.uid()));

-- ✅ Utilisateur modifie son propre profil
CREATE POLICY "profiles_update_own"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ✅ Admin modifie tous les profils
CREATE POLICY "profiles_update_admin"
ON profiles
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ✅ Admin insère les profils
CREATE POLICY "profiles_insert_admin"
ON profiles
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- ========================================
-- ÉTAPE 5: POLICIES RLS - SYSTEM_BROADCASTS
-- ========================================

-- ✅ Tout le monde lit les broadcasts actifs (pas de fonction, pas de récursion)
CREATE POLICY "broadcasts_select_public"
ON system_broadcasts
FOR SELECT
USING (is_active = true);

-- ✅ Admin lit tous les broadcasts (y compris inactifs)
CREATE POLICY "broadcasts_select_admin"
ON system_broadcasts
FOR SELECT
USING (is_admin(auth.uid()));

-- ✅ Admin insère les broadcasts
CREATE POLICY "broadcasts_insert_admin"
ON system_broadcasts
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- ✅ Admin modifie les broadcasts
CREATE POLICY "broadcasts_update_admin"
ON system_broadcasts
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ✅ Admin supprime les broadcasts
CREATE POLICY "broadcasts_delete_admin"
ON system_broadcasts
FOR DELETE
USING (is_admin(auth.uid()));

-- ========================================
-- ÉTAPE 6: POLICIES RLS - AUDIT_LOGS
-- ========================================

-- ✅ Admin lit tous les logs
CREATE POLICY "audit_logs_select_admin"
ON audit_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- ✅ Admin insère les logs
CREATE POLICY "audit_logs_insert_admin"
ON audit_logs
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- ========================================
-- ÉTAPE 7: VÉRIFICATION (OPTIONNEL)
-- ========================================
-- Exécutez ces requêtes pour vérifier que tout fonctionne

-- Voir toutes les policies RLS
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Vérifier que la fonction existe
SELECT 
  proname,
  prosecurity,
  provolatile
FROM pg_proc
WHERE proname = 'is_admin';

-- Tester la fonction (remplacez par un User ID réel)
-- SELECT is_admin('YOUR_USER_ID'::uuid);
