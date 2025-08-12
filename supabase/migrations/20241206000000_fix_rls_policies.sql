-- Make asset_aggregate_scores table completely public to test if RLS was the issue
-- Drop existing policies
DROP POLICY IF EXISTS "Service role has full access to asset_aggregate_scores" ON "public"."asset_aggregate_scores";
DROP POLICY IF EXISTS "Enable all operations for service role" ON "public"."asset_aggregate_scores";

-- Disable RLS entirely - makes table public
ALTER TABLE "public"."asset_aggregate_scores" DISABLE ROW LEVEL SECURITY;

-- Grant permissions to ensure access
GRANT ALL ON "public"."asset_aggregate_scores" TO "service_role"; 