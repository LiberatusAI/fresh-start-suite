import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@16';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
function getTierFromPriceId(priceId) {
  const plans = {
    [Deno.env.get('VITE_STRIPE_INTRO_MONTHLY_PLAN_ID')]: 'basic',
    [Deno.env.get('VITE_STRIPE_PRO_MONTHLY_PLAN_ID')]: 'pro',
    [Deno.env.get('VITE_STRIPE_ELITE_MONTHLY_PLAN_ID')]: 'elite'
  };
  return plans[priceId] || null;
}
serve(async (req)=>{
  console.log('get-subscription handler started');
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request for get-subscription');
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient()
    });
    console.log('Stripe client initialized');
    const { sessionId } = await req.json();
    console.log('Received sessionId:', sessionId);
    if (!sessionId) {
      console.error('Session ID is required');
      return new Response(JSON.stringify({
        error: 'Session ID is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Retrieving Checkout Session from Stripe...');
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: [
        'subscription'
      ]
    });
    console.log('Checkout Session retrieved');
    if (!session.subscription) {
      console.error('No subscription found for this session:', sessionId);
      throw new Error('No subscription found for this session');
    }
    const subscription = session.subscription;
    const subscriptionId = subscription.id;
    const subscriptionStatus = subscription.status;
    const currentPeriodEnd = subscription.current_period_end;
    let subscriptionTier = null;
    if (subscription.items && subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id;
      subscriptionTier = getTierFromPriceId(priceId);
      console.log(`Determined tier: ${subscriptionTier} from priceId: ${priceId}`);
    }
    console.log('Subscription details extracted:', {
      subscriptionId,
      subscriptionTier,
      subscriptionStatus,
      currentPeriodEnd
    });
    return new Response(JSON.stringify({
      subscription_id: subscriptionId,
      subscription_tier: subscriptionTier,
      status: subscriptionStatus,
      current_period_end: currentPeriodEnd
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Detailed error in get-subscription catch block:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal Server Error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
