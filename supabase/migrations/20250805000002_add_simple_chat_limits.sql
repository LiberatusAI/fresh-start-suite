-- ============================================================================
-- MVP CHAT LIMITS MIGRATION - Simple Daily Request Tracking
-- ============================================================================
-- Purpose: Add simple daily request counting instead of complex token management
-- Approach: Track requests per day rather than tokens per month
-- Why: Easier to implement, understand, and debug for MVP
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD SIMPLE REQUEST TRACKING COLUMNS
-- ============================================================================
-- Educational: Why these specific columns?
-- - daily_chat_requests: Simple counter (reset daily)
-- - last_chat_date: Track when counter was last used (for daily reset)
-- - No complex token calculations needed

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS daily_chat_requests integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_chat_date date DEFAULT CURRENT_DATE;

-- ============================================================================
-- STEP 2: CREATE SIMPLE INCREMENT FUNCTION
-- ============================================================================
-- Educational: Why a function instead of direct UPDATE?
-- - Atomic operation (prevents race conditions)
-- - Centralized logic (consistent behavior)
-- - Easier to modify later (business logic in one place)

CREATE OR REPLACE FUNCTION increment_daily_requests(user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if it's a new day and reset if needed
  UPDATE profiles 
  SET 
    daily_chat_requests = CASE 
      WHEN last_chat_date < CURRENT_DATE THEN 1
      ELSE daily_chat_requests + 1
    END,
    last_chat_date = CURRENT_DATE
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: CREATE DAILY RESET FUNCTION (FOR CRON JOBS)
-- ============================================================================
-- Educational: Why have a separate reset function?
-- - Backup mechanism (in case increment logic fails)
-- - Scheduled maintenance (run nightly)
-- - Clear audit trail (explicit reset vs implicit)

CREATE OR REPLACE FUNCTION reset_daily_chat_requests()
RETURNS integer AS $$
DECLARE
  reset_count integer;
BEGIN
  -- Reset all users who haven't chatted today
  UPDATE profiles 
  SET daily_chat_requests = 0
  WHERE last_chat_date < CURRENT_DATE;
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  -- Log the reset for monitoring
  INSERT INTO migration_log (version, description, rollback_sql)
  VALUES (
    'daily_reset_' || CURRENT_DATE,
    'Reset daily chat requests for ' || reset_count || ' users',
    'No rollback needed - this is a scheduled reset'
  ) ON CONFLICT DO NOTHING;
  
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: GET USER'S DAILY LIMIT FUNCTION
-- ============================================================================
-- Educational: Why centralize the limit calculation?
-- - Single source of truth for limits
-- - Easy to modify limits per tier
-- - Consistent across application

CREATE OR REPLACE FUNCTION get_daily_chat_limit(user_id uuid)
RETURNS json AS $$
DECLARE
  user_tier text;
  daily_limit integer;
  current_usage integer;
  last_used date;
  result json;
BEGIN
  -- Get user's tier and current usage
  SELECT 
    t.name,
    p.daily_chat_requests,
    p.last_chat_date
  INTO user_tier, current_usage, last_used
  FROM profiles p
  LEFT JOIN tiers t ON p.subscription_tier_id = t.id
  WHERE p.id = user_id;
  
  -- Set limits based on tier (matching Edge Function constants)
  daily_limit := CASE 
    WHEN user_tier = 'trial' THEN 3
    WHEN user_tier = 'basic' THEN 10
    WHEN user_tier = 'pro' THEN 50  
    WHEN user_tier = 'elite' THEN 100
    ELSE 3 -- Default to trial limit
  END;
  
  -- Reset usage if it's a new day
  IF last_used < CURRENT_DATE THEN
    current_usage := 0;
  END IF;
  
  -- Build response
  result := json_build_object(
    'tier', COALESCE(user_tier, 'trial'),
    'daily_limit', daily_limit,
    'used_today', current_usage,
    'remaining', GREATEST(0, daily_limit - current_usage),
    'can_chat', current_usage < daily_limit,
    'resets_at', (CURRENT_DATE + INTERVAL '1 day')::text
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: SCHEDULE DAILY RESET (IF PG_CRON AVAILABLE)
-- ============================================================================
-- Educational: Why schedule resets?
-- - Prevents accumulation of stale data
-- - Ensures fresh start each day
-- - Backup for increment function logic

-- Only create cron job if extension exists
DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule daily reset at midnight
    PERFORM cron.schedule(
      'reset-daily-chat-requests',
      '0 0 * * *',  -- Every day at midnight
      'SELECT reset_daily_chat_requests();'
    );
    
    RAISE NOTICE 'Scheduled daily chat request reset job';
  ELSE
    RAISE NOTICE 'pg_cron not available - daily reset must be handled manually or by application';
  END IF;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 6: ADD INDEXES FOR PERFORMANCE
-- ============================================================================
-- Educational: Why these specific indexes?
-- - last_chat_date: For daily reset queries
-- - Combined index: For checking limits (common query pattern)

CREATE INDEX IF NOT EXISTS idx_profiles_last_chat_date 
ON profiles (last_chat_date);

CREATE INDEX IF NOT EXISTS idx_profiles_chat_usage 
ON profiles (last_chat_date, daily_chat_requests);

-- ============================================================================
-- STEP 7: TEST THE SYSTEM
-- ============================================================================
-- Educational: Why include tests in migration?
-- - Validate functions work correctly
-- - Catch issues before production
-- - Document expected behavior

-- Test function to validate the system
CREATE OR REPLACE FUNCTION test_daily_chat_system()
RETURNS text AS $$
DECLARE
  test_user_id uuid;
  limit_info json;
  test_result text := '';
BEGIN
  -- Get a test user (safely)
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RETURN 'No users found for testing';
  END IF;
  
  -- Test 1: Get initial limit
  SELECT get_daily_chat_limit(test_user_id) INTO limit_info;
  test_result := test_result || 'Initial limit check: ' || (limit_info->>'can_chat')::text || '. ';
  
  -- Test 2: Increment usage
  PERFORM increment_daily_requests(test_user_id);
  SELECT get_daily_chat_limit(test_user_id) INTO limit_info;
  test_result := test_result || 'After increment: ' || (limit_info->>'used_today')::text || ' used. ';
  
  -- Test 3: Check remaining
  test_result := test_result || 'Remaining: ' || (limit_info->>'remaining')::text || '. ';
  
  RETURN test_result || 'Tests completed successfully.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: MIGRATION LOGGING
-- ============================================================================

-- Log this migration
INSERT INTO migration_log (version, description, rollback_sql)
VALUES (
  '20250805000002',
  'Added simple daily chat request tracking for MVP',
  '-- Rollback instructions:
   -- ALTER TABLE profiles DROP COLUMN daily_chat_requests;
   -- ALTER TABLE profiles DROP COLUMN last_chat_date;
   -- DROP FUNCTION increment_daily_requests(uuid);
   -- DROP FUNCTION reset_daily_chat_requests();
   -- DROP FUNCTION get_daily_chat_limit(uuid);
   -- DROP FUNCTION test_daily_chat_system();'
) ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (Uncomment to test after migration)
-- ============================================================================

-- SELECT 'Migration completed' as status;
-- SELECT test_daily_chat_system() as test_results;
-- SELECT get_daily_chat_limit((SELECT id FROM profiles LIMIT 1)) as sample_limit;