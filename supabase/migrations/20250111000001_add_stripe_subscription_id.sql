-- Add stripe_subscription_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN stripe_subscription_id text;

-- Add index for better performance
CREATE INDEX idx_profiles_stripe_subscription_id ON public.profiles(stripe_subscription_id); 