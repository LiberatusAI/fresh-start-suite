-- Add trial support to profiles table
ALTER TABLE public.profiles 
ADD COLUMN trial_start_date timestamp with time zone,
ADD COLUMN trial_end_date timestamp with time zone,
ADD COLUMN is_trial_user boolean DEFAULT false;

-- Add index for trial queries
CREATE INDEX idx_profiles_trial_dates ON public.profiles(trial_start_date, trial_end_date);
CREATE INDEX idx_profiles_is_trial_user ON public.profiles(is_trial_user);

-- Insert trial tier into tiers table
INSERT INTO public.tiers (name, price, max_assets, max_reports_per_day, additional_asset_price, additional_report_price, stripe_price_id_monthly)
VALUES ('trial', 0, 1, 1, 0, 0, NULL)
ON CONFLICT (name) DO NOTHING;

-- Add RLS policy for trial users
CREATE POLICY "Trial users can access their own data" ON public.profiles
FOR ALL USING (
  (auth.uid() = id) OR 
  (is_trial_user = true AND auth.uid() = id)
); 