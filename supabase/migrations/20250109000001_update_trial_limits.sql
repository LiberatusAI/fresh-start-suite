-- Update trial tier limits to 1 asset and 1 report per day
UPDATE public.tiers 
SET max_assets = 1, 
    max_reports_per_day = 1
WHERE name = 'trial'; 