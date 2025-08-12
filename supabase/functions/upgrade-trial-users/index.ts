import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16'
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find all active trial subscriptions that should be upgraded
    const { data: subscriptions } = await stripe.subscriptions.list({
      limit: 100,
      status: 'active'
    });

    const upgradedUsers = [];
    const errors = [];

    for (const subscription of subscriptions.data) {
      // Check if this is a trial subscription that needs upgrading
      const shouldUpgrade = subscription.metadata?.should_upgrade_to === 'basic';
      const trialEndsAt = subscription.metadata?.trial_ends_at;
      
      if (!shouldUpgrade || !trialEndsAt) continue;
      
      // Check if trial period has ended
      const trialEndDate = new Date(trialEndsAt);
      const now = new Date();
      
      if (now < trialEndDate) {
        console.log(`Trial not yet ended for subscription ${subscription.id}, ends at ${trialEndsAt}`);
        continue;
      }
      
      console.log(`Upgrading subscription ${subscription.id} from trial to basic`);
      
      try {
        // Cancel the trial subscription
        await stripe.subscriptions.cancel(subscription.id);
        
        // Create new basic subscription
        const newSubscription = await stripe.subscriptions.create({
          customer: subscription.customer,
          items: [{
            price: Deno.env.get('STRIPE_BASIC_PRICE_ID') || 'price_1RrJztJk8bLGmbLeztlumA6L' // Basic plan price ID from env
          }],
          metadata: {
            supabase_user_id: subscription.metadata.supabase_user_id,
            subscription_tier: 'basic',
            upgraded_from_trial: 'true'
          }
        });
        
        // Update user's tier in database
        const { data: basicTier } = await supabaseClient
          .from('tiers')
          .select('id')
          .eq('name', 'basic')
          .single();
          
        if (basicTier) {
          await supabaseClient
            .from('profiles')
            .update({
              subscription_tier_id: basicTier.id,
              stripe_subscription_id: newSubscription.id
            })
            .eq('stripe_customer_id', subscription.customer);
        }
        
        upgradedUsers.push({
          customer: subscription.customer,
          oldSubscriptionId: subscription.id,
          newSubscriptionId: newSubscription.id
        });
        
      } catch (error) {
        console.error(`Failed to upgrade subscription ${subscription.id}:`, error);
        errors.push({
          subscriptionId: subscription.id,
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      upgraded: upgradedUsers.length,
      errors: errors.length,
      details: {
        upgradedUsers,
        errors
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in upgrade-trial-users function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});