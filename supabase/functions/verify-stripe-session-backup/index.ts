import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno';
// Initialize Stripe with your secret key and API version
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16'
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error('Missing sessionId parameter');
    }
    // Get user from Supabase auth (using the Authorization header passed by the client)
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
      expand: [
        'line_items',
        'subscription',
        'customer'
      ]
    });
    if (!session) {
      throw new Error('Could not retrieve session from Stripe.');
    }
    // --- Validation ---
    if (session.status !== 'complete') {
      throw new Error(`Session not complete. Status: ${session.status}`);
    }
    // Skip payment status check for trial subscriptions (they have no payment)
    const isTrialSubscription = session.amount_total === 0 || session.metadata?.subscription_tier === 'trial';
    if (!isTrialSubscription && session.payment_status !== 'paid') {
      throw new Error(`Payment not successful. Status: ${session.payment_status}`);
    }
    // --- Extract Information ---
    // Handle both expanded (object) and non-expanded (string) customer field
    const stripeCustomerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer?.id;
    // Handle both expanded (object) and non-expanded (string) subscription field  
    const stripeSubscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id; // This will be null for one-time payments
    if (!stripeCustomerId) {
      throw new Error('Stripe Customer ID not found in session.');
    }
    // Assuming the first line item is the primary subscription/product
    const lineItems = session.line_items?.data;
    if (!lineItems || lineItems.length === 0 || !lineItems[0].price) {
      throw new Error('No line items or price found in session.');
    }
    const stripePriceId = lineItems[0].price.id;
    // --- Update Supabase Database ---
    // 1. Look up your internal tier_id from your 'tiers' table by matching the stripePriceId
    //    Uses the stripe_price_id_monthly column
    const { data: tierData, error: tierError } = await supabaseAdmin
      .from('tiers')
      .select('id')
      .eq('stripe_price_id_monthly', stripePriceId)
      .single();
      
    if (tierError || !tierData) {
      console.error('Error fetching tier by stripe_price_id_monthly:', stripePriceId, tierError);
      throw new Error(`Tier with Stripe Price ID ${stripePriceId} not found. Error: ${tierError?.message}`);
    }
    const internalTierId = tierData.id;
    // 2. Update the user's record in your 'profiles' table
    const updateData = {
      stripe_customer_id: stripeCustomerId,
      subscription_tier_id: internalTierId
    };
    if (stripeSubscriptionId) {
      updateData.stripe_subscription_id = stripeSubscriptionId;
    // If it's a subscription, you might also want to store:
    // session.subscription.current_period_end (convert to ISO string)
    // session.subscription.status
    }
    const { error: profileUpdateError } = await supabaseAdmin.from('profiles').update(updateData).eq('id', user.id);
    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError);
      throw new Error(`Failed to update user profile. Error: ${profileUpdateError.message}`);
    }

    // Trigger welcome report for users who just completed payment
    try {
      // Get user's asset subscriptions to include in welcome report
      const { data: assetSubscriptions, error: assetsError } = await supabaseAdmin
        .from('asset_subscriptions')
        .select('asset_slug, asset_name')
        .eq('user_id', user.id);

      if (!assetsError && assetSubscriptions && assetSubscriptions.length > 0) {
        // Extract asset slugs for the welcome report
        const assetSlugs = assetSubscriptions
          .map(sub => sub.asset_slug)
          .filter(slug => slug) as string[];

        if (assetSlugs.length > 0) {
          console.log('Triggering welcome report for user:', user.id, 'assets:', assetSlugs);
          
          // Call the send-welcome-report function
          const { error: welcomeError } = await supabaseAdmin.functions.invoke('send-welcome-report', {
            body: { 
              user_id: user.id, 
              asset_slugs: assetSlugs 
            }
          });

          if (welcomeError) {
            console.error('Welcome report failed:', welcomeError);
            // Don't throw error - welcome report failure shouldn't break payment verification
          } else {
            console.log('Welcome report triggered successfully for user:', user.id);
          }
        } else {
          console.log('No asset slugs found for welcome report');
        }
      } else {
        console.log('No asset subscriptions found for welcome report:', assetsError);
      }
    } catch (welcomeError) {
      console.error('Welcome report error:', welcomeError);
      // Silent failure - don't break the payment verification process
    }

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
      error: error.message,
      details: error.stack
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
