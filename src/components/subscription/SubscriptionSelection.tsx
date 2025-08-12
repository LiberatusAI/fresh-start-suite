import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SubscriptionTier, SubscriptionTierDetails } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useStripe } from '@stripe/react-stripe-js';

// Define your Stripe Price IDs (Monthly only)
const STRIPE_PRICE_IDS = {
  basic: import.meta.env.VITE_STRIPE_INTRO_MONTHLY_PLAN_ID || 'price_1Ri6CHJk8bLGmbLerpTKHQcw',
  pro: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PLAN_ID || 'price_1Ri6BfJk8bLGmbLeztVohnRv',
  elite: import.meta.env.VITE_STRIPE_ELITE_MONTHLY_PLAN_ID || 'price_1Ri6BIJk8bLGmbLeijuQQTLn',
};

export function SubscriptionSelection() {
  const [tiers, setTiers] = useState<SubscriptionTierDetails[]>([]);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTiers, setIsLoadingTiers] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const stripe = useStripe();

  // Fetch all tiers from the database
  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const { data, error } = await supabase
          .from('tiers')
          .select('*')
          .order('price', { ascending: true });
        
        if (error) throw error;
        
        if (data) {
          const formattedTiers = data.map(tier => ({
            id: tier.id,
            name: tier.name as SubscriptionTier,
            price: tier.price,
            maxAssets: tier.max_assets,
            maxReportsPerDay: tier.max_reports_per_day,
            additionalAssetPrice: tier.additional_asset_price,
            additionalReportPrice: tier.additional_report_price
          }));
          
          setTiers(formattedTiers);
        }
      } catch (error) {
        console.error('Error fetching tiers:', error);
        toast({
          title: "Error fetching subscription tiers",
          description: "Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingTiers(false);
      }
    };
    
    fetchTiers();
  }, []);

  const handleSelectTier = (tier: SubscriptionTier, tierId: string) => {
    setSelectedTier(tier);
    setSelectedTierId(tierId);
    setShowConfirmDialog(true);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedTier || !selectedTierId || !user || !stripe) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 1. Update the user's subscription tier in Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier_id: selectedTierId
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;
      
      // 2. Get the Stripe Price ID for the selected tier
      const stripePriceId = STRIPE_PRICE_IDS[selectedTier];
      if (!stripePriceId) {
        throw new Error(`Stripe Price ID not found for tier: ${selectedTier}`);
      }

      // 3. Invoke the Supabase Function to create a Stripe Checkout Session
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-checkout-session', // Ensure this is your exact function name
        {
          body: { 
            priceId: stripePriceId,
            couponId: 'your_coupon_id_here', // Add this line to automatically apply a coupon
            trialPeriodDays: selectedTier === 'basic' ? 7 : null // Add 7-day trial for basic tier
          }, // userId is handled by the function via auth token
        }
      );

      if (checkoutError) throw checkoutError;

      if (checkoutData && checkoutData.sessionId) {
        // 4. Redirect to Stripe Checkout
        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: checkoutData.sessionId,
        });
        if (stripeError) {
          console.error("Stripe redirectToCheckout error:", stripeError);
          toast({ title: "Checkout Error", description: stripeError.message || "Could not redirect to payment.", variant: "destructive" });
        }
        // If redirectToCheckout is successful, the user is navigated away, so no further action here.
        // If it fails, the toast above is shown.
      } else {
        throw new Error("Failed to get Stripe checkout session ID.");
      }

      // Don't navigate to /assets here, Stripe redirect handles it or errors out.
      // setShowConfirmDialog(false); // Dialog will close if redirect is successful

    } catch (error: any) {
      console.error("Subscription/Checkout error:", error);
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Ensure loading state is reset on error or if redirect fails
    }
  };

  if (isLoadingTiers) {
    return (
      <div className="w-full max-w-5xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Loading subscription options...</p>
      </div>
    );
  }

  const basicTier = tiers.find(t => t.name === 'basic');
  const proTier = tiers.find(t => t.name === 'pro');
  const eliteTier = tiers.find(t => t.name === 'elite');

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-2 text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Choose Your Subscription</h1>
        <p className="text-muted-foreground text-base sm:text-lg">
          Select a plan that works for your crypto reporting needs
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8">
        {/* Basic Tier */}
        {basicTier && (
          <Card className="relative overflow-hidden border-gold/20 transition-all duration-300 hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
            <div className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold">Basic</h2>
              <div className="mt-4 mb-6">
                <span className="text-2xl sm:text-3xl font-bold">${basicTier.price}</span>
                <span className="text-muted-foreground ml-1">/ month</span>
              </div>
              
              <ul className="space-y-3 mb-6 sm:mb-8">
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">Track <strong>{basicTier.maxAssets} asset</strong></span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">Receive <strong>{basicTier.maxReportsPerDay} report</strong> per day</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">Additional assets at <strong>${basicTier.additionalAssetPrice}</strong> each</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">Choose your preferred report time</span>
                </li>
              </ul>
              
              <Button 
                onClick={() => handleSelectTier('basic', basicTier.id)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm sm:text-base py-2 sm:py-3"
              >
                Select Basic
              </Button>
            </div>
          </Card>
        )}
        
        {/* Pro Tier */}
        {proTier && (
          <Card className="relative overflow-hidden border-gold/20 transition-all duration-300 hover:shadow-md lg:transform lg:scale-105">
            <div className="absolute top-0 left-0 w-full h-2 bg-gold"></div>
            <div className="absolute top-0 right-0 bg-gold text-white px-3 py-1 text-xs sm:text-sm font-semibold">
              POPULAR
            </div>
            <div className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold">Pro</h2>
              <div className="mt-4 mb-6">
                <span className="text-2xl sm:text-3xl font-bold">${proTier.price}</span>
                <span className="text-muted-foreground ml-1">/ month</span>
              </div>
              
              <ul className="space-y-3 mb-6 sm:mb-8">
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">Track up to <strong>{proTier.maxAssets} assets</strong></span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">Receive <strong>{proTier.maxReportsPerDay} reports</strong> per day</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">Additional assets at <strong>${proTier.additionalAssetPrice}</strong> each</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">Advanced analytics</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">Multiple report times per day</span>
                </li>
              </ul>
              
              <Button 
                onClick={() => handleSelectTier('pro', proTier.id)}
                className="w-full bg-gold hover:bg-gold-dark text-white text-sm sm:text-base py-2 sm:py-3"
              >
                Select Pro
              </Button>
            </div>
          </Card>
        )}
        
        {/* Institutional Tier */}
        {eliteTier && (
          <Card className="relative overflow-hidden border-gold/20 transition-all duration-300 hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-2 bg-purple-600"></div>
            <div className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold">Elite</h2>
              <div className="mt-4 mb-6">
                <span className="text-2xl sm:text-3xl font-bold">${eliteTier.price}</span>
                <span className="text-muted-foreground ml-1">/ month</span>
              </div>
              
              <ul className="space-y-3 mb-6 sm:mb-8">
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">Track <strong>all available assets</strong></span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">Up to <strong>{eliteTier.maxReportsPerDay} reports</strong> per day (1 per hour)</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">On-demand reports at <strong>${eliteTier.additionalReportPrice}</strong> per report</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">Advanced analytics</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">Dedicated support</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mr-3 mt-0.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-sm sm:text-base">API access</span>
                </li>
              </ul>
              
              <Button 
                onClick={() => handleSelectTier('elite', eliteTier.id)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm sm:text-base py-2 sm:py-3"
              >
                Select Elite
              </Button>
            </div>
          </Card>
        )}
      </div>
      
      <div className="text-center text-muted-foreground text-xs sm:text-sm px-4">
        <p>All plans include daily reports, email delivery, and mobile app access.</p>
        <p className="mt-1">Payment processing is for demonstration purposes only.</p>
        <p className="mt-2 text-blue-600 font-medium">
          💡 Have a coupon code? You can enter it on the payment page!
        </p>
      </div>
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Subscription</DialogTitle>
            <DialogDescription>
              {selectedTier && (
                selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1) + " plan selected."
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm sm:text-base">Would you like to proceed with this subscription?</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Note: This is a mock payment system for demonstration purposes.
            </p>
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubscription}
              className={`w-full sm:w-auto ${selectedTier === 'basic' 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : selectedTier === 'pro' 
                  ? 'bg-gold hover:bg-gold-dark text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Confirm Subscription"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
