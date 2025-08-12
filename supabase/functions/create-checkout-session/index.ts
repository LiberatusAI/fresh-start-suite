import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno';

// Debug logging
console.log('STRIPE_SECRET_KEY exists:', !!Deno.env.get('STRIPE_SECRET_KEY'));
console.log('STRIPE_SECRET_KEY prefix:', Deno.env.get('STRIPE_SECRET_KEY')?.substring(0, 7));

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16'
});
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
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Create a Supabase client with the auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get the user from the auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Get the request body
    const { 
      priceId, 
      quantity = 1, 
      mode = 'subscription',
      successUrl,
      cancelUrl,
      couponId, // Add support for automatic coupon application
      trialPeriodDays // Add support for trial periods
    } = await req.json();

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Price ID is required' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Get or create the Stripe customer
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id }
      });
      stripeCustomerId = customer.id;
      
      await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id);
    }

    // Create the checkout session
    const frontendUrl = Deno.env.get('FRONTEND_URL') || '';
    
    // Use provided URLs or fallback to defaults
    const defaultSuccessUrl = `${frontendUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${frontendUrl}/subscription-canceled`;
    
    const finalSuccessUrl = successUrl || defaultSuccessUrl;
    const finalCancelUrl = cancelUrl || defaultCancelUrl;

    const sessionConfig = {
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: quantity }],
      mode: mode as 'subscription' | 'payment',
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      allow_promotion_codes: true, // Enable coupon code input on Stripe checkout page
      metadata: {
        supabase_user_id: user.id,
        additional_assets: quantity.toString()
      }
    };

    // Automatically apply coupon if provided
    if (couponId && couponId !== 'your_coupon_id_here') {
      sessionConfig.discounts = [{ coupon: couponId }];
      // Remove allow_promotion_codes when using discounts
      delete sessionConfig.allow_promotion_codes;
    }

    // For subscription mode, add additional subscription-specific options
    if (mode === 'subscription') {
      Object.assign(sessionConfig, {
        subscription_data: {
          metadata: {
            supabase_user_id: user.id
          }
        }
      });
      
      // Add trial period if specified
      if (trialPeriodDays) {
        sessionConfig.subscription_data.trial_period_days = trialPeriodDays;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(JSON.stringify({ sessionId: session.id }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to create checkout session'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
