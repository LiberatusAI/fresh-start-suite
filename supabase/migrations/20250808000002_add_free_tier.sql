-- Add free tier for users who cancel or have payment failures
INSERT INTO tiers (name, price, max_assets, max_reports_per_day, additional_asset_price)
VALUES ('free', 0, 0, 0, 0)
ON CONFLICT (name) DO NOTHING;