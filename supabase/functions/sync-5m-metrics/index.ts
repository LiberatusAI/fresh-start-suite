// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
console.log("Hello from Functions!");
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Define our 5-minute metrics
const fiveMinuteMetrics = [
  // Financial Metrics
  {
    type: 'fees',
    category: 'financial',
    requiresIncompleteData: true,
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "fees") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "5m"
            includeIncompleteData: true
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  {
    type: 'volume_usd_5m',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "volume_usd") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "5m"
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  {
    type: 'marketcap_usd',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "marketcap_usd") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "5m"
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  {
    type: 'price_usd_5m',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "price_usd") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "5m"
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  // Social Metrics
  {
    type: 'social_volume_total',
    category: 'social',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "social_volume_total") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "5m"
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  {
    type: 'social_dominance_total',
    category: 'social',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "social_dominance_total") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "5m"
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  {
    type: 'community_messages_count_total',
    category: 'social',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "community_messages_count_total") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "5m"
          ) {
            datetime
            value
          }
        }
      }
    `
  }
];
serve(async (req)=>{
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: corsHeaders
      });
    }
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Initialize results object
    const results = {
      assets: [],
      metrics_processed: 0,
      metrics_failed: 0,
      errors: []
    };
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const santimentApiKey = Deno.env.get('SANTIMENT_API_KEY');
    if (!supabaseUrl || !serviceRoleKey || !santimentApiKey) {
      throw new Error('Missing required environment variables');
    }
    // Initialize Supabase client
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    // Get all tracked assets
    const { data: assets, error: assetError } = await supabaseClient.from('asset_subscriptions').select('asset_slug').order('asset_slug');
    if (assetError) {
      throw new Error(`Failed to fetch assets: ${assetError.message}`);
    }
    // Remove duplicates
    const uniqueAssets = Array.from(new Set(assets?.map((a)=>a.asset_slug) || []));
    console.log(`Found ${uniqueAssets.length} unique assets to sync:`, uniqueAssets);
    
    if (uniqueAssets.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No assets found to sync'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Process each asset
    for (const assetSlug of uniqueAssets){
      const assetResult = {
        slug: assetSlug,
        metrics_processed: 0,
        metrics_failed: 0,
        errors: []
      };
      try {
        // Update sync status to in_progress
        await supabaseClient.from('metric_sync_status').upsert({
          asset_slug: assetSlug,
          last_sync: new Date().toISOString(),
          sync_status: 'in_progress',
          error_message: null
        });
        // Process each metric for this asset
        for (const metric of fiveMinuteMetrics){
          try {
            const fromDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const toDate = new Date().toISOString();
            // Replace placeholders in the query
            const query = metric.query.replace(/__FROM_DATE__/g, fromDate).replace(/__TO_DATE__/g, toDate);
            // Fetch data from Santiment
            console.log(`Making API call for ${assetSlug} - ${metric.type}`);
            console.log(`Query: ${query}`);
            console.log(`Variables: ${JSON.stringify({ slug: assetSlug })}`);
            
            const response = await fetch('https://api.santiment.net/graphql', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Apikey ${santimentApiKey}`
              },
              body: JSON.stringify({
                query,
                variables: {
                  slug: assetSlug
                }
              })
            });
            
            console.log(`Response status: ${response.status}`);
            const responseText = await response.text();
            console.log(`Response body: ${responseText}`);
            
            if (!response.ok) {
              throw new Error(`Santiment API error: ${response.status} - ${responseText}`);
            }
            
            const data = JSON.parse(responseText);
            if (data.errors) {
              console.error(`GraphQL errors for ${assetSlug} - ${metric.type}:`, data.errors);
              throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
            }
            
            const timeseriesData = data?.data?.getMetric?.timeseriesData;
            if (!timeseriesData || timeseriesData.length === 0) {
              console.log(`No data returned for ${assetSlug} - ${metric.type}`);
              console.log(`Full response data:`, JSON.stringify(data, null, 2));
              continue;
            }
            // Get most recent datapoint
            const latestDatapoint = timeseriesData[timeseriesData.length - 1];
            // Prepare metric record
            const metricRecord = {
              asset_slug: assetSlug,
              metric_type: metric.type,
              metric_category: metric.category,
              datetime: latestDatapoint.datetime,
              value: latestDatapoint.value?.toString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            // Upsert to asset_metrics table
            const { error: upsertError } = await supabaseClient.from('asset_metrics').upsert(metricRecord, {
              onConflict: 'asset_slug,metric_type,datetime'
            });
            if (upsertError) {
              throw new Error(`Failed to upsert metric: ${upsertError.message}`);
            }
            assetResult.metrics_processed++;
          } catch (error) {
            console.error(`Error processing metric ${metric.type} for ${assetSlug}:`, error);
            assetResult.metrics_failed++;
            assetResult.errors.push(`${metric.type}: ${error.message}`);
          }
        }
        // Update sync status to completed
        await supabaseClient.from('metric_sync_status').upsert({
          asset_slug: assetSlug,
          last_sync: new Date().toISOString(),
          sync_status: 'completed',
          error_message: assetResult.errors.length > 0 ? assetResult.errors.join('; ') : null
        });
        results.assets.push(assetResult);
        results.metrics_processed += assetResult.metrics_processed;
        results.metrics_failed += assetResult.metrics_failed;
      } catch (error) {
        console.error(`Error processing asset ${assetSlug}:`, error);
        results.errors.push(`${assetSlug}: ${error.message}`);
      }
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'Metrics synced successfully',
      results
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}); /* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sync-5m-metrics' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/ 
