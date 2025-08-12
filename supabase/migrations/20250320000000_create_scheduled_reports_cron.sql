-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to process scheduled reports
CREATE OR REPLACE FUNCTION process_scheduled_reports()
RETURNS void AS $$
DECLARE
  current_time_str TEXT;
  user_record RECORD;
  asset_record RECORD;
  supabase_url TEXT;
  service_key TEXT;
  http_result RECORD;
BEGIN
  -- Get current time in HH:MM format
  current_time_str := TO_CHAR(NOW(), 'HH24:MI');
  
  -- Get Supabase configuration (you'll need to set these as database settings)
  supabase_url := current_setting('app.supabase_url', true);
  service_key := current_setting('app.service_role_key', true);
  
  RAISE LOG 'Processing scheduled reports for time: %', current_time_str;
  
  -- If configuration is missing, log and exit
  IF supabase_url IS NULL OR service_key IS NULL THEN
    RAISE LOG 'Missing Supabase configuration. Please set app.supabase_url and app.service_role_key';
    RETURN;
  END IF;
  
  -- Find users who should receive reports at this time
  FOR user_record IN 
    SELECT p.id, p.email, p.first_name, p.last_name, p.global_report_time,
           t.name as tier_name
    FROM public.profiles p
    JOIN public.tiers t ON p.subscription_tier_id = t.id
    WHERE p.global_report_time = current_time_str
      AND p.subscription_tier_id IS NOT NULL
  LOOP
    RAISE LOG 'Processing user: % (time: %)', user_record.email, user_record.global_report_time;
    
    -- Find this user's asset subscriptions
    FOR asset_record IN
      SELECT asset_slug, asset_name, asset_symbol, last_report_sent
      FROM public.asset_subscriptions
      WHERE user_id = user_record.id
    LOOP
      RAISE LOG 'Processing asset: % for user: %', asset_record.asset_name, user_record.email;
      
      -- Check if report was already sent today
      IF asset_record.last_report_sent IS NULL 
         OR DATE(asset_record.last_report_sent) < CURRENT_DATE THEN
        
        -- Call the edge function to generate and send the report
        SELECT INTO http_result * FROM net.http_post(
          url := supabase_url || '/functions/v1/generate-test-report',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_key
          ),
          body := jsonb_build_object(
            'asset_slug', asset_record.asset_slug,
            'assetName', asset_record.asset_name,
            'assetSymbol', asset_record.asset_symbol,
            'userEmails', jsonb_build_array(user_record.email)
          )
        );
        
        RAISE LOG 'Report generation called for % - % (HTTP Status: %)', 
          user_record.email, asset_record.asset_name, http_result.status_code;
        
        -- Update last_report_sent timestamp only if the request was successful
        IF http_result.status_code BETWEEN 200 AND 299 THEN
          UPDATE public.asset_subscriptions 
          SET last_report_sent = NOW()
          WHERE user_id = user_record.id 
            AND asset_slug = asset_record.asset_slug;
        ELSE
          RAISE LOG 'Failed to generate report for % - %: HTTP %', 
            user_record.email, asset_record.asset_name, http_result.status_code;
        END IF;
          
      ELSE
        RAISE LOG 'Report already sent today for % - %', user_record.email, asset_record.asset_name;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE LOG 'Finished processing scheduled reports for time: %', current_time_str;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the postgres role (needed for cron)
GRANT EXECUTE ON FUNCTION process_scheduled_reports() TO postgres;

-- Remove any existing cron job with the same name (ignore errors if it doesn't exist)
DO $$ 
BEGIN
  PERFORM cron.unschedule('send-scheduled-reports');
EXCEPTION WHEN others THEN
  RAISE LOG 'No existing cron job to remove';
END $$;

-- Create the cron job to run every minute
-- This will check every minute for users whose report time matches the current time
SELECT cron.schedule(
  'send-scheduled-reports',
  '* * * * *', -- Every minute
  'SELECT process_scheduled_reports();'
);

COMMENT ON FUNCTION process_scheduled_reports() IS 'Function to process scheduled reports based on user global_report_time settings'; 