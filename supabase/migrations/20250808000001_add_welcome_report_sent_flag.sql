-- Migration: Add welcome_report_sent flag to prevent duplicate welcome emails
-- Description: Tracks whether the welcome report has been sent to a user

-- Add welcome_report_sent column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS welcome_report_sent BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_welcome_report_sent 
ON profiles(welcome_report_sent) 
WHERE welcome_report_sent = false;

-- Update existing users to mark welcome report as sent
-- (prevents sending welcome emails to existing users)
UPDATE profiles 
SET welcome_report_sent = true 
WHERE created_at < NOW() - INTERVAL '1 hour';

-- Add comment to column
COMMENT ON COLUMN profiles.welcome_report_sent IS 'Flag to track if welcome report has been sent to prevent duplicates';