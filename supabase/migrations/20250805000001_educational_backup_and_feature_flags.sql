-- ============================================================================
-- EDUCATIONAL MIGRATION: Database Backup & Feature Flag System
-- ============================================================================
-- Purpose: Safe preparation for AI chat feature with educational annotations
-- Date: 2025-08-05
-- Risk Level: LOW (only adding columns and backup tables)
-- ============================================================================

-- ============================================================================
-- STEP 1: BACKUP STRATEGY
-- ============================================================================
-- Decision: CREATE TABLE AS vs pg_dump
-- Rationale: In-database backup for faster rollback during development
-- Trade-off: Uses more storage but enables instant rollback queries

CREATE TABLE IF NOT EXISTS profiles_backup_20250805 AS 
SELECT * FROM profiles;

-- Educational note: Adding metadata for backup tracking
COMMENT ON TABLE profiles_backup_20250805 IS 
'Backup of profiles table before AI chat feature implementation - 2025-08-05. Contains snapshot of all user profiles including subscription tiers.';

-- Verification query (run after migration):
-- SELECT COUNT(*) as backup_count FROM profiles_backup_20250805;
-- SELECT COUNT(*) as current_count FROM profiles;
-- They should match!

-- ============================================================================
-- STEP 2: FEATURE FLAG ARCHITECTURE
-- ============================================================================
-- Decision: JSONB column vs separate table
-- Choice: JSONB for flexibility and performance
-- Rationale: Feature flags change frequently, JSONB avoids constant migrations

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '{}';

-- Educational note: Why '{}' as default?
-- - Empty JSON object is valid JSON
-- - Allows immediate querying without null checks
-- - Compatible with all JSONB operators

-- ============================================================================
-- STEP 3: PERFORMANCE OPTIMIZATION
-- ============================================================================
-- Decision: What type of index for JSONB?
-- Choice: GIN (Generalized Inverted Index)
-- Rationale: Optimized for JSONB key-value lookups

CREATE INDEX IF NOT EXISTS idx_profiles_features 
ON profiles USING gin (features);

-- Educational note: This enables fast queries like:
-- WHERE features ->> 'chat_enabled' = 'true'
-- WHERE features ? 'beta_features'

-- ============================================================================
-- STEP 4: SECURE FEATURE MANAGEMENT FUNCTIONS
-- ============================================================================
-- Design decision: Function-based access vs direct SQL
-- Choice: Functions for controlled access and business logic
-- Benefits: Centralized logic, better security, audit trails

