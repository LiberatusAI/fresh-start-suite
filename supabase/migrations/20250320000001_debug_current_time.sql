-- Debug function to show what time the scheduling system sees
CREATE OR REPLACE FUNCTION debug_current_time()
RETURNS TABLE (
  current_full_time timestamp with time zone,
  current_time_string text,
  database_timezone text,
  users_scheduled_now integer,
  scheduled_users_info jsonb
) AS $$
DECLARE
  current_time_str TEXT;
  user_count INTEGER;
  users_info jsonb;
BEGIN
  -- Get current time in HH:MM format (same logic as cron job)
  current_time_str := TO_CHAR(NOW(), 'HH24:MI');
  
  -- Count users scheduled for this exact time
  SELECT COUNT(*) INTO user_count
  FROM public.profiles p
  JOIN public.tiers t ON p.subscription_tier_id = t.id
  WHERE p.global_report_time = current_time_str
    AND p.subscription_tier_id IS NOT NULL;
  
  -- Get detailed info about scheduled users
  SELECT jsonb_agg(
    jsonb_build_object(
      'email', p.email,
      'global_report_time', p.global_report_time,
      'tier', t.name,
      'asset_count', (
        SELECT COUNT(*) 
        FROM public.asset_subscriptions 
        WHERE user_id = p.id
      )
    )
  ) INTO users_info
  FROM public.profiles p
  JOIN public.tiers t ON p.subscription_tier_id = t.id
  WHERE p.global_report_time = current_time_str
    AND p.subscription_tier_id IS NOT NULL;
  
  -- Return the results
  RETURN QUERY SELECT 
    NOW() as current_full_time,
    current_time_str as current_time_string,
    current_setting('TIMEZONE') as database_timezone,
    user_count as users_scheduled_now,
    COALESCE(users_info, '[]'::jsonb) as scheduled_users_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION debug_current_time() TO postgres;
GRANT EXECUTE ON FUNCTION debug_current_time() TO authenticated;

COMMENT ON FUNCTION debug_current_time() IS 'Debug function to show current time as seen by the scheduling system'; 