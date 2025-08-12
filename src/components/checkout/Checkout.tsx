import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useAssets } from '@/context/AssetContext';
import { useAssetSubscriptions } from '@/hooks/useAssetSubscriptions';
import { useStripe } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';

// Define Stripe Price IDs for additional assets
const ADDITIONAL_ASSETS_PRICE_IDS = {
  basic: 'price_1Ri6CHJk8bLGmbLerpTKHQcw', // Replace with your actual price ID for additional assets
  pro: 'price_1Ri6BfJk8bLGmbLeztVohnRv', // Replace with your actual price ID for additional assets
  elite: 'price_1Ri6BIJk8bLGmbLeijuQQTLn', // Replace with your actual price ID for additional assets
};

export function Checkout() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalAdditionalCost, setTotalAdditionalCost] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedAssetIds, selectedAssets } = useAssets();
  const { user } = useAuth();
  const { assetSubscriptions, removeAssetSubscription, saveAssetSubscription } = useAssetSubscriptions();
  const [userTier, setUserTier] = useState<SubscriptionTier>('basic');
  const stripe = useStripe();
  
  // Get subscription details from URL query params or location state
  const searchParams = new URLSearchParams(window.location.search);
  const fromScheduling = location.state?.fromScheduling || false;
  const scheduleItems = location.state?.scheduleItems || [];
  
  // Validate tier value
  const rawTier = searchParams.get('tier') || userTier;
  const tier = (['trial', 'basic', 'pro', 'elite'].includes(rawTier) ? rawTier : 'basic') as SubscriptionTier;
  const isTrialSignup = tier === 'trial';
  const existingAssetCount = fromScheduling 
    ? location.state?.existingAssetCount || 0 
    : Number(searchParams.get('existingAssetCount') || "0");
  const selectedAssetCount = fromScheduling 
    ? location.state?.selectedAssets?.length || 0 
    : Number(searchParams.get('selectedAssetCount') || "0");
  const paidAdditionalAssets = Number(searchParams.get('paidAdditionalAssets') || "0");

  // Calculate actual additional assets needed
  const maxAssets = SUBSCRIPTION_TIERS[tier].maxAssets;
  const totalAssets = existingAssetCount + selectedAssetCount;
  const totalAdditionalAssets = Math.max(0, totalAssets - maxAssets);
  const newAdditionalAssets = Math.max(0, totalAdditionalAssets - paidAdditionalAssets);
  
  // Calculate total cost when component mounts or when dependencies change
  useEffect(() => {
    const additionalAssetPrice = SUBSCRIPTION_TIERS[tier].additionalAssetPrice;
    const cost = newAdditionalAssets * additionalAssetPrice;
    setTotalAdditionalCost(cost);
  }, [tier, newAdditionalAssets]);
  
  // New parameters for asset removal
  const removedAssets = Number(searchParams.get('removedAssets') || "0");
  const previousCost = Number(searchParams.get('previousCost') || "0");
  const newCost = Number(searchParams.get('newCost') || "0");
  const isRemovingOnly = searchParams.get('removingOnly') === 'true';
  
  // Get assets to remove from localStorage if we're only removing assets
  const [assetsToRemove, setAssetsToRemove] = useState<string[]>([]);
  
  useEffect(() => {
    if (isRemovingOnly) {
      const storedAssetsToRemove = localStorage.getItem('assetsToRemove');
      if (storedAssetsToRemove) {
        setAssetsToRemove(JSON.parse(storedAssetsToRemove));
      }
    }
  }, [isRemovingOnly]);
  
  const handleCheckout = async () => {
    if (!stripe || !user) {
      toast({
        title: "Error",
        description: "Unable to process payment. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // If we're only removing assets, handle the removal here
      if (isRemovingOnly && assetsToRemove.length > 0) {
        // Get the current paid additional assets count
        const currentPaidAdditionalAssets = Number(localStorage.getItem('paidAdditionalAssets') || "0");
        
        // Calculate how many additional asset subscriptions to cancel
        const maxAssets = SUBSCRIPTION_TIERS[tier].maxAssets;
        const remainingAssets = existingAssetCount - assetsToRemove.length;
        const remainingAdditionalAssets = Math.max(0, remainingAssets - maxAssets);
        const subscriptionsToCancel = currentPaidAdditionalAssets - remainingAdditionalAssets;

        if (subscriptionsToCancel > 0) {
          // Get the user's active additional asset subscriptions from Stripe
          const { data: subscriptions, error: subscriptionError } = await supabase.functions.invoke(
            'get-additional-asset-subscriptions',
            {
              body: { customerId: user.id }
            }
          );

          if (subscriptionError) throw subscriptionError;

          // Cancel the oldest subscriptions first
          const subscriptionsToRemove = subscriptions.slice(0, subscriptionsToCancel);
          for (const subscription of subscriptionsToRemove) {
            await supabase.functions.invoke(
              'cancel-subscription',
              {
                body: { subscriptionId: subscription.id }
              }
            );
          }

          // Update the paid additional assets count
          localStorage.setItem('paidAdditionalAssets', remainingAdditionalAssets.toString());
        }

        // Remove the assets from our system
        for (const assetId of assetsToRemove) {
          const subscription = assetSubscriptions.find(sub => sub.assetId === assetId);
          if (subscription) {
            await removeAssetSubscription(subscription.id);
          }
        }
        
        localStorage.removeItem('assetsToRemove');
        
        toast({
          title: "Assets removed successfully!",
          description: `Your subscription has been updated.`,
        });
        
        navigate("/dashboard");
        return;
      }

      // Store the selected assets in localStorage for after payment
      if (selectedAssets.length > 0) {
        localStorage.setItem('pendingAssetSubscriptions', JSON.stringify({
          assets: selectedAssets,
          scheduleItems: fromScheduling ? scheduleItems : []
        }));
      }

      // Get the appropriate price ID based on tier
      let priceId: string;
      if (isTrialSignup) {
        // For trial, use the basic plan price ID
        priceId = ADDITIONAL_ASSETS_PRICE_IDS.basic;
      } else {
        // For regular subscriptions, use the tier-specific price ID
        priceId = ADDITIONAL_ASSETS_PRICE_IDS[tier];
      }
      
      if (!priceId) {
        throw new Error(`No price ID found for tier: ${tier}`);
      }

      // Create a checkout session
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-checkout-session',
        {
          body: { 
            priceId,
            quantity: isTrialSignup ? 1 : newAdditionalAssets, // For trial, always quantity 1
            mode: 'subscription',
            trialPeriodDays: isTrialSignup ? 7 : null, // Add 7-day trial for trial signups
            metadata: {
              fromScheduling: fromScheduling.toString(),
              selectedAssetCount: selectedAssetCount.toString(),
              isTrialSignup: isTrialSignup.toString()
            }
          },
        }
      );

      if (checkoutError) throw checkoutError;

      if (checkoutData && checkoutData.sessionId) {
        // Redirect to Stripe Checkout
        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: checkoutData.sessionId,
        });

        if (stripeError) {
          throw stripeError;
        }
      } else {
        throw new Error("Failed to create checkout session");
      }

    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          {isRemovingOnly ? "Update Your Subscription" : 
           isTrialSignup ? "Start Your Free Trial" : "Complete Your Purchase"}
        </h1>
        <p className="text-muted-foreground">
          {isRemovingOnly 
            ? "Review your subscription changes after removing assets" 
            : isTrialSignup
              ? "Start your 7-day free trial with no credit card required"
              : "You've selected more assets than your current plan allows"
          }
        </p>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>
            {isRemovingOnly ? "Order Summary" : 
             isTrialSignup ? "Trial Summary" : "Order Summary"}
          </CardTitle>
          <CardDescription>
            {isRemovingOnly ? "Review your subscription changes" : 
             isTrialSignup ? "Review your free trial details" : "Review your additional assets purchase"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center pb-4 border-b">
            <div>
              <p className="font-medium">{tier.charAt(0).toUpperCase() + tier.slice(1)} Plan</p>
              <p className="text-sm text-muted-foreground">
                {isTrialSignup 
                  ? "7-day free trial, then $19.99/month"
                  : `Includes ${SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS].maxAssets} assets`
                }
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">
                {isTrialSignup ? "Free for 7 days" : `${formatPrice(SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS].price)}/month`}
              </p>
              <p className="text-sm text-muted-foreground">
                {isTrialSignup ? "Then $19.99/month" : "Base plan"}
              </p>
            </div>
          </div>
          
          {isTrialSignup ? (
            <div className="flex justify-between items-center pb-4 border-b">
              <div>
                <p className="font-medium">Trial Period</p>
                <p className="text-sm text-muted-foreground">
                  7 days free, no credit card required
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-600">$0.00</p>
                <p className="text-sm text-muted-foreground">First 7 days</p>
              </div>
            </div>
          ) : isRemovingOnly ? (
            <>
              <div className="flex justify-between items-center pb-4 border-b">
                <div>
                  <p className="font-medium">Previous Additional Assets</p>
                  <p className="text-sm text-muted-foreground">
                    Before removing {removedAssets} asset(s)
                  </p>
                </div>
                <p className="font-medium">{formatPrice(previousCost)}/month</p>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b">
                <div>
                  <p className="font-medium">Updated Additional Assets</p>
                  <p className="text-sm text-muted-foreground">
                    After removing {removedAssets} asset(s)
                  </p>
                </div>
                <p className="font-medium">{formatPrice(newCost)}/month</p>
              </div>
              
              <div className="flex justify-between items-center pt-2 font-medium text-lg">
                <p>Savings</p>
                <p className="text-green-600">{formatPrice(previousCost - newCost)}/month</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center pb-4 border-b">
                <div>
                  <p className="font-medium">Asset Usage</p>
                  <p className="text-sm text-muted-foreground">
                    {existingAssetCount} existing + {selectedAssetCount} new = {existingAssetCount + selectedAssetCount} total
                  </p>
                </div>
                <p className="font-medium">
                  {existingAssetCount + selectedAssetCount} / {SUBSCRIPTION_TIERS[tier].maxAssets}
                </p>
              </div>
              
                              <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <p className="font-medium">Additional Assets</p>
                    <p className="text-sm text-muted-foreground">
                      {paidAdditionalAssets} already paid + {newAdditionalAssets} new = {totalAdditionalAssets} total
                      <br />
                      {newAdditionalAssets} new assets at {formatPrice(SUBSCRIPTION_TIERS[tier].additionalAssetPrice)}/asset
                    </p>
                  </div>
                  <p className="font-medium">{formatPrice(totalAdditionalCost)}/month</p>
                </div>
              
              <div className="flex justify-between items-center pt-2 font-medium text-lg">
                <p>Total Additional Cost</p>
                <p>{formatPrice(totalAdditionalCost)}/month</p>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate(
              isRemovingOnly 
                ? "/dashboard" 
                : fromScheduling 
                  ? "/scheduling" 
                  : "/assets"
            )}
            className="border-gold/20 text-charcoal hover:bg-gold/5"
          >
            {isRemovingOnly 
              ? "Cancel" 
              : fromScheduling 
                ? "Back to Scheduling" 
                : "Back to Selection"
            }
          </Button>
          <Button 
            onClick={handleCheckout}
            className="bg-gold hover:bg-gold-dark text-white"
            disabled={isProcessing}
          >
            {isProcessing ? 
              "Processing..." : 
              isRemovingOnly ? 
                `Confirm Changes` : 
                isTrialSignup ?
                  "Start Free Trial" :
                  `Pay ${formatPrice(totalAdditionalCost)}/week`
            }
          </Button>
        </CardFooter>
      </Card>
      
      <div className="text-center text-sm text-muted-foreground">
        {isTrialSignup ? (
          <>
            <p>Start your 7-day free trial with no credit card required.</p>
            <p>After the trial period, you'll be charged $19.99/month unless you cancel.</p>
            <p className="mt-2 text-green-600 font-medium">
              🎉 No risk - cancel anytime during your trial!
            </p>
          </>
        ) : (
          <>
            <p>This is a demo checkout page. No actual payment will be processed.</p>
            <p>In a production environment, this would connect to a payment processor like Stripe.</p>
            <p className="mt-2 text-blue-600 font-medium">
              💡 Have a coupon code? You can enter it on the payment page!
            </p>
          </>
        )}
      </div>
    </div>
  );
}
