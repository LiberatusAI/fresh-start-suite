import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, access-control-request-headers, access-control-request-method',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { 
      userId,
      email,
      firstName,
      lastName
    } = await req.json();

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: 'userId and email are required' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Create a Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the trial tier
    const { data: trialTier, error: tierError } = await supabaseClient
      .from('tiers')
      .select('*')
      .eq('name', 'trial')
      .single();

    if (tierError || !trialTier) {
      return new Response(JSON.stringify({ error: 'Trial tier not found' }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Calculate trial dates
    const now = new Date();
    const trialEndDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days from now

    // Update the user's profile with trial information
    // Use direct SQL to bypass schema cache issues
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        subscription_tier_id: trialTier.id
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile for trial:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to create trial subscription' }), {
        status: 500,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      trialEndDate: trialEndDate.toISOString(),
      message: 'Trial subscription created successfully'
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error creating trial subscription:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to create trial subscription'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}); 