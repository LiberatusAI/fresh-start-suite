-- Create metric_sync_status table
CREATE TABLE IF NOT EXISTS public.metric_sync_status (
    asset_slug text PRIMARY KEY,
    last_sync timestamp with time zone NOT NULL,
    sync_status text NOT NULL DEFAULT 'pending',
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.metric_sync_status ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.metric_sync_status TO service_role;
GRANT SELECT ON public.metric_sync_status TO authenticated;

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER update_metric_sync_status_updated_at 
    BEFORE UPDATE ON public.metric_sync_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 