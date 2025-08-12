import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    console.log('Attempting to authenticate token:', token.substring(0, 20) + '...');
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Authentication failed. Error:', userError);
      console.error('Token used:', token.substring(0, 50) + '...');
      throw new Error(`Authentication failed: ${userError?.message || 'No user found'}`);
    }

    console.log('Welcome report trigger requested for user:', user.id);

    // Get user's active asset subscriptions
    const { data: assetSubscriptions, error: assetsError } = await supabaseAdmin
      .from('asset_subscriptions')
      .select('asset_slug, asset_name')
      .eq('user_id', user.id);

    if (assetsError) {
      console.error('Error fetching asset subscriptions:', assetsError);
      throw new Error('Failed to fetch user assets');
    }

    if (!assetSubscriptions || assetSubscriptions.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No active asset subscriptions found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Extract asset slugs
    const assetSlugs = assetSubscriptions
      .map(sub => sub.asset_slug)
      .filter(slug => slug) as string[];

    if (assetSlugs.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No valid asset slugs found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log('Triggering welcome report for assets:', assetSlugs);

    // Call the send-welcome-report function from the backend (no CORS issues)
    const { data, error: welcomeError } = await supabaseAdmin.functions.invoke('send-welcome-report', {
      body: { 
        user_id: user.id, 
        asset_slugs: assetSlugs 
      }
    });

    if (welcomeError) {
      console.error('Welcome report failed:', welcomeError);
      throw new Error(`Welcome report failed: ${welcomeError.message}`);
    }

    console.log('Welcome report triggered successfully:', data);

    return new Response(JSON.stringify({
      success: true,
      message: 'Welcome report triggered successfully',
      assets_count: assetSlugs.length,
      asset_slugs: assetSlugs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error triggering welcome report:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});