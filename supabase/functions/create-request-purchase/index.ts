import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno'

// Debug logging (same as other functions)
console.log('STRIPE_SECRET_KEY exists:', !!Deno.env.get('STRIPE_SECRET_KEY'))
console.log('STRIPE_SECRET_KEY prefix:', Deno.env.get('STRIPE_SECRET_KEY')?.substring(0, 7))

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16'
})

const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:8080'

// Define request packages with Stripe price IDs (one-time purchases)
const REQUEST_PACKAGES = [
  { requests: 50, price: 499, stripePriceId: 'price_1RtGWQJk8bLGmbLe6jjeEuOH' },
  { requests: 100, price: 899, stripePriceId: 'price_1RtGVXJk8bLGmbLeKQsoxxc0' },
  { requests: 250, price: 1999, stripePriceId: 'price_1RtGTOJk8bLGmbLefPzR1Fen' },
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Decode JWT to get user info
    let userId: string
    try {
      const parts = token.split('.')
      const payload = JSON.parse(atob(parts[1]))
      userId = payload.sub
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { packageId } = await req.json()
    
    // Find the selected package
    const selectedPackage = REQUEST_PACKAGES.find(pkg => 
      pkg.stripePriceId === packageId || pkg.requests === packageId
    )
    
    if (!selectedPackage) {
      return new Response(
        JSON.stringify({ error: 'Invalid package selected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: selectedPackage.stripePriceId,
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${FRONTEND_URL}/dashboard?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/dashboard?purchase=cancelled`,
      metadata: {
        user_id: userId,
        requests: selectedPackage.requests.toString(),
        type: 'request_purchase'
      },
    })

    // Return the checkout session URL
    return new Response(
      JSON.stringify({ 
        sessionUrl: session.url,
        sessionId: session.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create checkout session',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})