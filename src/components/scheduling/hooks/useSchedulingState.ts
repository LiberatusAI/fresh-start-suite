import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { useAssets } from '@/context/AssetContext';
import { useAssetSubscriptions } from '@/hooks/useAssetSubscriptions';
import { CryptoAsset, SubscriptionTier } from '@/types';
import { TIME_OPTIONS } from '@/components/dashboard/constants';
import { supabase } from '@/integrations/supabase/client';
import { calculateAdditionalAssets } from '@/components/assets/utils/assetUtils';
import { convertLocalTimeToUTC, convertUTCTimeToLocal } from '@/utils/timezoneUtils';
import { getSignupFlow } from '@/utils/featureFlags';
import { logger } from '@/utils/logger';

/**
 * Determines where to navigate after successful scheduling completion
 */
const determineSchedulingCompletionDestination = (
  userTier: SubscriptionTier | null,
  isFirstTimeUser?: boolean,
  fromSignup?: boolean
): string => {
  const signupFlow = getSignupFlow();
  
  // For value-first flow: first-time trial users go to plan selection
  if (signupFlow === 'value-first' && 
      userTier === 'trial' && 
      (isFirstTimeUser || fromSignup)) {
    return '/plan-selection';
  }
  
  // All other cases: existing behavior (dashboard)
  return '/dashboard';
};

type ScheduleItem = {
  assetId: string;
  days: string;
};

export function useSchedulingState(fromDashboard = false) {
  const { selectedAssets } = useAssets();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [globalReportTime, setGlobalReportTime] = useState<string>("09:00");
  const [isLoading, setIsLoading] = useState(false);
  const [userTier, setUserTier] = useState<SubscriptionTier | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { saveAssetSubscription } = useAssetSubscriptions();

  // Initialize schedule items when selectedAssets change
  useEffect(() => {
    if (selectedAssets.length > 0) {
      setScheduleItems(
        selectedAssets.map(asset => ({
          assetId: asset.id,
          days: "daily", // Always set to daily
        }))
      );
    }
  }, [selectedAssets]);

  // Fetch user's global report time
  useEffect(() => {
    const fetchGlobalReportTime = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('global_report_time')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data && data.global_report_time) {
          setGlobalReportTime(convertUTCTimeToLocal(data.global_report_time));
        }
      } catch (error) {
        console.error("Error fetching global report time:", error);
      }
    };
    
    fetchGlobalReportTime();
  }, [user]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            subscription_tier_id,
            tiers:subscription_tier_id (
              name
            )
          `)
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data && data.subscription_tier_id && data.tiers) {
          // User has a valid subscription tier
          const tierName = data.tiers.name;
          setUserTier(tierName as SubscriptionTier);
        } else {
          // User doesn't have a subscription, redirect to subscription selection
          navigate('/subscription');
          return;
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        navigate('/subscription');
        return;
      } finally {
        setIsLoadingUserData(false);
      }
    };
    
    fetchUserProfile();
  }, [user, navigate]);

  const handleGlobalTimeChange = (newTime: string) => {
    setGlobalReportTime(newTime);
  };

  const handleSubmit = async () => {
    if (!userTier) {
      // User doesn't have a subscription tier, redirect to subscription
      navigate('/subscription');
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if user needs to upgrade for additional assets
      const { data: existingSubscriptions } = await supabase
        .from('asset_subscriptions')
        .select('asset_slug')
        .eq('user_id', user?.id);

      const existingAssetCount = existingSubscriptions?.length || 0;
      
      // Filter out assets that are already in subscriptions
      const existingAssetSlugs = existingSubscriptions?.map(sub => sub.asset_slug) || [];
      const newAssets = selectedAssets.filter(asset => !existingAssetSlugs.includes(asset.slug));
      
      const additionalAssets = calculateAdditionalAssets(
        newAssets.length, // Only count new assets
        existingAssetCount,
        userTier
      );

      if (additionalAssets > 0) {
        // For value-first flow: first-time trial users go to plan selection
        const destination = determineSchedulingCompletionDestination(
          userTier,
          location.state?.isFirstTimeUser,
          location.state?.fromSignup
        );
        
        if (destination === '/plan-selection') {
          // Save scheduling data before navigating to plan selection
          const schedulingData = {
            scheduleItems,
            globalReportTime
          };
          
          logger.onboardingStep('assets-exceed-trial-limit', {
            selectedAssets: selectedAssets.length,
            trialLimit: 1,
            redirectTo: 'plan-selection'
          }, user?.id);
          
          navigate('/plan-selection', {
            state: {
              selectedAssets,
              schedulingData,
              isFirstTimeUser: true,
              enableAssetAdjustment: true,
              completedSetup: true,
              exceededTrialLimit: true
            }
          });
        } else {
          // Existing behavior: Navigate to checkout for paid users
          navigate('/checkout', {
            state: {
              selectedAssets: newAssets,
              scheduleItems: scheduleItems.filter(item => 
                newAssets.some(asset => asset.id === item.assetId)
              ),
              existingAssetCount,
              fromScheduling: true
            },
            search: new URLSearchParams({
              tier: userTier
            }).toString()
          });
        }
        return;
      }

      // Save the global report time to user profile (convert to UTC)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ global_report_time: convertLocalTimeToUTC(globalReportTime) })
        .eq('id', user?.id);

      if (profileError) {
        console.error("Error saving global report time:", profileError);
      }

      // If no additional assets needed, proceed with saving
      for (const item of scheduleItems) {
        const asset = getAssetById(item.assetId);
        if (asset) {
          await saveAssetSubscription(asset, [globalReportTime], item.days);
        }
      }
      
      toast({
        title: "Schedule settings saved!",
        description: "Your report schedules have been set successfully.",
      });
      
      // Determine navigation destination based on user flow and state
      const destination = determineSchedulingCompletionDestination(
        userTier,
        location.state?.isFirstTimeUser,
        location.state?.fromSignup
      );
      
      logger.onboardingStep('scheduling-complete', {
        userTier,
        isFirstTimeUser: location.state?.isFirstTimeUser,
        destination,
        assetCount: selectedAssets.length
      }, user?.id);
      
      if (destination === '/plan-selection') {
        // Route to plan selection with full context
        navigate('/plan-selection', {
          state: {
            selectedAssets,
            schedulingData: {
              scheduleItems,
              globalReportTime
            },
            isFirstTimeUser: true,
            enableAssetAdjustment: true,
            completedSetup: true
          }
        });
      } else {
        // Navigate to dashboard (existing behavior)
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Scheduling error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAssetById = (id: string) => {
    return selectedAssets.find(asset => asset.id === id);
  };

  return {
    selectedAssets,
    scheduleItems,
    globalReportTime,
    isLoading,
    userTier,
    isLoadingUserData,
    getAssetById,
    handleGlobalTimeChange,
    handleSubmit
  };
}
