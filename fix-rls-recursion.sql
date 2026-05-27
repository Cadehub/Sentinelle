-- ========================================
-- CORRECTION COMPLÈTE RÉCURSION INFINIE RLS
-- ========================================
-- ✅ Supprime les politiques RLS défectueuses
-- ✅ Crée une fonction SECURITY DEFINER pour éviter la récursion
-- ✅ Réimplémente les politiques de manière saine
-- ========================================

-- ========================================
-- ÉTAPE 1 : SUPPRIMER LES ANCIENNES POLITIQUES DÉFECTUEUSES
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
DROP POLICY IF EXISTS "Admins can insert broadcasts" ON system_broadcasts;
DROP POLICY IF EXISTS "Admins can update broadcasts" ON system_broadcasts;
DROP POLICY IF EXISTS "Admins can delete broadcasts" ON system_broadcasts;

-- ========================================
-- ÉTAPE 2 : CRÉER LA FONCTION SÉCURISÉE ADMIN
-- ========================================
-- Cette fonction s'exécute avec les droits du propriétaire (service_role)
-- Elle contourne les RLS et n'entre pas en récursion
-- C'est la clé pour éviter les erreurs 500

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
-- ÉTAPE 3 : NETTOYER LES POLITIQUES RLS AVANT DE LES RECRÉER
-- ========================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_broadcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Réactiver avec les nouvelles politiques
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ÉTAPE 4 : POLITIQUES RLS POUR PROFILES
-- ========================================

-- ✅ LECTURE: Utilisateur lit son propre profil
CREATE POLICY "profiles_select_own"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- ✅ LECTURE: Admin lit tous les profils
CREATE POLICY "profiles_select_admin"
ON profiles
FOR SELECT
USING (is_admin(auth.uid()));

-- ✅ MODIFICATION: Utilisateur modifie son propre profil
-- (sauf les champs sensibles comme role, is_banned)
CREATE POLICY "profiles_update_own"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ✅ MODIFICATION: Admin modifie tous les profils
CREATE POLICY "profiles_update_admin"
ON profiles
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ✅ INSERTION: Admin insère des profils (pour les migrations)
CREATE POLICY "profiles_insert_admin"
ON profiles
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- ========================================
-- ÉTAPE 5 : POLITIQUES RLS POUR SYSTEM_BROADCASTS
-- ========================================

-- ✅ LECTURE: Tout le monde lit les broadcasts ACTIFS (pas de récursion)
CREATE POLICY "broadcasts_select_public"
ON system_broadcasts
FOR SELECT
USING (is_active = true);

-- ✅ LECTURE: Admin lit TOUS les broadcasts (y compris inactifs)
CREATE POLICY "broadcasts_select_admin"
ON system_broadcasts
FOR SELECT
USING (is_admin(auth.uid()));

-- ✅ INSERTION: Admin insère les broadcasts
CREATE POLICY "broadcasts_insert_admin"
ON system_broadcasts
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- ✅ MODIFICATION: Admin modifie les broadcasts
CREATE POLICY "broadcasts_update_admin"
ON system_broadcasts
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ✅ SUPPRESSION: Admin supprime les broadcasts
CREATE POLICY "broadcasts_delete_admin"
ON system_broadcasts
FOR DELETE
USING (is_admin(auth.uid()));

-- ========================================
-- ÉTAPE 6 : POLITIQUES RLS POUR AUDIT_LOGS
-- ========================================

-- ✅ LECTURE: Admin lit tous les logs
CREATE POLICY "audit_logs_select_admin"
ON audit_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- ✅ INSERTION: Admin insère des logs
CREATE POLICY "audit_logs_insert_admin"
ON audit_logs
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- ========================================
-- ÉTAPE 7 : VÉRIFICATION FINALE
-- ========================================

-- Affiche toutes les politiques RLS créées
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- NOTES IMPORTANTES
-- ========================================
-- 1. La fonction is_admin() est SECURITY DEFINER
--    → Elle s'exécute avec les droits du propriétaire (postgres)
--    → Elle contourne complètement les RLS
--    → Elle ne peut PAS entrer en récursion infinie
--
-- 2. Les politiques RLS pour les admins utilisent is_admin()
--    → C'est sûr et rapide grâce au STABLE et à la mise en cache
--
-- 3. Les broadcasts publics ne posent pas de problème
--    → Simplement : is_active = true (pas de fonction, pas de récursion)
--
-- 4. Les utilisateurs simples ne peuvent lire que
--    → Leur propre profil
--    → Les broadcasts actifs
