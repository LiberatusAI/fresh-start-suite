-- Add global_report_time column to profiles table
ALTER TABLE public.profiles ADD COLUMN global_report_time text DEFAULT '09:00';

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.global_report_time IS 'The single time when all reports should be sent. Format: HH:MM in 24-hour format. Defaults to 09:00.';

-- Update existing users to have a default global report time
UPDATE public.profiles 
SET global_report_time = '09:00' 
WHERE global_report_time IS NULL; 