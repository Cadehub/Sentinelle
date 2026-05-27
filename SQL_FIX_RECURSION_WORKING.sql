-- ============================================================
-- FIX RLS RECURSION - CORRECTED & IDEMPOTENT
-- Run this complete script in Supabase SQL Editor
-- ============================================================

-- STEP 1: DISABLE RLS COMPLETELY (allows clean slate)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_broadcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- STEP 2: DROP ALL OLD POLICIES (now safe because RLS is disabled)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Lecture_Profil" ON profiles;
DROP POLICY IF EXISTS "Modification_Profil" ON profiles;
DROP POLICY IF EXISTS "Users can see own profile" ON profiles;
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

DROP POLICY IF EXISTS "broadcasts_select_public" ON system_broadcasts;
DROP POLICY IF EXISTS "broadcasts_select_admin" ON system_broadcasts;
DROP POLICY IF EXISTS "broadcasts_insert_admin" ON system_broadcasts;
DROP POLICY IF EXISTS "broadcasts_update_admin" ON system_broadcasts;
DROP POLICY IF EXISTS "broadcasts_delete_admin" ON system_broadcasts;

-- STEP 3: RECREATE THE ADMIN FUNCTION (without recursion)
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

-- STEP 4: RE-ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- STEP 5: CREATE NEW POLICIES FOR PROFILES
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

-- STEP 6: CREATE POLICIES FOR SYSTEM_BROADCASTS
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

-- STEP 7: CREATE POLICIES FOR AUDIT_LOGS
CREATE POLICY "audit_logs_select_admin"
ON audit_logs FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "audit_logs_insert_admin"
ON audit_logs FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "audit_logs_update_admin"
ON audit_logs FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "audit_logs_delete_admin"
ON audit_logs FOR DELETE
USING (is_admin(auth.uid()));

-- ============================================================
-- ✅ DONE - All policies are now clean and non-recursive
-- ============================================================
