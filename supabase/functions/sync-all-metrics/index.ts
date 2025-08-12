// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing required environment variables');
    }
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // List of sync functions to call
    const syncFunctions = [
      'sync-5m-metrics',
      'sync-hourly-metrics',
      'sync-trends-metrics',
      'sync-daily-metrics'
    ];
    const results = [];
    const errors = [];
    // Call each sync function
    for (const functionName of syncFunctions){
      try {
        console.log(`Calling ${functionName}...`);
        const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(`Error calling ${functionName}: ${JSON.stringify(result)}`);
        }
        results.push({
          function: functionName,
          status: 'success',
          result
        });
        console.log(`Successfully called ${functionName}`);
      } catch (error) {
        console.error(`Error calling ${functionName}:`, error);
        errors.push({
          function: functionName,
          error: error.message
        });
      }
    }
    // Update sync status in database
    await supabase.from('metric_sync_status').upsert({
      last_sync: new Date().toISOString(),
      sync_status: errors.length > 0 ? 'partial_success' : 'success',
      error_message: errors.length > 0 ? JSON.stringify(errors) : null
    });
    return new Response(JSON.stringify({
      success: true,
      results,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: errors.length > 0 ? 207 : 200 // 207 for partial success
    });
  } catch (error) {
    console.error('Error in sync-all-metrics:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}) /* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sync-all-metrics' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/ ;
