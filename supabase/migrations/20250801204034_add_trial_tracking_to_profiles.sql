-- Add trial tracking to profiles table for value-first onboarding
-- This enables tracking when users start their trial period

-- Add trial_started_at column to profiles table
ALTER TABLE profiles 
ADD COLUMN trial_started_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN profiles.trial_started_at IS 'Timestamp when user started their trial period in value-first onboarding flow';

-- Create index for efficient queries on trial users
CREATE INDEX IF NOT EXISTS idx_profiles_trial_started_at 
ON profiles(trial_started_at) 
WHERE trial_started_at IS NOT NULL;

-- Add helpful view for trial user analytics (optional, for monitoring)
CREATE OR REPLACE VIEW trial_users_summary AS
SELECT 
  COUNT(*) as total_trial_users,
  COUNT(CASE WHEN trial_started_at > NOW() - INTERVAL '24 hours' THEN 1 END) as trials_started_24h,
  COUNT(CASE WHEN trial_started_at > NOW() - INTERVAL '7 days' THEN 1 END) as trials_started_7d,
  COUNT(CASE WHEN trial_started_at <= NOW() - INTERVAL '7 days' THEN 1 END) as expired_trials
FROM profiles 
WHERE trial_started_at IS NOT NULL;

-- Grant appropriate permissions
GRANT SELECT ON trial_users_summary TO authenticated;
GRANT SELECT ON trial_users_summary TO anon;