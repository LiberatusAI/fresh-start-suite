-- Create a simple stored procedure to save aggregate scores
-- This bypasses the INSERT issues by doing the operation server-side

CREATE OR REPLACE FUNCTION save_aggregate_score(
  p_asset_slug TEXT,
  p_price_change NUMERIC,
  p_score INTEGER,
  p_metric_scores JSONB DEFAULT '{}'::jsonb,
  p_metric_count INTEGER DEFAULT 1
) RETURNS JSON AS $$
DECLARE
  result_record RECORD;
BEGIN
  -- Insert the aggregate score record
  INSERT INTO public.asset_aggregate_scores (
    asset_slug, 
    aggregate_score, 
    normalized_score, 
    score_change, 
    previous_score, 
    metric_count, 
    metric_scores, 
    analysis_date,
    created_at
  ) VALUES (
    p_asset_slug,
    p_score,
    CASE 
      WHEN p_metric_count > 0 THEN ROUND((p_score::NUMERIC / p_metric_count) * 100, 2)
      ELSE 0
    END, -- Normalize as percentage of metrics scored positively vs negatively
    p_price_change,
    NULL,
    p_metric_count,
    p_metric_scores,
    NOW(),
    NOW()
  ) RETURNING id, asset_slug, aggregate_score, created_at INTO result_record;
  
  -- Return success with the inserted record info
  RETURN json_build_object(
    'success', true,
    'id', result_record.id,
    'asset_slug', result_record.asset_slug,
    'score', result_record.aggregate_score,
    'created_at', result_record.created_at
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error info
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION save_aggregate_score TO service_role; 