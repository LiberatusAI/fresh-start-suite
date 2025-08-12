import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});

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
    const { subscriptionId, newPriceId } = await req.json();
    
    if (!subscriptionId || !newPriceId) {
      return new Response(JSON.stringify({
        error: 'Subscription ID and new price ID are required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'No authorization header'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({
        error: 'Invalid token'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Verify the subscription belongs to the user
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single();
      
    if (!profile || profile.stripe_subscription_id !== subscriptionId) {
      return new Response(JSON.stringify({
        error: 'Invalid subscription'
      }), {
        status: 403,
        headers: corsHeaders
      });
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentPriceId = subscription.items.data[0].price.id;

    // If the price is the same, return early
    if (currentPriceId === newPriceId) {
      return new Response(JSON.stringify({
        message: 'Subscription already has this price'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Update subscription
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId
      }],
      proration_behavior: 'create_prorations',
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });

    return new Response(JSON.stringify({
      subscriptionId: updatedSubscription.id,
      clientSecret: updatedSubscription.latest_invoice?.payment_intent?.client_secret || null
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
