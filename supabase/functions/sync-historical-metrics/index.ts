// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Define metrics we want to track for any asset
const historicalMetrics = [
  // Financial Metrics - Daily
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
  },
  // Financial Metrics - Originally 5m
  {
    type: 'average_fees_usd',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "average_fees_usd") {
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
    type: 'volume_usd',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "volume_usd") {
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
    type: 'marketcap_usd',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "marketcap_usd") {
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
    type: 'price_usd',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "price_usd") {
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
    type: 'price_btc',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "price_btc") {
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
    type: 'price_usdt',
    category: 'financial',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "price_usdt") {
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
  // Social Metrics - Originally 5m and Hourly
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
    type: 'social_dominance_total',
    category: 'social',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "social_dominance_total") {
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
    type: 'community_messages_count_total',
    category: 'social',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "community_messages_count_total") {
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
    type: 'sentiment_volume_consumed_total',
    category: 'social',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "sentiment_volume_consumed_total") {
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
    type: 'unique_social_volume_total',
    category: 'social',
    query: `
      query getMetric($slug: String!) {
        getMetric(metric: "unique_social_volume_total_1h") {
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
// Helper function to sleep between API calls
const sleep = (ms)=>new Promise((resolve)=>setTimeout(resolve, ms));
// Helper function to fetch data from Santiment with retries
async function fetchSantimentData(metric, slug, fromDate, toDate, apiKey, retries = 3, backoffMs = 1000) {
  for(let attempt = 1; attempt <= retries; attempt++){
    try {
      const query = metric.query.replace(/__FROM_DATE__/g, fromDate).replace(/__TO_DATE__/g, toDate);
      const response = await fetch('https://api.santiment.net/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Apikey ${apiKey}`
        },
        body: JSON.stringify({
          query,
          variables: {
            slug
          }
        })
      });
      if (!response.ok) {
        throw new Error(`Santiment API error: ${response.status}`);
      }
      const data = await response.json();
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }
      return data;
    } catch (error) {
      if (attempt === retries) throw error;
      // If we get rate limited (429) or server error (5xx), wait longer
      const isRateLimit = error.message.includes('429');
      const backoff = isRateLimit ? backoffMs * 2 : backoffMs;
      console.log(`Attempt ${attempt} failed, retrying in ${backoff}ms...`);
      await sleep(backoff);
    }
  }
}
serve(async (req)=>{
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: corsHeaders
      });
    }
    // Validate request method and body
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
    const requestData = await req.json();
    const { assetSlug, lookbackDays = 3650 } = requestData;
    if (!assetSlug) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Asset slug is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
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
    // Update sync status to in_progress immediately
    await supabaseClient.from('metric_sync_status').upsert({
      asset_slug: assetSlug,
      last_sync: new Date().toISOString(),
      sync_status: 'historical_sync_in_progress',
      error_message: null
    });
    // Run sync in foreground with full logging
    console.log(`Starting foreground sync for ${assetSlug} with ${lookbackDays} days of data...`);
    
    try {
      const results = await processHistoricalMetrics(assetSlug, lookbackDays, supabaseClient, santimentApiKey);
      
      // Return detailed results
      return new Response(JSON.stringify({
        success: true,
        message: 'Historical metrics sync completed',
        asset_slug: assetSlug,
        results
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Sync error:', error);
      // Update sync status to failed
      await supabaseClient.from('metric_sync_status').upsert({
        asset_slug: assetSlug,
        last_sync: new Date().toISOString(),
        sync_status: 'historical_sync_failed',
        error_message: error.message
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        asset_slug: assetSlug
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
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
});
// Move the sync logic to a separate async function
async function processHistoricalMetrics(assetSlug, lookbackDays, supabaseClient, santimentApiKey) {
  // Initialize results object
  const results = {
    asset_slug: assetSlug,
    metrics_processed: 0,
    metrics_failed: 0,
    errors: [],
    datapoints_saved: 0,
    processed_metrics: [],
    skipped_metrics: []
  };
  // Calculate date range
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - lookbackDays);
  // Process each metric
  for (const metric of historicalMetrics){
    try {
      console.log(`Processing ${metric.type} for ${assetSlug}...`);
      console.log(`  Date range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
      console.log(`  API Key: ${santimentApiKey ? santimentApiKey.substring(0, 10) + '...' : 'NOT SET'}`);
      
      const data = await fetchSantimentData(metric, assetSlug, fromDate.toISOString(), toDate.toISOString(), santimentApiKey);
      
      console.log(`  Response received, checking data...`);
      const timeseriesData = data?.data?.getMetric?.timeseriesData;
      
      if (!timeseriesData || timeseriesData.length === 0) {
        console.log(`  ⚠️  No data returned for ${assetSlug} - ${metric.type}`);
        if (data?.errors) {
          console.log(`  GraphQL Errors:`, JSON.stringify(data.errors));
        }
        results.skipped_metrics.push(metric.type);
        continue;
      }
      
      console.log(`  ✓ Got ${timeseriesData.length} data points`);
      // Prepare batch of records for this metric
      const metricRecords = timeseriesData.map((datapoint)=>({
          asset_slug: assetSlug,
          metric_type: metric.type,
          metric_category: metric.category,
          datetime: datapoint.datetime,
          value: metric.hasJsonData ? Number(datapoint.valueOhlc.close) : Number(datapoint.value),
          ohlc_open: metric.hasJsonData ? Number(datapoint.valueOhlc.open) : null,
          ohlc_high: metric.hasJsonData ? Number(datapoint.valueOhlc.high) : null,
          ohlc_low: metric.hasJsonData ? Number(datapoint.valueOhlc.low) : null,
          ohlc_close: metric.hasJsonData ? Number(datapoint.valueOhlc.close) : null,
          created_at: new Date().toISOString()
        }));
      // Batch upsert records in chunks of 100
      const BATCH_SIZE = 100;
      console.log(`  Saving ${metricRecords.length} records in batches of ${BATCH_SIZE}...`);
      
      for(let i = 0; i < metricRecords.length; i += BATCH_SIZE){
        const batch = metricRecords.slice(i, i + BATCH_SIZE);
        console.log(`    Upserting batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(metricRecords.length/BATCH_SIZE)}...`);
        
        const { error: upsertError } = await supabaseClient.from('asset_metrics').upsert(batch, {
          onConflict: 'asset_slug,metric_type,datetime'
        });
        
        if (upsertError) {
          console.error(`    ❌ Upsert failed:`, upsertError);
          throw new Error(`Failed to upsert batch: ${upsertError.message}`);
        }
        
        results.datapoints_saved += batch.length;
        console.log(`    ✓ Saved ${batch.length} records`);
        
        // Small delay between batches to avoid overwhelming the database
        await sleep(100);
      }
      results.metrics_processed++;
      results.processed_metrics.push(metric.type);
      // Add delay between metrics to respect rate limits
      await sleep(1000);
    } catch (error) {
      console.error(`Error processing metric ${metric.type} for ${assetSlug}:`, error);
      results.metrics_failed++;
      results.errors.push(`${metric.type}: ${error.message}`);
    }
  }
  // Update sync status to completed
  await supabaseClient.from('metric_sync_status').upsert({
    asset_slug: assetSlug,
    last_sync: new Date().toISOString(),
    sync_status: 'historical_sync_completed',
    error_message: results.errors.length > 0 ? results.errors.join('; ') : null
  });
  return results;
}
