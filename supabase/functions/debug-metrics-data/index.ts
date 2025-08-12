import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { asset_slug } = await req.json();
    
    if (!asset_slug) {
      throw new Error('asset_slug is required');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Get all metric data for this asset in the last 30 days
    const { data: allMetrics, error: metricsError } = await supabaseClient
      .from('asset_metrics')
      .select('metric_type, datetime, value, ohlc_close')
      .eq('asset_slug', asset_slug)
      .gte('datetime', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('datetime', { ascending: false });

    if (metricsError) {
      throw new Error(`Failed to get metrics: ${metricsError.message}`);
    }

    // Group data by metric type
    const latestMetrics = {};
    const metricTypeCounts = {};
    
    if (allMetrics) {
      for (const metric of allMetrics) {
        if (!latestMetrics[metric.metric_type]) {
          latestMetrics[metric.metric_type] = {
            latest: metric,
            recent: []
          };
          metricTypeCounts[metric.metric_type] = 0;
        }
        
        if (latestMetrics[metric.metric_type].recent.length < 3) {
          latestMetrics[metric.metric_type].recent.push(metric);
        }
        
        metricTypeCounts[metric.metric_type]++;
      }
      
      // Add counts to each metric
      for (const metricType in latestMetrics) {
        latestMetrics[metricType].count = metricTypeCounts[metricType];
      }
    }

    // Check what the report function expects vs what we have
    const expectedMetrics = [
      'price_usd', 'volume_usd', 'marketcap_usd', 
      'social_volume_total', 'social_dominance_total', 
      'unique_social_volume_total', 'sentiment_volume_consumed_total',
      'rsi_1d', 'price_volatility_1d'
    ];

    const mismatchAnalysis = {
      missing: [],
      alternative_names: [],
      available: []
    };

    for (const expected of expectedMetrics) {
      if (latestMetrics[expected]) {
        mismatchAnalysis.available.push(expected);
      } else {
        mismatchAnalysis.missing.push(expected);
        
        // Check for alternative names
        const alternatives = Object.keys(latestMetrics).filter(key => 
          key.includes(expected.replace('_usd', '').replace('_total', '').replace('_1d', ''))
        );
        
        if (alternatives.length > 0) {
          mismatchAnalysis.alternative_names.push({
            expected: expected,
            alternatives: alternatives
          });
        }
      }
    }

    // Get sync status
    const { data: syncStatus, error: syncError } = await supabaseClient
      .from('metric_sync_status')
      .select('asset_slug, last_sync, sync_status, error_message')
      .eq('asset_slug', asset_slug)
      .order('last_sync', { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({
      success: true,
      asset_slug,
      debug_info: {
        total_metric_types: Object.keys(latestMetrics).length || 0,
        available_metrics: Object.keys(latestMetrics),
        latest_metrics: latestMetrics,
        mismatch_analysis: mismatchAnalysis,
        sync_status: syncStatus?.[0] || null,
        data_date_range: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Debug error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}); 