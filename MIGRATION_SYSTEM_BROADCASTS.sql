-- ============================================================
-- MIGRATION: SYSTEM_BROADCASTS TABLE STRUCTURE
-- Add new columns for expiration and CTA functionality
-- ============================================================

-- STEP 1: Add new columns to system_broadcasts table (if they don't already exist)
-- Note: All new columns are nullable to maintain backward compatibility

DO $$
BEGIN
  -- Add expires_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_broadcasts' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE system_broadcasts ADD COLUMN expires_at TIMESTAMPTZ NULL;
    RAISE NOTICE 'Column expires_at added';
  ELSE
    RAISE NOTICE 'Column expires_at already exists - skipping';
  END IF;

  -- Add cta_text if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_broadcasts' AND column_name = 'cta_text'
  ) THEN
    ALTER TABLE system_broadcasts ADD COLUMN cta_text TEXT NULL;
    RAISE NOTICE 'Column cta_text added';
  ELSE
    RAISE NOTICE 'Column cta_text already exists - skipping';
  END IF;

  -- Add cta_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_broadcasts' AND column_name = 'cta_url'
  ) THEN
    ALTER TABLE system_broadcasts ADD COLUMN cta_url TEXT NULL;
    RAISE NOTICE 'Column cta_url added';
  ELSE
    RAISE NOTICE 'Column cta_url already exists - skipping';
  END IF;

  -- Add message_en if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_broadcasts' AND column_name = 'message_en'
  ) THEN
    ALTER TABLE system_broadcasts ADD COLUMN message_en TEXT NULL;
    RAISE NOTICE 'Column message_en added';
  ELSE
    RAISE NOTICE 'Column message_en already exists - skipping';
  END IF;
END $$;

-- STEP 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_system_broadcasts_expires_at 
ON system_broadcasts(expires_at);

CREATE INDEX IF NOT EXISTS idx_system_broadcasts_is_active_expires
ON system_broadcasts(is_active, expires_at);

-- STEP 3: Add comments for documentation
COMMENT ON COLUMN system_broadcasts.expires_at IS 'Timestamp when the broadcast expires and should no longer be displayed';
COMMENT ON COLUMN system_broadcasts.cta_text IS 'Call-to-action button text (e.g., "Learn More", "Take Action")';
COMMENT ON COLUMN system_broadcasts.cta_url IS 'URL target for the call-to-action button';
COMMENT ON COLUMN system_broadcasts.message_en IS 'English translation of the broadcast message for multilingual support';

-- ============================================================
-- RLS POLICIES - NO CHANGES REQUIRED
-- ============================================================
-- The existing RLS policies remain unchanged:
-- - broadcasts_select_public: Everyone can view active broadcasts
-- - broadcasts_select_admin: Admins can view all broadcasts
-- - broadcasts_insert_admin: Only admins can insert
-- - broadcasts_update_admin: Only admins can update
-- - broadcasts_delete_admin: Only admins can delete
--
-- New columns are automatically protected by existing RLS policies

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Table system_broadcasts now supports:
-- - Message expiration (expires_at)
-- - Bilingual support (message_en)
-- - Call-to-action functionality (cta_text, cta_url)
-- All existing RLS policies remain fully functional
