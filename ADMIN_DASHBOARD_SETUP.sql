-- ========================================
-- Sentinelle Admin Dashboard Setup
-- ========================================
-- Complete SQL script to prepare the database for admin features
-- Execute this in Supabase SQL Editor

-- ========================================
-- 0. CREATE PROFILES TABLE (IF NOT EXISTS)
-- ========================================
-- If profiles doesn't exist, create it with auth.users reference

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 1. ALTER PROFILES TABLE
-- ========================================
-- Add admin management columns to existing profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS banned_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP;

-- Add constraints separately (if they don't already exist)
-- These will fail silently if constraint already exists, which is fine

DO $$
BEGIN
  BEGIN
    ALTER TABLE profiles
    ADD CONSTRAINT check_role CHECK (role IN ('user', 'admin', 'moderator'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE profiles
    ADD CONSTRAINT check_trust_score CHECK (trust_score >= 0 AND trust_score <= 100);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Create index on role for faster admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned);

-- ========================================
-- 2. CREATE AUDIT_LOGS TABLE
-- ========================================
-- Track all admin actions for security and accountability

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'user_banned',
    'user_unbanned',
    'alert_deleted',
    'alert_flagged',
    'chat_message_deleted',
    'user_role_changed',
    'broadcast_created',
    'broadcast_deleted',
    'broadcast_activated',
    'broadcast_deactivated',
    'other'
  )),
  target_id TEXT NOT NULL,
  target_type TEXT CHECK (target_type IN ('user', 'alert', 'message', 'broadcast')),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);

-- ========================================
-- 3. CREATE SYSTEM_BROADCASTS TABLE
-- ========================================
-- Manage system-wide announcements and alerts

CREATE TABLE IF NOT EXISTS system_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'alert', 'maintenance')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_broadcasts_is_active ON system_broadcasts(is_active);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON system_broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_by ON system_broadcasts(created_by);

-- ========================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on system_broadcasts
ALTER TABLE system_broadcasts ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. RLS POLICIES FOR AUDIT_LOGS
-- ========================================

-- Policy: Only admins can insert audit logs
CREATE POLICY "Only admins can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() = admin_id AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can update audit logs (for corrections)
CREATE POLICY "Only admins can update audit logs" ON audit_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete audit logs (with caution)
CREATE POLICY "Only admins can delete audit logs" ON audit_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- 6. RLS POLICIES FOR SYSTEM_BROADCASTS
-- ========================================

-- Policy: Everyone can view active broadcasts
CREATE POLICY "Everyone can view active broadcasts" ON system_broadcasts
  FOR SELECT USING (is_active = true);

-- Policy: Admins can view all broadcasts (including inactive)
CREATE POLICY "Admins can view all broadcasts" ON system_broadcasts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can create broadcasts
CREATE POLICY "Only admins can create broadcasts" ON system_broadcasts
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins who created it or superadmins can update
CREATE POLICY "Only admins can update broadcasts" ON system_broadcasts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admin creators can delete broadcasts
CREATE POLICY "Only admins can delete broadcasts" ON system_broadcasts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- 7. RLS POLICIES FOR PROFILES (MODIFICATIONS)
-- ========================================

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Users can update their own non-sensitive data
CREATE POLICY "Users can update own profile (non-sensitive)" ON profiles
  FOR UPDATE USING (
    auth.uid() = id
  )
  WITH CHECK (
    auth.uid() = id AND
    -- Users cannot change their own role, ban status, or trust score
    role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
    is_banned = (SELECT is_banned FROM profiles WHERE id = auth.uid()) AND
    trust_score = (SELECT trust_score FROM profiles WHERE id = auth.uid())
  );

-- Policy: Only admins can modify user roles, ban status, and trust scores
CREATE POLICY "Only admins can manage user trust and roles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- 8. HELPER FUNCTIONS
-- ========================================

-- Function to ban a user
CREATE OR REPLACE FUNCTION ban_user(user_id UUID, reason TEXT)
RETURNS void AS $$
DECLARE
  admin_id UUID;
BEGIN
  admin_id := auth.uid();
  
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can ban users';
  END IF;
  
  -- Update user status
  UPDATE profiles
  SET is_banned = true, banned_reason = reason, banned_at = NOW()
  WHERE id = user_id;
  
  -- Log the action
  INSERT INTO audit_logs (admin_id, action, target_id, target_type, details)
  VALUES (admin_id, 'user_banned', user_id::text, 'user', jsonb_build_object('reason', reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unban a user
CREATE OR REPLACE FUNCTION unban_user(user_id UUID)
RETURNS void AS $$
DECLARE
  admin_id UUID;
BEGIN
  admin_id := auth.uid();
  
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can unban users';
  END IF;
  
  -- Update user status
  UPDATE profiles
  SET is_banned = false, banned_reason = NULL, banned_at = NULL
  WHERE id = user_id;
  
  -- Log the action
  INSERT INTO audit_logs (admin_id, action, target_id, target_type)
  VALUES (admin_id, 'user_unbanned', user_id::text, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update trust score
CREATE OR REPLACE FUNCTION update_trust_score(user_id UUID, new_score INTEGER)
RETURNS void AS $$
DECLARE
  admin_id UUID;
  old_score INTEGER;
BEGIN
  admin_id := auth.uid();
  
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can update trust scores';
  END IF;
  
  -- Validate score range
  IF new_score < 0 OR new_score > 100 THEN
    RAISE EXCEPTION 'Trust score must be between 0 and 100';
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
    'user_role_changed', 
    user_id::text, 
    'user', 
    jsonb_build_object('old_score', old_score, 'new_score', new_score)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 9. VERIFICATION QUERIES
-- ========================================
-- Run these to verify the setup is correct

-- Check new columns in profiles table
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name='profiles' AND column_name IN ('role', 'is_banned', 'trust_score');

-- Check audit_logs table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name='audit_logs';

-- Check system_broadcasts table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name='system_broadcasts';

-- List all RLS policies
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename IN ('audit_logs', 'system_broadcasts', 'profiles');

-- ========================================
-- 10. NOTES FOR IMPLEMENTATION
-- ========================================
/*
MANUAL STEPS AFTER RUNNING THIS SCRIPT:

1. Grant the first admin role (via Supabase dashboard or SQL):
   UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID';

2. Create a view for admins to see dashboard stats:
   CREATE OR REPLACE VIEW admin_dashboard_stats AS
   SELECT
     (SELECT COUNT(*) FROM profiles WHERE is_banned = true) as banned_users_count,
     (SELECT COUNT(*) FROM profiles WHERE role = 'admin') as admin_count,
     (SELECT COUNT(*) FROM alerts WHERE status = 'actif') as active_alerts_count,
     (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') as actions_last_24h;

3. Test the ban_user function:
   SELECT ban_user('USER_UUID_HERE'::uuid, 'Violation of community rules');

4. Monitor audit logs regularly for suspicious activities

5. Set up a cron job to auto-deactivate expired broadcasts:
   SELECT cron.schedule('deactivate_expired_broadcasts', '0 * * * *', 
     'UPDATE system_broadcasts SET is_active = false WHERE expires_at < NOW() AND is_active = true');
*/
