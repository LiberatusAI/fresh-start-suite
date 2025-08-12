-- Add stripe_price_id_monthly column to tiers table if it doesn't exist
ALTER TABLE tiers 
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT;

-- Update existing tiers with their Stripe price IDs
UPDATE tiers SET stripe_price_id_monthly = 'price_1RtlRcJk8bLGmbLeCL2ZK3gn' WHERE name = 'trial';
UPDATE tiers SET stripe_price_id_monthly = 'price_1RrJztJk8bLGmbLeztlumA6L' WHERE name = 'basic';
UPDATE tiers SET stripe_price_id_monthly = 'price_1RrP1xJk8bLGmbLeAH6Ji7tj' WHERE name = 'pro';
UPDATE tiers SET stripe_price_id_monthly = 'price_1RrP2PJk8bLGmbLe0oVynKUo' WHERE name = 'elite';