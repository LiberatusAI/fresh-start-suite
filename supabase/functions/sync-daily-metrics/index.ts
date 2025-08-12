// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Define our daily metrics
const dailyMetrics = [
  // Financial Metrics
  {
    type: 'price_ohlc',
    category: 'financial',
    hasJsonData: true,
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "price_usd") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "1d"
            aggregation: OHLC
          ) {
            datetime
            valueOhlc {
              open
              high
              close
              low
            }
          }
        }
      }
    `
  },
  {
    type: 'fully_diluted_valuation_usd',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "fully_diluted_valuation_usd") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "1d"
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  {
    type: 'annual_inflation_rate',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "annual_inflation_rate") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "1d"
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  {
    type: 'gini_index',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "gini_index") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "1d"
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  {
    type: 'mean_coin_age',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "mean_age") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "1d"
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  {
    type: 'btc_s_and_p_price_divergence',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "btc_s_and_p_price_divergence") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "1d"
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  {
    type: 'daily_closing_price_usd',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "daily_closing_price_usd") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "1d"
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  {
    type: 'rsi_1d',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "rsi_1d") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "1d"
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  {
    type: 'price_volatility_1d',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "price_volatility_1d") {
          timeseriesData(
            slug: $slug
            from: "__FROM_DATE__"
            to: "__TO_DATE__"
            interval: "1d"
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
        for (const metric of dailyMetrics){
          try {
            const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
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
              value: metric.hasJsonData ? latestDatapoint.valueOhlc.close?.toString() : latestDatapoint.value?.toString(),
              ohlc_open: metric.hasJsonData ? latestDatapoint.valueOhlc.open?.toString() : null,
              ohlc_high: metric.hasJsonData ? latestDatapoint.valueOhlc.high?.toString() : null,
              ohlc_low: metric.hasJsonData ? latestDatapoint.valueOhlc.low?.toString() : null,
              ohlc_close: metric.hasJsonData ? latestDatapoint.valueOhlc.close?.toString() : null,
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
      message: 'Daily metrics synced successfully',
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sync-daily-metrics' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/ 
