import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Initialize services inside the handler
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16'
    });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error('Missing sessionId parameter');
    }

    // Get user from Supabase auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({
        error: 'Authentication failed',
        details: userError?.message
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Retrieve the Stripe Checkout Session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'subscription', 'customer']
    });

    if (!session) {
      throw new Error('Could not retrieve session from Stripe.');
    }

    // Validation
    if (session.status !== 'complete') {
      throw new Error(`Session not complete. Status: ${session.status}`);
    }

    // Skip payment status check for trial subscriptions
    const isTrialSubscription = session.amount_total === 0 || session.metadata?.subscription_tier === 'trial';
    if (!isTrialSubscription && session.payment_status !== 'paid') {
      throw new Error(`Payment not successful. Status: ${session.payment_status}`);
    }

    // Extract Information
    const stripeCustomerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer?.id;
    
    const stripeSubscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

    if (!stripeCustomerId) {
      throw new Error('Stripe Customer ID not found in session.');
    }

    // Get line items
    const lineItems = session.line_items?.data;
    if (!lineItems || lineItems.length === 0 || !lineItems[0].price) {
      throw new Error('No line items or price found in session.');
    }
    
    const stripePriceId = lineItems[0].price.id;

    // Update Database
    const { data: tierData, error: tierError } = await supabaseAdmin
      .from('tiers')
      .select('id')
      .eq('stripe_price_id_monthly', stripePriceId)
      .single();
      
    if (tierError || !tierData) {
      console.error('Error fetching tier:', stripePriceId, tierError);
      throw new Error(`Tier with Stripe Price ID ${stripePriceId} not found.`);
    }
    
    const internalTierId = tierData.id;

    // Update user profile
    const updateData = {
      stripe_customer_id: stripeCustomerId,
      subscription_tier_id: internalTierId
    };
    
    if (stripeSubscriptionId) {
      updateData.stripe_subscription_id = stripeSubscriptionId;
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError);
      throw new Error(`Failed to update user profile.`);
    }

    // Welcome report moved to client-side (Dashboard) to avoid Edge Function invocation issues
    console.log('Payment verified - welcome report will be triggered on Dashboard landing');

    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription verified and profile updated.',
      tierId: internalTierId
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Verification failed:', error);
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
});