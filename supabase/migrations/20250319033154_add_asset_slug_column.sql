-- Add asset_slug column
ALTER TABLE public.asset_subscriptions ADD COLUMN asset_slug text;

-- Update existing rows to use asset_id as the slug
UPDATE public.asset_subscriptions SET asset_slug = asset_id;

-- Make asset_slug NOT NULL after populating data
ALTER TABLE public.asset_subscriptions ALTER COLUMN asset_slug SET NOT NULL;
