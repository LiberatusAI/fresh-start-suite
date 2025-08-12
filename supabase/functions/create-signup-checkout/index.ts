import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
console.log('Stripe key starts with:', stripeKey.substring(0, 7), 'length:', stripeKey.length);
const stripe = new Stripe(stripeKey, {
  apiVersion: '2023-10-16'
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, access-control-request-headers, access-control-request-method',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Define STRIPE_PLANS mapping with correct price IDs
const STRIPE_PLANS = {
  trial: {
    priceId: Deno.env.get('VITE_STRIPE_TRIAL_PRICE_ID') || 'price_1RtrmrJk8bLGmbLeseU768y0',
    name: 'Trial',
    price: 0,
    maxAssets: 1,
    maxReportsPerDay: 1,
    additionalAssetPrice: 1.99,
    billingPeriod: 'month'
  },
  basic: {
    priceId: 'price_1RrJztJk8bLGmbLeztlumA6L', // Correct basic monthly price ID
    name: 'Basic',
    price: 19.99,
    maxAssets: 5,
    maxReportsPerDay: 1,
    additionalAssetPrice: 1.99,
    billingPeriod: 'month'
  },
  pro: {
    priceId: 'price_1RrP1xJk8bLGmbLeAH6Ji7tj', // Correct pro monthly price ID
    name: 'Pro',
    price: 49.99,
    maxAssets: 20,
    maxReportsPerDay: 3,
    additionalAssetPrice: 1.99,
    billingPeriod: 'month'
  },
  elite: {
    priceId: 'price_1RrP2PJk8bLGmbLe0oVynKUo', // Correct elite monthly price ID
    name: 'Elite',
    price: 99.99,
    maxAssets: 999999,
    maxReportsPerDay: 24,
    additionalAssetPrice: 0,
    additionalReportPrice: 0.99,
    billingPeriod: 'month'
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the request body
    const body = await req.json();
    console.log('Received request body:', body);
    
    const { 
      userId,
      tier,
      email,
      firstName,
      lastName,
      couponId, // Add support for automatic coupon application
      trialPeriodDays // Add support for trial periods
    } = body;

    console.log('Extracted parameters:', { userId, tier, email, firstName, lastName });

    if (!userId || !tier || !email) {
      console.error('Missing required parameters:', { userId: !!userId, tier: !!tier, email: !!email });
      return new Response(JSON.stringify({ 
        error: 'userId, tier, and email are required',
        received: { userId: !!userId, tier: !!tier, email: !!email }
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate tier
    if (!STRIPE_PLANS[tier as keyof typeof STRIPE_PLANS]) {
      console.error('Invalid tier:', tier, 'Available tiers:', Object.keys(STRIPE_PLANS));
      return new Response(JSON.stringify({ 
        error: 'Invalid subscription tier',
        received: tier,
        available: Object.keys(STRIPE_PLANS)
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const plan = STRIPE_PLANS[tier as keyof typeof STRIPE_PLANS];
    const priceId = plan.priceId;
    
    console.log('VITE_STRIPE_TRIAL_PRICE_ID from env:', Deno.env.get('VITE_STRIPE_TRIAL_PRICE_ID'));
    console.log('Plan details:', { tier, plan, priceId });

    if (!priceId) {
      console.error('Price ID not configured for tier:', tier);
      return new Response(JSON.stringify({ 
        error: 'Price ID not configured for this tier',
        tier,
        plan
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Create a Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get or create the Stripe customer
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id;

    // Check if we need to create a new customer
    // This handles both missing customer IDs and test mode customer IDs in production
    let needNewCustomer = !stripeCustomerId;
    
    if (stripeCustomerId && stripeKey.startsWith('sk_live')) {
      // In live mode, check if the customer exists
      try {
        await stripe.customers.retrieve(stripeCustomerId);
      } catch (error) {
        console.log('Customer not found in live mode, creating new one:', error.message);
        needNewCustomer = true;
      }
    }

    if (needNewCustomer) {
      console.log('Creating new Stripe customer for user:', userId);
      const customer = await stripe.customers.create({
        email: email,
        name: `${firstName} ${lastName}`,
        metadata: { supabase_user_id: userId }
      });
      stripeCustomerId = customer.id;
      
      await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);
    }

    console.log('Using Stripe customer ID:', stripeCustomerId);

    // Get frontend URL from request origin or environment variable
    const origin = req.headers.get('origin');
    const envFrontendUrl = Deno.env.get('FRONTEND_URL');
    console.log('FRONTEND_URL from env:', envFrontendUrl);
    console.log('Origin from request:', origin);
    
    const frontendUrl = envFrontendUrl || origin || 'https://futurecast.pro';
    console.log('Using frontend URL:', frontendUrl);
    
    let session;
    
    // Special handling for trial tier
    if (tier === 'trial') {
      console.log('Creating trial checkout session');
      
      // Calculate trial end date (7 days from now)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);
      
      // Create subscription to trial product ($0)
      session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{ price: plan.priceId, quantity: 1 }], // Trial price ($0)
        success_url: `${frontendUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/subscription-canceled`,
        metadata: {
          supabase_user_id: userId,
          subscription_tier: tier
        },
        subscription_data: {
          metadata: {
            supabase_user_id: userId,
            subscription_tier: tier,
            trial_ends_at: trialEndDate.toISOString(),
            should_upgrade_to: 'basic'
          }
        }
      });
    } else {
      // Regular subscription for non-trial tiers
      const sessionConfig = {
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription' as const,
        success_url: `${frontendUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/subscription-canceled`,
        allow_promotion_codes: true, // Enable coupon code input on Stripe checkout page
        metadata: {
          supabase_user_id: userId,
          subscription_tier: tier
        },
        subscription_data: {
          metadata: {
            supabase_user_id: userId,
            subscription_tier: tier
          }
        }
      };

      // Automatically apply coupon if provided and not the placeholder value
      if (couponId && couponId !== 'your_coupon_id_here') {
        sessionConfig.discounts = [{ coupon: couponId }];
        // Remove allow_promotion_codes when using discounts
        delete sessionConfig.allow_promotion_codes;
      }
      
      // Add trial period if specified (for non-trial tiers)
      if (trialPeriodDays) {
        sessionConfig.subscription_data.trial_period_days = trialPeriodDays;
      }

      console.log('Creating Stripe session with config:', sessionConfig);
      session = await stripe.checkout.sessions.create(sessionConfig);
    }

    console.log('Stripe session created:', session.id);
    
    // Ensure we have a valid URL
    if (!session.url) {
      throw new Error('Stripe session created but no URL returned');
    }
    
    const responseData = { 
      url: session.url,
      sessionUrl: session.url,  // Include both for compatibility
      sessionId: session.id 
    };
    
    console.log('Returning response:', responseData);
    
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error creating signup checkout session:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to create checkout session',
      stack: error.stack
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}); 