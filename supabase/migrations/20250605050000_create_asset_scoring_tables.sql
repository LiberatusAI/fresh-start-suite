-- Create asset_aggregate_scores table
CREATE TABLE IF NOT EXISTS "public"."asset_aggregate_scores" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "asset_slug" TEXT NOT NULL,
    "aggregate_score" INTEGER NOT NULL,
    "normalized_score" NUMERIC NOT NULL,
    "score_change" INTEGER NOT NULL DEFAULT 0,
    "previous_score" INTEGER,
    "metric_count" INTEGER NOT NULL,
    "metric_scores" JSONB NOT NULL,
    "analysis_date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "asset_aggregate_scores_asset_slug_idx" ON "public"."asset_aggregate_scores" ("asset_slug");
CREATE INDEX IF NOT EXISTS "asset_aggregate_scores_analysis_date_idx" ON "public"."asset_aggregate_scores" ("analysis_date");

-- Add update trigger
DROP TRIGGER IF EXISTS "update_asset_aggregate_scores_updated_at" ON "public"."asset_aggregate_scores";
CREATE TRIGGER "update_asset_aggregate_scores_updated_at" 
    BEFORE UPDATE ON "public"."asset_aggregate_scores" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Enable RLS
ALTER TABLE "public"."asset_aggregate_scores" ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON TABLE "public"."asset_aggregate_scores" TO "anon";
GRANT ALL ON TABLE "public"."asset_aggregate_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_aggregate_scores" TO "service_role";

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to asset_aggregate_scores" ON "public"."asset_aggregate_scores";
DROP POLICY IF EXISTS "Users can view aggregate scores" ON "public"."asset_aggregate_scores";

-- Create RLS policies with explicit permissions
CREATE POLICY "Service role has full access to asset_aggregate_scores" ON "public"."asset_aggregate_scores"
    AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Allow read access to aggregate scores" ON "public"."asset_aggregate_scores"
    AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true); 