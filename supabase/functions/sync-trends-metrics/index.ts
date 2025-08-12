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
// Define our trends metrics with their special queries
const trendsMetrics = [
  {
    type: 'emerging_trends',
    category: 'social',
    query: `
      query getEmergingTrends($from: DateTime!, $to: DateTime!) {
        getTrendingWords(
          from: $from
          to: $to
          size: 10
          interval: "1h"
        ) {
          datetime
          topWords {
            word
            score
          }
        }
      }
    `
  },
  {
    type: 'trending_words',
    category: 'social',
    query: `
      query getTrendingWords($from: DateTime!, $to: DateTime!) {
        getTrendingWords(
          from: $from
          to: $to
          size: 10
          interval: "1h"
        ) {
          datetime
          topWords {
            word
            score
          }
        }
      }
    `
  },
  {
    type: 'sentiment_balance',
    category: 'social',
    query: `
      query getSentimentBalance($from: DateTime!, $to: DateTime!, $slug: String!) {
        getMetric(metric: "sentiment_balance_total") {
          timeseriesData(
            slug: $slug
            from: $from
            to: $to
            interval: "1h"
          ) {
            datetime
            value
          }
        }
      }
    `
  },
  {
    type: 'trending_words_rank',
    category: 'social',
    query: `
      query getTrendingWordsRank($from: DateTime!, $to: DateTime!, $slug: String!) {
        getMetric(metric: "trending_words_rank") {
          timeseriesData(
            slug: $slug
            from: $from
            to: $to
            interval: "1h"
            includeIncompleteData: true
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
    // Fetch tracked assets from asset_subscriptions
    const { data: assets, error: assetsError } = await supabaseClient.from('asset_subscriptions').select('asset_slug').order('asset_slug');
    if (assetsError) {
      throw new Error(`Failed to fetch tracked assets: ${assetsError.message}`);
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
    // Process each metric
    for (const metric of trendsMetrics){
      try {
        const fromDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
        const toDate = new Date().toISOString();
        // For sentiment balance and trending words rank, we need to process each tracked asset
        if (metric.type === 'sentiment_balance' || metric.type === 'trending_words_rank') {
          for (const assetSlug of uniqueAssets){
            // Fetch data from Santiment
            console.log(`Making API call for ${assetSlug} - ${metric.type}`);
            console.log(`Query: ${metric.query}`);
            console.log(`Variables: ${JSON.stringify({ from: fromDate, to: toDate, slug: assetSlug })}`);
            
            const response = await fetch('https://api.santiment.net/graphql', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Apikey ${santimentApiKey}`
              },
              body: JSON.stringify({
                query: metric.query,
                variables: {
                  from: fromDate,
                  to: toDate,
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
              console.log(`No data returned for ${metric.type} for asset ${assetSlug}`);
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
          }
        } else {
          // Handle trending words metrics (these are global)
          console.log(`Making API call for global - ${metric.type}`);
          console.log(`Query: ${metric.query}`);
          console.log(`Variables: ${JSON.stringify({ from: fromDate, to: toDate })}`);
          
          const response = await fetch('https://api.santiment.net/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Apikey ${santimentApiKey}`
            },
            body: JSON.stringify({
              query: metric.query,
              variables: {
                from: fromDate,
                to: toDate
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
            console.error(`GraphQL errors for global - ${metric.type}:`, data.errors);
            throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
          }
          
          // Handle different response structures
          const trendingData = data?.data?.getTrendingWords;
          if (!trendingData || trendingData.length === 0) {
            console.log(`No data returned for ${metric.type}`);
            console.log(`Full response data:`, JSON.stringify(data, null, 2));
            continue;
          }
          // Get most recent trends
          const latestTrends = trendingData[trendingData.length - 1];
          // Prepare metric record with JSON data
          const metricRecord = {
            asset_slug: 'global',
            metric_type: metric.type,
            metric_category: metric.category,
            datetime: latestTrends.datetime,
            value: null,
            json_data: latestTrends.topWords,
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
        }
        results.metrics_processed++;
      } catch (error) {
        console.error(`Error processing metric ${metric.type}:`, error);
        results.metrics_failed++;
        results.errors.push(`${metric.type}: ${error.message}`);
      }
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'Trends metrics synced successfully',
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sync-trends-metrics' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/ 
