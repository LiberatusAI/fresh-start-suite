-- Add monthly chat system while keeping daily system during transition
-- Migration: 20250806140000_add_monthly_chat_system.sql

-- Add new monthly tracking columns
ALTER TABLE profiles 
ADD COLUMN monthly_chat_requests integer DEFAULT 0,
ADD COLUMN last_monthly_reset_date date DEFAULT NULL;

-- Update existing users to initialize monthly system
-- Reset everyone to 0 as requested
UPDATE profiles 
SET monthly_chat_requests = 0,
    last_monthly_reset_date = NULL
WHERE id IS NOT NULL;

-- Add comment for reference
COMMENT ON COLUMN profiles.monthly_chat_requests IS 'Monthly chat requests used. Resets on membership anniversary day. Limits: Trial=90, Basic=300, Pro=1500, Elite=3000';
COMMENT ON COLUMN profiles.last_monthly_reset_date IS 'Date when monthly credits were last reset. Used to track membership billing cycles.';

-- Create function to calculate user billing cycle day
CREATE OR REPLACE FUNCTION get_user_billing_day(user_id uuid)
RETURNS integer AS $$
DECLARE
  reference_date timestamp with time zone;
BEGIN
  -- Get the reference date (trial_started_at or created_at)
  SELECT COALESCE(trial_started_at, created_at) 
  INTO reference_date
  FROM profiles 
  WHERE id = user_id;
  
  IF reference_date IS NULL THEN
    RETURN 1; -- Default to 1st of month
  END IF;
  
  -- Extract day of month
  RETURN EXTRACT(DAY FROM reference_date)::integer;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if user needs monthly reset
CREATE OR REPLACE FUNCTION needs_monthly_reset(user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_billing_day integer;
  last_reset_date date;
  today date := CURRENT_DATE;
  current_cycle_start date;
  last_cycle_start date;
BEGIN
  -- Get user's billing day
  SELECT get_user_billing_day(user_id) INTO user_billing_day;
  
  -- Get last reset date
  SELECT last_monthly_reset_date INTO last_reset_date
  FROM profiles WHERE id = user_id;
  
  -- Calculate current billing cycle start
  current_cycle_start := date_trunc('month', today) + (user_billing_day - 1) * interval '1 day';
  
  -- If billing day hasn't occurred this month yet, use previous month
  IF current_cycle_start > today THEN
    current_cycle_start := date_trunc('month', today - interval '1 month') + (user_billing_day - 1) * interval '1 day';
  END IF;
  
  -- If never reset, or last reset was before current cycle, need reset
  IF last_reset_date IS NULL THEN
    RETURN true;
  END IF;
  
  -- Calculate when last reset cycle started
  last_cycle_start := date_trunc('month', last_reset_date) + (user_billing_day - 1) * interval '1 day';
  IF last_cycle_start > last_reset_date THEN
    last_cycle_start := date_trunc('month', last_reset_date - interval '1 month') + (user_billing_day - 1) * interval '1 day';
  END IF;
  
  -- Need reset if current cycle is different from last reset cycle
  RETURN current_cycle_start > last_cycle_start;
END;
$$ LANGUAGE plpgsql;

-- Create function to get next reset date for UI
CREATE OR REPLACE FUNCTION get_next_reset_date(user_id uuid)
RETURNS date AS $$
DECLARE
  user_billing_day integer;
  today date := CURRENT_DATE;
  this_month_reset date;
  next_month_reset date;
BEGIN
  -- Get user's billing day
  SELECT get_user_billing_day(user_id) INTO user_billing_day;
  
  -- Calculate this month's reset date
  this_month_reset := date_trunc('month', today) + (user_billing_day - 1) * interval '1 day';
  
  -- Calculate next month's reset date
  next_month_reset := date_trunc('month', today + interval '1 month') + (user_billing_day - 1) * interval '1 day';
  
  -- Return appropriate date
  IF today < this_month_reset THEN
    RETURN this_month_reset;
  ELSE
    RETURN next_month_reset;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment monthly requests with auto-reset
CREATE OR REPLACE FUNCTION increment_monthly_requests(user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if user needs reset first
  IF needs_monthly_reset(user_id) THEN
    -- Reset their credits
    UPDATE profiles 
    SET monthly_chat_requests = 1,
        last_monthly_reset_date = CURRENT_DATE
    WHERE id = user_id;
  ELSE
    -- Just increment
    UPDATE profiles 
    SET monthly_chat_requests = monthly_chat_requests + 1
    WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_monthly_chat ON profiles(monthly_chat_requests, last_monthly_reset_date);

-- Test the functions work correctly
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Get a test user (first user in system)
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test billing day calculation
    RAISE NOTICE 'Test user billing day: %', get_user_billing_day(test_user_id);
    RAISE NOTICE 'Test user needs reset: %', needs_monthly_reset(test_user_id);
    RAISE NOTICE 'Test user next reset: %', get_next_reset_date(test_user_id);
  END IF;
END $$;