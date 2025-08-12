import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
serve(async (req)=>{
  try {
    const { priceId } = await req.json();
    if (!priceId) {
      return new Response(JSON.stringify({
        error: 'Price ID is required'
      }), {
        status: 400
      });
    }
    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'No authorization header'
      }), {
        status: 401
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({
        error: 'Invalid token'
      }), {
        status: 401
      });
    }
    // Create or get Stripe customer
    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single();
    let stripeCustomerId = profile?.stripe_customer_id;
    if (!stripeCustomerId) {
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
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000,
      currency: 'usd',
      customer: stripeCustomerId,
      automatic_payment_methods: {
        enabled: true
      },
      metadata: {
        priceId
      }
    });
    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500
    });
  }
});
