-- Add Stripe price ID columns to tiers table
ALTER TABLE public.tiers 
ADD COLUMN stripe_price_id_monthly text;

-- Add index for better performance
CREATE INDEX idx_tiers_stripe_price_id_monthly ON public.tiers(stripe_price_id_monthly);

-- Update existing tiers with placeholder values (you'll need to update these with actual Stripe price IDs)
UPDATE public.tiers 
SET stripe_price_id_monthly = CASE 
  WHEN name = 'basic' THEN 'price_1RJdQXJk8bLGmbLeqOen2osM'
  WHEN name = 'pro' THEN 'price_1RGr2oJk8bLGmbLeefGe1HYx'
  WHEN name = 'elite' THEN 'price_1R7HQNQrACHBDtBPHLPOFnYn'
  ELSE NULL
END; 