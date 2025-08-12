import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "@/hooks/use-toast";
import { SubscriptionTier, SubscriptionTierDetails } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useStripe } from '@stripe/react-stripe-js';

// Define Stripe Price IDs for plan changes (Monthly only)
const STRIPE_PRICE_IDS = {
  basic: import.meta.env.VITE_STRIPE_INTRO_MONTHLY_PLAN_ID || 'price_1Ri6CHJk8bLGmbLerpTKHQcw',
  pro: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PLAN_ID || 'price_1Ri6BfJk8bLGmbLeztVohnRv',
  elite: import.meta.env.VITE_STRIPE_ELITE_MONTHLY_PLAN_ID || 'price_1Ri6BIJk8bLGmbLeijuQQTLn',
};

export function usePlanChange() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [newTierDetails, setNewTierDetails] = useState<SubscriptionTierDetails | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const stripe = useStripe();
  
  // Extract data from URL params
  const searchParams = new URLSearchParams(location.search);
  const newTierId = searchParams.get('newTierId');
  
  // Fetch tier details
  useEffect(() => {
    const fetchTierDetails = async () => {
      if (!newTierId) {
        toast({
          title: "Missing information",
          description: "Could not load plan details.",
          variant: "destructive"
        });
        navigate('/settings');
        return;
      }
      
      try {
        // Fetch new tier details
        const { data: newTierData, error: newTierError } = await supabase
          .from('tiers')
          .select('*')
          .eq('id', newTierId)
          .single();
          
        if (newTierError) {
          throw new Error("Failed to fetch tier details");
        }
        
        if (newTierData) {
          setNewTierDetails({
            id: newTierData.id,
            name: newTierData.name as SubscriptionTier,
            price: newTierData.price,
            maxAssets: newTierData.max_assets,
            maxReportsPerDay: newTierData.max_reports_per_day,
            additionalAssetPrice: newTierData.additional_asset_price,
            additionalReportPrice: newTierData.additional_report_price
          });
        }
      } catch (error) {
        console.error("Error fetching tier details:", error);
        toast({
          title: "Error loading details",
          description: "Could not load subscription details. Please try again.",
          variant: "destructive"
        });
        navigate('/settings');
      }
    };
    
    fetchTierDetails();
  }, [newTierId, navigate]);
  
  const handleConfirm = async () => {
    if (!user || !newTierId || !newTierDetails || !stripe) {
      toast({
        title: "Error",
        description: "Missing required information. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Get the Stripe Price ID for the new tier
      const stripePriceId = STRIPE_PRICE_IDS[newTierDetails.name as keyof typeof STRIPE_PRICE_IDS];
      if (!stripePriceId) {
        throw new Error(`Stripe Price ID not found for tier: ${newTierDetails.name}`);
      }

      // Get the user's current subscription info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('stripe_subscription_id')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;

      // For existing subscribers: cancel current subscription and create new checkout
      if (profile?.stripe_subscription_id) {
        // Try to cancel the existing subscription, but don't fail if it errors
        try {
          const { error: cancelError } = await supabase.functions.invoke(
            'cancel-subscription',
            {
              body: { 
                subscriptionId: profile.stripe_subscription_id
              },
            }
          );

          if (cancelError) {
            console.warn('Warning canceling subscription:', cancelError);
            // Log the warning but continue with the flow
          }
        } catch (error) {
          console.warn('Failed to cancel existing subscription, continuing anyway:', error);
          // Continue with the flow even if cancellation fails
        }

        // Clear the old subscription ID from the profile regardless of cancellation result
        try {
          await supabase
            .from('profiles')
            .update({ 
              stripe_subscription_id: null
            })
            .eq('id', user.id);
        } catch (error) {
          console.warn('Failed to clear subscription ID, continuing anyway:', error);
          // Continue with the flow
        }
      }

      // For all users (existing and new): create a new checkout session
      // Update user's subscription tier in Supabase (will be confirmed by webhook)
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier_id: newTierId
        })
        .eq('id', user.id);
      
      if (profileUpdateError) throw profileUpdateError;

      // Create a new checkout session for the new plan
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-checkout-session',
        {
          body: { 
            priceId: stripePriceId,
            mode: 'subscription',
            successUrl: `${window.location.origin}/settings?subscription_updated=true`,
            cancelUrl: `${window.location.origin}/settings?subscription_cancelled=true`
          },
        }
      );

      if (checkoutError) throw checkoutError;

      if (checkoutData && checkoutData.sessionId) {
        // Redirect to Stripe Checkout for payment
        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: checkoutData.sessionId,
        });
        
        if (stripeError) {
          console.error("Stripe redirectToCheckout error:", stripeError);
          toast({ 
            title: "Checkout Error", 
            description: stripeError.message || "Could not redirect to payment.", 
            variant: "destructive" 
          });
        }
      } else {
        throw new Error("Failed to create Stripe checkout session.");
      }

    } catch (error: any) {
      console.error('Error updating subscription:', error);
      
      // Provide more detailed error information
      let errorMessage = "Please try again later.";
      let errorTitle = "Failed to update subscription";
      
      if (error.message?.includes('create-checkout-session')) {
        errorTitle = "Checkout Error";
        errorMessage = "There was an issue creating the payment session. Please check your internet connection and try again.";
      } else if (error.message?.includes('cancel-subscription')) {
        errorTitle = "Cancellation Error";
        errorMessage = "There was an issue canceling your current subscription. Please contact support.";
      } else if (error.message?.includes('Stripe Price ID not found')) {
        errorTitle = "Configuration Error";
        errorMessage = "There was a configuration issue with the selected plan. Please contact support.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      
      // Log detailed error for debugging
      console.error('Detailed error info:', {
        error: error,
        userId: user?.id,
        newTierId,
        newTierName: newTierDetails?.name,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    newTierDetails,
    handleConfirm
  };
}
