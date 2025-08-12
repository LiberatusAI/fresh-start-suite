import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlanSelectionCards } from '@/components/subscription/PlanSelectionCards';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { SubscriptionTier, CryptoAsset } from '@/types';
import { logger } from '@/utils/logger';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { enforceAssetLimits, AssetLimitCheck } from '@/utils/assetLimitEnforcement';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const PlanSelection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assetLimitModal, setAssetLimitModal] = useState<{
    isOpen: boolean;
    limitInfo?: AssetLimitCheck;
  }>({ isOpen: false });
  
  const { 
    selectedAssets, 
    schedulingData,
    isFirstTimeUser, 
    enableAssetAdjustment,
    completedSetup 
  } = location.state || {};
  
  const assetCount = selectedAssets?.length || 0;
  
  // Smart tier recommendation based on asset count
  const getRecommendedTier = (count: number) => {
    if (count <= 1) return 'trial';
    if (count <= 5) return 'basic';
    if (count <= 20) return 'pro';
    return 'elite';
  };
  
  const recommendedTier = getRecommendedTier(assetCount);
  
  // Log plan selection page view
  React.useEffect(() => {
    logger.planRecommendation(recommendedTier, assetCount, user?.id);
    logger.onboardingStep('plan-selection-viewed', {
      assetCount,
      recommendedTier,
      completedSetup
    }, user?.id);
  }, [assetCount, recommendedTier, completedSetup, user?.id]);
  
  // Create Stripe checkout session directly
  const createStripeCheckout = async (tier: SubscriptionTier, assets: CryptoAsset[]) => {
    try {
      logger.onboardingStep('creating-stripe-session', { tier, assetCount: assets.length }, user?.id);
      
      // For first-time users, create a regular subscription checkout
      const { data, error } = await supabase.functions.invoke('create-signup-checkout', {
        body: {
          userId: user?.id,
          tier,
          email: user?.email,
          firstName: user?.user_metadata?.firstName || '',
          lastName: user?.user_metadata?.lastName || '',
        }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        logger.stripeOperation('create-checkout-session', true, data.sessionId, undefined, user?.id);
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error: any) {
      logger.stripeOperation('create-checkout-session', false, undefined, error, user?.id);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handlePlanSelect = async (tier: SubscriptionTier) => {
    logger.onboardingStep('plan-selected', { 
      selectedTier: tier, 
      recommendedTier,
      assetCount 
    }, user?.id);
    
    // All plans (including trial) now go through Stripe checkout
    logger.onboardingStep('proceed-to-stripe-checkout', { 
      selectedTier: tier,
      assetCount,
      isFirstTimeUser,
      isTrial: tier === 'trial'
    }, user?.id);
    
    // Create Stripe checkout session for all tiers
    createStripeCheckout(tier, selectedAssets);
  };
  
  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] py-12">
        <div className="max-w-6xl mx-auto px-4">
          
          {/* Setup completion celebration + asset-based contextual header */}
          <div className="text-center mb-12">
            {completedSetup && (
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 dark:bg-green-500/10 rounded-full mb-6">
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-4xl font-bold mb-3 text-foreground">
                  🎉 You're all set up!
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  You've selected {assetCount} asset{assetCount !== 1 ? 's' : ''} and configured your report schedule.
                  <br />Now just choose a plan to activate your personalized crypto reports.
                </p>
              </div>
            )}
            
            {!completedSetup && (
              <div className="mb-4">
                <h1 className="text-3xl font-bold mb-2">
                  Choose Your Plan
                </h1>
                <p className="text-lg text-muted-foreground mb-4">
                  Based on your {assetCount} selected asset{assetCount !== 1 ? 's' : ''}, 
                  here's what we recommend:
                </p>
              </div>
            )}
            
            {assetCount > 5 && (
              <p className="text-sm text-blue-600 dark:text-blue-400">
                💡 You can adjust your asset selection below if you prefer a lower-cost plan
              </p>
            )}
          </div>
          
          {/* Enhanced pricing display with recommendations */}
          <PlanSelectionCards 
            selectedPlan={recommendedTier}
            onPlanSelect={handlePlanSelect}
            recommendedTier={recommendedTier}
            assetCount={assetCount}
          />
          
          {/* Asset adjustment option */}
          {enableAssetAdjustment && assetCount > 1 && (
            <div className="mt-8 max-w-2xl mx-auto bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Want a different plan?</h3>
              
              <div className="space-y-3 text-sm text-blue-700 dark:text-blue-300 mb-4">
                {assetCount > 20 && (
                  <p>• <strong>Pro Plan ($49.99):</strong> Keep up to 20 of your selected assets</p>
                )}
                {assetCount > 5 && (
                  <p>• <strong>Basic Plan ($19.99):</strong> Keep up to 5 of your selected assets</p>
                )}
                <p>• <strong>Free Trial:</strong> Keep 1 asset for 7 days, no payment required</p>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  logger.onboardingStep('adjust-assets-clicked', { 
                    currentAssetCount: assetCount 
                  }, user?.id);
                  navigate('/assets', { 
                    state: { 
                      selectedAssets, 
                      allowDeselection: true,
                      returnToPlans: true 
                    } 
                  });
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go back and adjust your asset selection
              </Button>
            </div>
          )}
          
          {/* Trial continuation for hesitant users */}
          {isFirstTimeUser && assetCount > 1 && (
            <div className="mt-6 text-center border-t dark:border-gray-700 pt-6">
              <p className="text-muted-foreground mb-4">
                Not ready to choose? Start with a <strong>free 7-day trial</strong> of your first asset.
              </p>
              <Button 
                variant="ghost"
                onClick={() => {
                  logger.onboardingStep('trial-fallback-selected', { 
                    originalAssetCount: assetCount 
                  }, user?.id);
                  navigate('/dashboard', { 
                    state: { 
                      selectedAssets: [selectedAssets[0]], // Just take the first asset
                      startedTrial: true 
                    } 
                  });
                }}
              >
                Start free trial with "{selectedAssets?.[0]?.name || 'first asset'}"
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Asset Limit Enforcement Modal */}
      <Dialog open={assetLimitModal.isOpen} onOpenChange={(open) => setAssetLimitModal({ isOpen: open })}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-xl text-center">Trial Account Set Up!</DialogTitle>
            <DialogDescription className="text-center pt-2">
              {assetLimitModal.limitInfo && (
                <>
                  Trial accounts are limited to {assetLimitModal.limitInfo.maxAllowed} asset.
                  <br />
                  We've kept <strong>{assetLimitModal.limitInfo.keptAssets[0]}</strong> for you to get started.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-sm">
              <p className="text-blue-700 dark:text-blue-300">
                💡 <strong>Want to track more assets?</strong>
                <br />
                Upgrade to a paid plan anytime from your dashboard to add more cryptocurrency assets.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={async () => {
                try {
                  // Actually enforce the asset limits in the database
                  await enforceAssetLimits(user?.id);
                  
                  logger.onboardingStep('trial-continuation-completed', { 
                    assetCount: 1 
                  }, user?.id);
                  setAssetLimitModal({ isOpen: false });
                  navigate('/dashboard', { 
                    state: { 
                      startedTrial: true 
                    } 
                  });
                } catch (error) {
                  console.error('Error enforcing limits:', error);
                  // Still navigate even if enforcement fails
                  setAssetLimitModal({ isOpen: false });
                  navigate('/dashboard', { 
                    state: { 
                      startedTrial: true 
                    } 
                  });
                }
              }}
              className="w-full"
            >
              Continue to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default PlanSelection;