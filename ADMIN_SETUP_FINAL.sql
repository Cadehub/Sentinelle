-- ========================================
-- SENTINELLE ADMIN DASHBOARD - COMPLETE SETUP
-- ========================================
-- Execute this entire script in Supabase SQL Editor
-- Safe: Uses IF NOT EXISTS and error handling

-- ========================================
-- STEP 1: ADD COLUMNS TO PROFILES TABLE
-- ========================================

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100;

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS banned_reason TEXT;

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned);
CREATE INDEX IF NOT EXISTS idx_profiles_trust_score ON profiles(trust_score);

-- ========================================
-- STEP 2: CREATE AUDIT_LOGS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);

-- ========================================
-- STEP 3: CREATE SYSTEM_BROADCASTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS system_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_is_active ON system_broadcasts(is_active);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON system_broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_by ON system_broadcasts(created_by);

-- ========================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_broadcasts ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 5: DROP EXISTING POLICIES (if any)
-- ========================================

DROP POLICY IF EXISTS "Only admins can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Only admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Only admins can update audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Only admins can delete audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Everyone can view active broadcasts" ON system_broadcasts;
DROP POLICY IF EXISTS "Admins can view all broadcasts" ON system_broadcasts;
DROP POLICY IF EXISTS "Only admins can create broadcasts" ON system_broadcasts;
DROP POLICY IF EXISTS "Only admins can update broadcasts" ON system_broadcasts;
DROP POLICY IF EXISTS "Only admins can delete broadcasts" ON system_broadcasts;

-- ========================================
-- STEP 6: CREATE RLS POLICIES FOR AUDIT_LOGS
-- ========================================

-- Allow admins to view all audit logs
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT id::text FROM profiles WHERE role = 'admin'
    )
  );

-- Allow admins to insert audit logs
CREATE POLICY "audit_logs_insert_admin" ON audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() = admin_id AND
    auth.uid()::text IN (
      SELECT id::text FROM profiles WHERE role = 'admin'
    )
  );

-- Allow admins to delete audit logs
CREATE POLICY "audit_logs_delete_admin" ON audit_logs
  FOR DELETE USING (
    auth.uid()::text IN (
      SELECT id::text FROM profiles WHERE role = 'admin'
    )
  );

-- ========================================
-- STEP 7: CREATE RLS POLICIES FOR BROADCASTS
-- ========================================

-- Everyone can view active broadcasts
CREATE POLICY "broadcasts_select_public" ON system_broadcasts
  FOR SELECT USING (is_active = true);

-- Admins can view all broadcasts
CREATE POLICY "broadcasts_select_admin" ON system_broadcasts
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT id::text FROM profiles WHERE role = 'admin'
    )
  );

-- Only admins can insert broadcasts
CREATE POLICY "broadcasts_insert_admin" ON system_broadcasts
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    auth.uid()::text IN (
      SELECT id::text FROM profiles WHERE role = 'admin'
    )
  );

-- Only admins can update broadcasts
CREATE POLICY "broadcasts_update_admin" ON system_broadcasts
  FOR UPDATE USING (
    auth.uid()::text IN (
      SELECT id::text FROM profiles WHERE role = 'admin'
    )
  );

-- Only admins can delete broadcasts
CREATE POLICY "broadcasts_delete_admin" ON system_broadcasts
  FOR DELETE USING (
    auth.uid()::text IN (
      SELECT id::text FROM profiles WHERE role = 'admin'
    )
  );

-- ========================================
-- STEP 8: CREATE HELPER FUNCTION - BAN USER
-- ========================================

CREATE OR REPLACE FUNCTION ban_user(user_id UUID, ban_reason TEXT DEFAULT 'Violation of community rules')
RETURNS JSON AS $$
DECLARE
  admin_id UUID;
  result JSON;
BEGIN
  admin_id := auth.uid();
  
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND role = 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can ban users');
  END IF;
  
  -- Update user status
  UPDATE profiles
  SET is_banned = true, banned_reason = ban_reason, banned_at = NOW()
  WHERE id = user_id;
  
  -- Log the action
  INSERT INTO audit_logs (admin_id, action, target_id, target_type, details)
  VALUES (admin_id, 'user_banned', user_id::text, 'user', jsonb_build_object('reason', ban_reason));
  
  RETURN json_build_object('success', true, 'message', 'User banned successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 9: CREATE HELPER FUNCTION - UNBAN USER
-- ========================================

CREATE OR REPLACE FUNCTION unban_user(user_id UUID)
RETURNS JSON AS $$
DECLARE
  admin_id UUID;
BEGIN
  admin_id := auth.uid();
  
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND role = 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can unban users');
  END IF;
  
  -- Update user status
  UPDATE profiles
  SET is_banned = false, banned_reason = NULL, banned_at = NULL
  WHERE id = user_id;
  
  -- Log the action
  INSERT INTO audit_logs (admin_id, action, target_id, target_type)
  VALUES (admin_id, 'user_unbanned', user_id::text, 'user');
  
  RETURN json_build_object('success', true, 'message', 'User unbanned successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 10: CREATE HELPER FUNCTION - UPDATE TRUST SCORE
-- ========================================

CREATE OR REPLACE FUNCTION update_trust_score(user_id UUID, new_score INTEGER)
RETURNS JSON AS $$
DECLARE
  admin_id UUID;
  old_score INTEGER;
BEGIN
  admin_id := auth.uid();
  
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND role = 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can update trust scores');
  END IF;
  
  -- Validate score range
  IF new_score < 0 OR new_score > 100 THEN
    RETURN json_build_object('success', false, 'error', 'Trust score must be between 0 and 100');
  END IF;
  
  -- Get old score for logging
  SELECT trust_score INTO old_score FROM profiles WHERE id = user_id;
  
  -- Update score
  UPDATE profiles
  SET trust_score = new_score
  WHERE id = user_id;
  
  -- Log the action
  INSERT INTO audit_logs (admin_id, action, target_id, target_type, details)
  VALUES (
    admin_id, 
    'trust_score_updated', 
    user_id::text, 
    'user', 
    jsonb_build_object('old_score', old_score, 'new_score', new_score)
  );
  
  RETURN json_build_object('success', true, 'message', 'Trust score updated successfully', 'old_score', old_score, 'new_score', new_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
-- If you see this comment, the script executed successfully!
-- Next steps:
-- 1. Make a user admin: UPDATE profiles SET role = 'admin' WHERE id = 'USER_UUID';
-- 2. Test ban function: SELECT ban_user('USER_UUID'::uuid, 'Test ban');
-- 3. Test broadcast: INSERT INTO system_broadcasts (message, created_by) VALUES ('Test', 'ADMIN_UUID'::uuid);