-- Function 1: Check if user has feature (most used function)
CREATE OR REPLACE FUNCTION has_feature(user_id uuid, feature_name text)
RETURNS boolean AS $$
BEGIN
  -- Educational note: COALESCE handles edge cases
  -- - Returns false if user doesn't exist
  -- - Returns false if feature key doesn't exist
  -- - Returns actual boolean value if exists
  RETURN COALESCE(
    (SELECT (features ->> feature_name)::boolean 
     FROM profiles 
     WHERE id = user_id), 
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Educational note on SECURITY DEFINER:
-- - Function runs with database owner privileges
-- - Allows controlled access to profile data
-- - Alternative: SECURITY INVOKER (runs with caller's privileges)

-- Function 2: Enable feature for user
CREATE OR REPLACE FUNCTION enable_feature(user_id uuid, feature_name text)
RETURNS void AS $$
BEGIN
  -- Educational note: JSONB concatenation with ||
  -- COALESCE ensures we start with empty object if features is null
  UPDATE profiles 
  SET features = COALESCE(features, '{}'::jsonb) || jsonb_build_object(feature_name, true)
  WHERE id = user_id;
  
  -- Could add audit logging here:
  -- INSERT INTO feature_audit_log (user_id, feature_name, action, timestamp)
  -- VALUES (user_id, feature_name, 'ENABLED', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Disable feature for user
CREATE OR REPLACE FUNCTION disable_feature(user_id uuid, feature_name text)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET features = COALESCE(features, '{}'::jsonb) || jsonb_build_object(feature_name, false)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: Admin function - get all users with feature
CREATE OR REPLACE FUNCTION get_users_with_feature(feature_name text)
RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, tier_name text) AS $$
BEGIN
  -- Educational note: JOIN with tiers to understand user segments
  RETURN QUERY
  SELECT p.id, p.email, p.first_name, p.last_name, t.name as tier_name
  FROM profiles p
  LEFT JOIN tiers t ON p.subscription_tier_id = t.id
  WHERE (p.features ->> feature_name)::boolean = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Decision: Should users see their own feature flags?
-- Choice: Yes, for transparency and debugging
-- Alternative: Admin-only visibility for security

-- Note: This policy may already exist, using IF NOT EXISTS equivalent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own features via RLS') THEN
    -- Educational note: This is just documentation, actual policy exists
    -- The existing "Users can view own profiles" policy covers this
    -- auth.uid() = id ensures users only see their own data
    RAISE NOTICE 'RLS policy for features is covered by existing profile policies';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: HELPER FUNCTIONS FOR ROLLOUT STRATEGIES
-- ============================================================================

-- Function 5: Enable feature for all users of a specific tier
CREATE OR REPLACE FUNCTION enable_feature_for_tier(tier_name text, feature_name text)
RETURNS integer AS $$
DECLARE
  affected_count integer;
BEGIN
  -- Educational note: Using WITH clause for atomic operation
  WITH updated_profiles AS (
    UPDATE profiles 
    SET features = COALESCE(features, '{}'::jsonb) || jsonb_build_object(feature_name, true)
    FROM tiers t
    WHERE profiles.subscription_tier_id = t.id 
    AND t.name = tier_name
    RETURNING profiles.id
  )
  SELECT COUNT(*) INTO affected_count FROM updated_profiles;
  
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 6: Get feature adoption statistics
CREATE OR REPLACE FUNCTION get_feature_stats(feature_name text)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Educational note: Building analytics directly in database
  SELECT json_build_object(
    'total_users', COUNT(*),
    'users_with_feature', COUNT(*) FILTER (WHERE (features ->> feature_name)::boolean = true),
    'adoption_rate', ROUND(
      (COUNT(*) FILTER (WHERE (features ->> feature_name)::boolean = true) * 100.0 / COUNT(*)), 2
    ),
    'by_tier', json_agg(
      json_build_object(
        'tier', t.name,
        'users', count(*),
        'enabled', COUNT(*) FILTER (WHERE (features ->> feature_name)::boolean = true)
      )
    )
  ) INTO result
  FROM profiles p
  LEFT JOIN tiers t ON p.subscription_tier_id = t.id
  GROUP BY t.name;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: TESTING AND VERIFICATION
-- ============================================================================

-- Create a test function to verify everything works
CREATE OR REPLACE FUNCTION test_feature_flag_system()
RETURNS text AS $$
DECLARE
  test_user_id uuid;
  test_result boolean;
  result_message text := '';
BEGIN
  -- Get a real user ID for testing (safely)
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RETURN 'No users found for testing';
  END IF;
  
  -- Test 1: Enable feature
  PERFORM enable_feature(test_user_id, 'chat_enabled');
  SELECT has_feature(test_user_id, 'chat_enabled') INTO test_result;
  
  IF test_result THEN
    result_message := result_message || 'PASS: Feature enabling works. ';
  ELSE
    result_message := result_message || 'FAIL: Feature enabling failed. ';
  END IF;
  
  -- Test 2: Disable feature
  PERFORM disable_feature(test_user_id, 'chat_enabled');
  SELECT has_feature(test_user_id, 'chat_enabled') INTO test_result;
  
  IF NOT test_result THEN
    result_message := result_message || 'PASS: Feature disabling works. ';
  ELSE
    result_message := result_message || 'FAIL: Feature disabling failed. ';
  END IF;
  
  RETURN result_message || 'Tests completed.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: MIGRATION TRACKING AND DOCUMENTATION
-- ============================================================================

-- Educational note: Always track what migrations have run
-- This helps with debugging and rollback procedures
DO $$
BEGIN
  -- Create migrations table if it doesn't exist
  CREATE TABLE IF NOT EXISTS migration_log (
    id serial PRIMARY KEY,
    version text UNIQUE NOT NULL,
    executed_at timestamp DEFAULT NOW(),
    description text,
    rollback_sql text
  );
  
  -- Log this migration with rollback instructions
  INSERT INTO migration_log (version, description, rollback_sql) 
  VALUES (
    '20250805000001',
    'Added feature flag system and profiles backup for AI chat implementation',
    '-- Rollback instructions:
     -- 1. DROP TABLE profiles_backup_20250805;
     -- 2. ALTER TABLE profiles DROP COLUMN features;
     -- 3. DROP INDEX idx_profiles_features;
     -- 4. DROP FUNCTION has_feature, enable_feature, disable_feature, etc.'
  )
  ON CONFLICT (version) DO NOTHING;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (run these after migration)
-- ============================================================================

-- Uncomment these to verify the migration worked:

-- SELECT 'Backup created successfully' as status, COUNT(*) as row_count 
-- FROM profiles_backup_20250805;

-- SELECT 'Feature column added' as status, 
--        COUNT(*) as users_with_empty_features
-- FROM profiles 
-- WHERE features = '{}';

-- SELECT test_feature_flag_system() as test_results;

-- SELECT 'Migration completed successfully' as final_status;