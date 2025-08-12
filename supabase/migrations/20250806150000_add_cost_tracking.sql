-- Add cost tracking for AI chat and report generation
-- This tracks actual API costs per request for internal analytics

-- Create cost tracking table for analytics
CREATE TABLE IF NOT EXISTS ai_cost_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Request details
  feature_type text NOT NULL CHECK (feature_type IN ('chat', 'welcome_report', 'asset_report', 'test_report')),
  request_id uuid, -- Can link to specific chat session or report
  
  -- Token counts
  prompt_tokens integer NOT NULL,
  completion_tokens integer NOT NULL,
  total_tokens integer NOT NULL,
  
  -- Cost breakdown (in USD)
  prompt_cost numeric(10, 8) NOT NULL,
  completion_cost numeric(10, 8) NOT NULL,
  total_cost numeric(10, 8) NOT NULL,
  
  -- Model info
  model_name text NOT NULL DEFAULT 'gemini-1.5-flash',
  model_pricing jsonb, -- Store pricing at time of request
  
  -- Context info
  context_size integer, -- Number of assets or data points in context
  query_type text,
  response_time_ms integer,
  
  -- User tier at time of request
  user_tier text
);

-- Create indexes for efficient queries
CREATE INDEX idx_ai_cost_analytics_user_id ON ai_cost_analytics(user_id);
CREATE INDEX idx_ai_cost_analytics_created_at ON ai_cost_analytics(created_at);
CREATE INDEX idx_ai_cost_analytics_feature_type ON ai_cost_analytics(feature_type);

-- Create view for easy monthly cost reporting
CREATE OR REPLACE VIEW monthly_ai_cost_summary AS
SELECT 
  date_trunc('month', created_at) as month,
  feature_type,
  COUNT(*) as total_requests,
  SUM(total_cost) as total_cost_usd,
  AVG(total_cost) as avg_cost_per_request,
  SUM(total_tokens) as total_tokens_used,
  AVG(response_time_ms) as avg_response_time_ms
FROM ai_cost_analytics
GROUP BY date_trunc('month', created_at), feature_type
ORDER BY month DESC, feature_type;

-- Create view for cost by user tier
CREATE OR REPLACE VIEW cost_by_tier_summary AS
SELECT 
  user_tier,
  feature_type,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_requests,
  SUM(total_cost) as total_cost,
  AVG(total_cost) as avg_cost_per_request,
  SUM(total_tokens) as total_tokens
FROM ai_cost_analytics
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_tier, feature_type
ORDER BY user_tier, feature_type;

-- RLS policies
ALTER TABLE ai_cost_analytics ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (from Edge Functions)
CREATE POLICY "Service role can insert cost data" ON ai_cost_analytics
  FOR INSERT TO service_role WITH CHECK (true);

-- Admins can view all cost data
CREATE POLICY "Admins can view cost data" ON ai_cost_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Comment for documentation
COMMENT ON TABLE ai_cost_analytics IS 'Tracks API costs for all AI features (chat, reports) for internal cost analysis';
COMMENT ON COLUMN ai_cost_analytics.feature_type IS 'Which feature generated this cost: chat, welcome_report, asset_report, test_report';
COMMENT ON COLUMN ai_cost_analytics.total_cost IS 'Total cost in USD for this API request';

-- Sample queries for admins (save these in documentation)
/*
-- Daily cost breakdown
SELECT 
  DATE(created_at) as date,
  feature_type,
  COUNT(*) as requests,
  SUM(total_cost) as daily_cost,
  AVG(total_cost) as avg_cost
FROM ai_cost_analytics
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), feature_type
ORDER BY date DESC;

-- Most expensive requests
SELECT 
  user_id,
  feature_type,
  total_cost,
  total_tokens,
  created_at
FROM ai_cost_analytics
ORDER BY total_cost DESC
LIMIT 20;

-- Cost by user (top spenders)
SELECT 
  u.email,
  COUNT(*) as total_requests,
  SUM(a.total_cost) as total_cost,
  AVG(a.total_cost) as avg_cost
FROM ai_cost_analytics a
JOIN profiles u ON a.user_id = u.id
GROUP BY u.email
ORDER BY total_cost DESC
LIMIT 50;
*/