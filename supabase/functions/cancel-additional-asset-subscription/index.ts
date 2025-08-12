import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16'
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const { subscriptionId } = await req.json();
    if (!subscriptionId) {
      return new Response(JSON.stringify({ error: 'Subscription ID is required' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Get the subscription to verify it belongs to the user
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Get the customer ID from the user's profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id || subscription.customer !== profile.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'Subscription not found or unauthorized' }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Verify this is an additional asset subscription
    if (subscription.metadata.additional_asset !== 'true') {
      return new Response(JSON.stringify({ error: 'Not an additional asset subscription' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Cancel the subscription immediately
    const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);

    return new Response(JSON.stringify(canceledSubscription), {
      headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}); 