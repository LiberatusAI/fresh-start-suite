import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};
// Define STRIPE_PLANS here since we can't import it directly
const STRIPE_PLANS = {
  basic: {
    monthly: {
      priceId: Deno.env.get('VITE_STRIPE_INTRO_MONTHLY_PLAN_ID'),
      name: 'Basic',
      price: 19.99,
      maxAssets: 5,
      maxReportsPerDay: 1,
      additionalAssetPrice: 1.99,
      billingPeriod: 'month'
    }
  },
  pro: {
    monthly: {
      priceId: Deno.env.get('VITE_STRIPE_PRO_MONTHLY_PLAN_ID'),
      name: 'Pro',
      price: 49.99,
      maxAssets: 20,
      maxReportsPerDay: 3,
      additionalAssetPrice: 1.99,
      billingPeriod: 'month'
    }
  },
  elite: {
    monthly: {
      priceId: Deno.env.get('VITE_STRIPE_ELITE_MONTHLY_PLAN_ID'),
      name: 'Elite',
      price: 99.99,
      maxAssets: 999999,
      maxReportsPerDay: 24,
      additionalAssetPrice: 0,
      additionalReportPrice: 0.99,
      billingPeriod: 'month'
    }
  }
};
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
        'Content-Length': '2'
      }
    });
  }
  try {
    const { priceId, customerId } = await req.json();
    if (!priceId) {
      return new Response(JSON.stringify({
        error: 'Price ID is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'No authorization header'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({
        error: 'Invalid token'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Create or get Stripe customer
    let stripeCustomerId = customerId;
    if (!stripeCustomerId) {
      const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single();
      if (profile?.stripe_customer_id) {
        stripeCustomerId = profile.stripe_customer_id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id
          }
        });
        stripeCustomerId = customer.id;
        // Save Stripe customer ID to profile
        await supabase.from('profiles').update({
          stripe_customer_id: customer.id
        }).eq('id', user.id);
      }
    }
    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price: priceId
        }
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: [
        'latest_invoice.payment_intent'
      ]
    });
    // Update user's subscription tier in Supabase
    const plan = Object.entries(STRIPE_PLANS).find(([_, plan])=>plan.monthly.priceId === priceId);
    if (plan) {
      await supabase.from('profiles').update({
        subscription_tier: plan[0],
        stripe_subscription_id: subscription.id
      }).eq('id', user.id);
    }
    return new Response(JSON.stringify({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
