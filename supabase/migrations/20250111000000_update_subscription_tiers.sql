-- Update subscription tiers to new pricing structure
-- Free Trial: 7 days, 1 asset
-- Basic: $19.99/mo, 5 assets  
-- Pro: $49.99/mo, 20 assets
-- Elite: $99.99/mo, unlimited assets

-- Update existing tiers instead of deleting to avoid foreign key constraint issues
UPDATE public.tiers 
SET 
  price = CASE 
    WHEN name = 'trial' THEN 0
    WHEN name = 'essential' THEN 19.99
    WHEN name = 'pro' THEN 49.99
    WHEN name = 'elite' THEN 99.99
    ELSE price
  END,
  max_assets = CASE 
    WHEN name = 'trial' THEN 1
    WHEN name = 'essential' THEN 5
    WHEN name = 'pro' THEN 20
    WHEN name = 'elite' THEN 999999
    ELSE max_assets
  END,
  max_reports_per_day = CASE 
    WHEN name = 'trial' THEN 1
    WHEN name = 'essential' THEN 1
    WHEN name = 'pro' THEN 3
    WHEN name = 'elite' THEN 24
    ELSE max_reports_per_day
  END,
  additional_asset_price = CASE 
    WHEN name = 'trial' THEN 0
    WHEN name = 'essential' THEN 1.99
    WHEN name = 'pro' THEN 1.99
    WHEN name = 'elite' THEN 0
    ELSE additional_asset_price
  END,
  additional_report_price = CASE 
    WHEN name = 'trial' THEN 0
    WHEN name = 'essential' THEN NULL
    WHEN name = 'pro' THEN NULL
    WHEN name = 'elite' THEN 0.99
    ELSE additional_report_price
  END,
  updated_at = NOW()
WHERE name IN ('trial', 'essential', 'pro', 'elite');

-- Rename 'essential' to 'basic' if it exists
UPDATE public.tiers 
SET name = 'basic', updated_at = NOW()
WHERE name = 'essential';

-- Update the type definition to include 'basic' instead of 'essential'
-- Note: This will require updating the TypeScript types as well 