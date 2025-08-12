-- Create asset_metrics table for storing real-time market data from Santiment API
CREATE TABLE public.asset_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_slug TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- e.g., 'price_usd_5m', 'volume_usd', 'social_volume'
  metric_category TEXT, -- e.g., 'financial', 'social', 'network'
  value NUMERIC NOT NULL,
  ohlc_open NUMERIC, -- For OHLC data: Open price
  ohlc_high NUMERIC, -- For OHLC data: High price
  ohlc_low NUMERIC, -- For OHLC data: Low price
  ohlc_close NUMERIC, -- For OHLC data: Close price
  datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate entries for same asset/metric/time
  UNIQUE(asset_slug, metric_type, datetime)
);

-- Enable RLS
ALTER TABLE public.asset_metrics ENABLE ROW LEVEL SECURITY;

-- Indexes for fast queries
CREATE INDEX idx_asset_metrics_slug_type ON public.asset_metrics(asset_slug, metric_type);
CREATE INDEX idx_asset_metrics_datetime ON public.asset_metrics(datetime DESC);
CREATE INDEX idx_asset_metrics_slug_type_datetime ON public.asset_metrics(asset_slug, metric_type, datetime DESC);

-- RLS policies - anyone can read metrics (public data)
CREATE POLICY "Anyone can read metrics" ON public.asset_metrics FOR SELECT USING (true);
CREATE POLICY "Service role can manage metrics" ON public.asset_metrics FOR ALL USING (auth.role() = 'service_role');

-- Grants
GRANT ALL ON public.asset_metrics TO postgres;
GRANT ALL ON public.asset_metrics TO service_role;
GRANT SELECT ON public.asset_metrics TO authenticated;
GRANT SELECT ON public.asset_metrics TO anon;

-- Add trigger for updated_at
CREATE TRIGGER update_asset_metrics_updated_at
  BEFORE UPDATE ON public.asset_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.asset_metrics IS 'Stores real-time market data metrics from Santiment API';
COMMENT ON COLUMN public.asset_metrics.asset_slug IS 'Asset identifier (e.g., bitcoin, ethereum)';
COMMENT ON COLUMN public.asset_metrics.metric_type IS 'Type of metric (e.g., price_usd_5m, volume_usd, social_volume)';
COMMENT ON COLUMN public.asset_metrics.metric_category IS 'Category of metric (e.g., financial, social, network)';
COMMENT ON COLUMN public.asset_metrics.value IS 'Metric value (price, volume, etc.)';
COMMENT ON COLUMN public.asset_metrics.ohlc_open IS 'Open price for OHLC data (daily/historical metrics)';
COMMENT ON COLUMN public.asset_metrics.ohlc_high IS 'High price for OHLC data (daily/historical metrics)';
COMMENT ON COLUMN public.asset_metrics.ohlc_low IS 'Low price for OHLC data (daily/historical metrics)';
COMMENT ON COLUMN public.asset_metrics.ohlc_close IS 'Close price for OHLC data (daily/historical metrics)';
COMMENT ON COLUMN public.asset_metrics.datetime IS 'Timestamp of the metric data point';