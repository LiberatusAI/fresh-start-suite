-- Seed data for local development
-- This will populate the database with realistic test data

-- Insert subscription tiers (mirroring production exactly)
INSERT INTO public.tiers (id, name, price, max_assets, max_reports_per_day, additional_asset_price, additional_report_price, stripe_price_id_monthly) VALUES
('11111111-1111-1111-1111-111111111111', 'trial', 0, 1, 1, 0, 0, NULL),
('22222222-2222-2222-2222-222222222222', 'basic', 19.99, 5, 1, 1.99, NULL, 'price_1RrJztJk8bLGmbLeztlumA6L'),
('33333333-3333-3333-3333-333333333333', 'pro', 49.99, 20, 3, 1.99, NULL, 'price_1RrP1xJk8bLGmbLeAH6Ji7tj'),
('44444444-4444-4444-4444-444444444444', 'elite', 99.99, 999999, 24, 0, 0.99, 'price_1RrP2PJk8bLGmbLe0oVynKUo')
ON CONFLICT (name) DO NOTHING;

-- Note: User profiles are created automatically when users sign up via auth
-- The handle_new_user() trigger will create the profile record
-- We don't need to manually insert user profiles here

-- Note: Asset subscriptions will be created when users select assets through the UI
-- We don't need to manually insert asset subscriptions here

-- Note: Asset market data (prices, scores, metrics) will be pulled from Santiment API
-- This seed file only contains user profile and subscription data 