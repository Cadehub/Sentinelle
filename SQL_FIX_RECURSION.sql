-- 1. Suppression totale des politiques existantes sur la table profiles
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

-- 2. Création d'une fonction d'isolation stricte pour le rôle Admin
-- SECURITY DEFINER permet à la fonction de s'exécuter avec les droits du créateur (bypass RLS)
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 3. Application de nouvelles politiques propres et séparées
-- Politique de lecture : l'utilisateur lit son profil, ou lit tout s'il est admin
CREATE POLICY "Lecture_Profils" ON public.profiles
FOR SELECT
USING (auth.uid() = id OR public.is_admin());

-- Politique de mise à jour : l'utilisateur modifie son profil, ou tout s'il est admin
CREATE POLICY "Modification_Profils" ON public.profiles
FOR UPDATE
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());
