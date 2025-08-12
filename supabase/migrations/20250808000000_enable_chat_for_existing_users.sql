-- Migration: Enable chat feature for existing users
-- Description: Safely enables the chat_enabled feature flag for all existing users
-- This migration is idempotent - it can be run multiple times safely

-- Enable chat for all existing users who don't have it enabled yet
UPDATE profiles
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb), 
  '{chat_enabled}', 
  'true'::jsonb
)
WHERE (features IS NULL OR NOT (features ? 'chat_enabled'))
  AND subscription_tier_id IS NOT NULL;

-- Log the migration result
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Enabled chat feature for % users', updated_count;
END $$;

-- Verify the update by showing tier distribution
SELECT 
  t.name as tier_name,
  COUNT(*) as user_count,
  COUNT(*) FILTER (WHERE p.features->>'chat_enabled' = 'true') as chat_enabled_count
FROM profiles p
JOIN tiers t ON p.subscription_tier_id = t.id
GROUP BY t.name
ORDER BY t.name;