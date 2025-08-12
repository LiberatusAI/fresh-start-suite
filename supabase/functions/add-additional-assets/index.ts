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
    const { subscriptionId, priceId, quantity } = await req.json();
    if (!subscriptionId || !priceId || !quantity) {
      return new Response(JSON.stringify({
        error: 'Subscription ID, price ID, and quantity are required'
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
    // Verify the subscription belongs to the user
    const { data: profile } = await supabase.from('profiles').select('stripe_subscription_id').eq('id', user.id).single();
    if (!profile || profile.stripe_subscription_id !== subscriptionId) {
      return new Response(JSON.stringify({
        error: 'Invalid subscription'
      }), {
        status: 403
      });
    }
    // Add additional items to subscription
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          price: priceId,
          quantity
        }
      ],
      proration_behavior: 'create_prorations',
      payment_behavior: 'default_incomplete',
      expand: [
        'latest_invoice.payment_intent'
      ]
    });
    // Update additional assets count in Supabase
    await supabase.from('profiles').update({
      additional_assets: (profile.additional_assets || 0) + quantity
    }).eq('id', user.id);
    return new Response(JSON.stringify({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error adding additional assets:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500
    });
  }
});
