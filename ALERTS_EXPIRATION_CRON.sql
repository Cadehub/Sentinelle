-- ========================================
-- Sentinelle: Automated Alert Expiration
-- ========================================
-- Script to set up cron job for checking and marking expired alerts
-- Execute in Supabase SQL Editor

-- 1. Enable pg_cron extension (if not already enabled)
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create function to check and mark expired alerts
-- =====================================================
CREATE OR REPLACE FUNCTION check_expired_alerts()
RETURNS void AS $$
BEGIN
  -- Update alerts that have expired
  UPDATE alerts
  SET 
    status = 'expire',
    updated_at = NOW()
  WHERE 
    expires_at < NOW()
    AND status = 'actif';
  
  -- Log the operation
  RAISE NOTICE 'Alert expiration check executed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- 3. Schedule cron job to run every day at midnight (UTC)
-- ======================================================
-- Cron format: minute hour day month day_of_week
-- 0 0 * * * = Every day at 00:00 UTC

SELECT cron.schedule(
  'check_expired_alerts_daily',  -- Job name
  '0 0 * * *',                    -- Cron expression (midnight UTC daily)
  'SELECT check_expired_alerts()' -- Command to execute
);

-- 4. Verify the cron job was created
-- ===================================
-- Run this query to check that the job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'check_expired_alerts_daily';

-- ========================================
-- NOTES:
-- ========================================
-- • The timezone for pg_cron is typically UTC
-- • If you need a different time, adjust the cron expression:
--   Examples:
--   '30 2 * * *' = 02:30 UTC (2h30 AM)
--   '0 10 * * *' = 10:00 UTC (10 AM)
--   '0 22 * * *' = 22:00 UTC (10 PM)
--
-- • To view all scheduled jobs:
--   SELECT * FROM cron.job;
--
-- • To unschedule a job (if needed):
--   SELECT cron.unschedule('check_expired_alerts_daily');
--
-- • The function will only mark alerts as 'expire' if:
--   1. expires_at < NOW() (past the expiration datetime)
--   2. status = 'actif' (currently active)
