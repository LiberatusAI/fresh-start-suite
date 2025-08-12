import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.1.1';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
serve(async (req)=>{
  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('No signature', {
        status: 400
      });
    }
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET');
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      return new Response(`Webhook Error: ${err.message}`, {
        status: 400
      });
    }
    switch(event.type){
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        console.log('Processing subscription event:', event.type, subscription.id);
        
        // Get the price ID from the subscription
        const priceId = subscription.items?.data?.[0]?.price?.id;
        console.log('Subscription price ID:', priceId);
        
        if (priceId) {
          // Look up the tier by Stripe price ID
          const { data: tierData, error: tierError } = await supabase
            .from('tiers')
            .select('id')
            .eq('stripe_price_id_monthly', priceId)
            .single();
            
          if (tierError) {
            console.error('Error fetching tier by price ID:', priceId, tierError);
          } else {
            console.log('Found tier for price ID:', priceId, tierData.id);
            
            // Update user profile with subscription and tier info
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                stripe_subscription_id: subscription.id,
                stripe_customer_id: subscription.customer,
                subscription_tier_id: tierData.id
              })
              .eq('stripe_customer_id', subscription.customer);
              
            if (updateError) {
              console.error('Error updating profile:', updateError);
            } else {
              console.log('Successfully updated profile for customer:', subscription.customer);
            }
          }
        } else {
          // Fallback: just update subscription info without tier
          await supabase.from('profiles').update({
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer
          }).eq('stripe_customer_id', subscription.customer);
        }
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        console.log('Processing subscription deletion:', deletedSubscription.id);
        
        // Get trial tier ID for downgrade
        const { data: trialTier } = await supabase
          .from('tiers')
          .select('id')
          .eq('name', 'trial')
          .single();
          
        await supabase.from('profiles').update({
          stripe_subscription_id: null,
          subscription_tier_id: trialTier?.id || null
        }).eq('stripe_customer_id', deletedSubscription.customer);
        
        console.log('Downgraded user to trial tier for customer:', deletedSubscription.customer);
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        console.log('Processing payment failure for invoice:', failedInvoice.id);
        
        // Strict approach: Immediate downgrade to free tier
        if (failedInvoice.billing_reason === 'subscription_cycle') {
          // Get free tier
          const { data: freeTier, error: freeTierError } = await supabase
            .from('tiers')
            .select('id')
            .eq('name', 'free')
            .single();
          
          if (freeTierError) {
            console.error('Failed to fetch free tier:', freeTierError);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch free tier', details: freeTierError.message }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
          }
          
          if (freeTier) {
            await supabase.from('profiles').update({
              subscription_tier_id: freeTier.id,
              stripe_subscription_id: null,
              payment_status: 'failed'
            }).eq('stripe_customer_id', failedInvoice.customer);
            
            console.log('Downgraded to free tier due to payment failure:', failedInvoice.customer);
          }
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('Processing payment intent failure:', failedPayment.id);
        
        // Log failure but don't change user tier
        // User remains on trial and can retry payment
        console.log('Payment intent failed for customer:', failedPayment.customer, '- user can retry');
        break;
        
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Processing checkout session:', session.id);
        
        // Check if this is a request purchase (not a subscription)
        if (session.metadata?.type === 'request_purchase') {
          const userId = session.metadata.user_id;
          const requestsPurchased = parseInt(session.metadata.requests);
          
          console.log(`Processing request purchase: ${requestsPurchased} requests for user ${userId}`);
          
          try {
            // Record the purchase
            const { error: purchaseError } = await supabase
              .from('request_purchases')
              .insert({
                user_id: userId,
                stripe_payment_intent_id: session.payment_intent,
                requests_purchased: requestsPurchased,
                amount_paid: session.amount_total / 100, // Convert from cents
                status: 'completed'
              });
              
            if (purchaseError) {
              console.error('Error recording purchase:', purchaseError);
              throw purchaseError;
            }
            
            // Add requests to user's balance
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('purchased_requests')
              .eq('id', userId)
              .single();
              
            if (profileError) {
              console.error('Error fetching profile:', profileError);
              throw profileError;
            }
            
            const currentRequests = profile.purchased_requests || 0;
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ purchased_requests: currentRequests + requestsPurchased })
              .eq('id', userId);
              
            if (updateError) {
              console.error('Error updating purchased requests:', updateError);
              throw updateError;
            }
            
            console.log(`Successfully added ${requestsPurchased} requests to user ${userId}. New total: ${currentRequests + requestsPurchased}`);
          } catch (error) {
            console.error('Failed to process request purchase:', error);
            // Stripe will retry the webhook if we return an error
            return new Response('Error processing request purchase', { status: 500 });
          }
        }
        break;
        
    }
    return new Response(JSON.stringify({
      received: true
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
