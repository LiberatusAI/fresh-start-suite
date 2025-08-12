-- Admin Queries for AI Cost Analytics
-- Run these in Supabase SQL Editor to view cost data

-- 1. Daily cost breakdown by feature
SELECT 
  DATE(created_at) as date,
  feature_type,
  COUNT(*) as requests,
  SUM(total_cost) as daily_cost,
  AVG(total_cost) as avg_cost_per_request,
  SUM(total_tokens) as tokens_used
FROM ai_cost_analytics
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), feature_type
ORDER BY date DESC, feature_type;

-- 2. Monthly cost summary (use the view)
SELECT * FROM monthly_ai_cost_summary
ORDER BY month DESC, feature_type;

-- 3. Cost by user tier (use the view)
SELECT * FROM cost_by_tier_summary;

-- 4. Top 10 most expensive users
SELECT 
  p.email,
  a.user_tier,
  COUNT(*) as total_requests,
  SUM(a.total_cost) as total_cost,
  AVG(a.total_cost) as avg_cost_per_request
FROM ai_cost_analytics a
JOIN profiles p ON a.user_id = p.id
GROUP BY p.email, a.user_tier
ORDER BY total_cost DESC
LIMIT 10;

-- 5. Most expensive individual requests
SELECT 
  a.user_id,
  p.email,
  a.feature_type,
  a.total_cost,
  a.total_tokens,
  a.created_at
FROM ai_cost_analytics a
JOIN profiles p ON a.user_id = p.id
ORDER BY a.total_cost DESC
LIMIT 20;

-- 6. Average cost per feature type
SELECT 
  feature_type,
  COUNT(*) as total_requests,
  AVG(total_cost) as avg_cost,
  MIN(total_cost) as min_cost,
  MAX(total_cost) as max_cost,
  SUM(total_cost) as total_cost
FROM ai_cost_analytics
GROUP BY feature_type;

-- 7. Hourly usage pattern (last 7 days)
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as requests,
  SUM(total_cost) as total_cost
FROM ai_cost_analytics
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

-- 8. Cost trend by day (last 30 days)
SELECT 
  DATE(created_at) as date,
  SUM(total_cost) as daily_cost,
  SUM(SUM(total_cost)) OVER (ORDER BY DATE(created_at)) as cumulative_cost
FROM ai_cost_analytics
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- 9. Token usage efficiency by tier
SELECT 
  user_tier,
  AVG(prompt_tokens) as avg_prompt_tokens,
  AVG(completion_tokens) as avg_completion_tokens,
  AVG(total_tokens) as avg_total_tokens,
  AVG(total_cost) as avg_cost
FROM ai_cost_analytics
GROUP BY user_tier;

-- 10. Check if cost tracking is working (recent entries)
SELECT 
  created_at,
  feature_type,
  total_tokens,
  total_cost,
  response_time_ms
FROM ai_cost_analytics
ORDER BY created_at DESC
LIMIT 10;