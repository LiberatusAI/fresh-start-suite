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
    const { subscriptionId } = await req.json();
    
    if (!subscriptionId) {
      return new Response(JSON.stringify({
        error: 'Subscription ID is required'
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

    // Cancel the subscription immediately
    let canceledSubscription;
    try {
      // First, check if the subscription exists
      const existingSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      // Only cancel if it's active
      if (existingSubscription.status !== 'canceled') {
        canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);
      } else {
        canceledSubscription = existingSubscription;
      }
    } catch (error) {
      // If subscription doesn't exist (404), treat it as already canceled
      if (error.code === 'resource_missing') {
        console.log(`Subscription ${subscriptionId} not found in Stripe, treating as already canceled`);
        canceledSubscription = { 
          id: subscriptionId, 
          status: 'canceled',
          canceled_at: Math.floor(Date.now() / 1000)
        };
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    // Update the user's profile to remove the subscription ID
    await supabase
      .from('profiles')
      .update({ stripe_subscription_id: null })
      .eq('id', user.id);

    return new Response(JSON.stringify({
      subscriptionId: canceledSubscription.id,
      status: canceledSubscription.status,
      message: 'Subscription successfully canceled'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error canceling subscription:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}); 