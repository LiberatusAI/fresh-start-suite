-- ============================================================================
-- Migration: Add unique constraint to prevent duplicate asset subscriptions
-- ============================================================================
-- Purpose: Ensure users cannot subscribe to the same asset multiple times
-- Impact: Improves data integrity and prevents duplicate entries in AI context
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Remove existing duplicates (keeping the oldest subscription)
-- ============================================================================
-- This ensures we can safely add the unique constraint without conflicts

DELETE FROM asset_subscriptions a
WHERE EXISTS (
  SELECT 1 
  FROM asset_subscriptions b 
  WHERE b.user_id = a.user_id 
  AND b.asset_slug = a.asset_slug 
  AND b.created_at < a.created_at
);

-- Log how many duplicates were removed
DO $$ 
DECLARE 
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Removed % duplicate asset subscriptions', deleted_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add unique constraint
-- ============================================================================
-- This will automatically create a composite index on (user_id, asset_slug)
-- which will also improve query performance

ALTER TABLE asset_subscriptions 
ADD CONSTRAINT unique_user_asset 
UNIQUE (user_id, asset_slug);

-- ============================================================================
-- STEP 3: Document the constraint
-- ============================================================================

COMMENT ON CONSTRAINT unique_user_asset ON asset_subscriptions 
IS 'Prevents users from subscribing to the same asset multiple times. Frontend should handle duplicate attempts gracefully.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify the constraint was created successfully

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_asset' 
    AND conrelid = 'asset_subscriptions'::regclass
  ) THEN
    RAISE EXCEPTION 'Unique constraint was not created successfully';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
-- To rollback this migration, run:
-- ALTER TABLE asset_subscriptions DROP CONSTRAINT unique_user_asset;