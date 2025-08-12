-- Update tiers with correct Stripe price IDs
UPDATE tiers 
SET stripe_price_id_monthly = 'price_1RrJztJk8bLGmbLeztlumA6L'
WHERE name = 'basic';

UPDATE tiers 
SET stripe_price_id_monthly = 'price_1RrP1xJk8bLGmbLeAH6Ji7tj'
WHERE name = 'pro';

UPDATE tiers 
SET stripe_price_id_monthly = 'price_1RrP2PJk8bLGmbLe0oVynKUo'
WHERE name = 'elite';