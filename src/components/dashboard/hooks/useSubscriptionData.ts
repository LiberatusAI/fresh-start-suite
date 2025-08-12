import { useState, useEffect } from 'react';
import { SubscriptionTier, SubscriptionTierDetails } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SUBSCRIPTION_TIERS } from '@/types';

export function useSubscriptionData() {
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionTier | null>(null);
  const [tierDetails, setTierDetails] = useState<SubscriptionTierDetails | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const { user } = useAuth();

  // Fetch user subscription data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            subscription_tier_id,
            is_trial_user,
            trial_end_date,
            tiers:subscription_tier_id (
              id,
              name,
              price,
              max_assets,
              max_reports_per_day,
              additional_asset_price,
              additional_report_price
            )
          `)
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data && data.subscription_tier_id && data.tiers) {
          // Only set subscription if user has a valid tier
          const tierName = data.tiers.name;
          setCurrentSubscription(tierName as SubscriptionTier);
          
          setTierDetails({
            id: data.tiers.id,
            name: data.tiers.name as SubscriptionTier,
            price: data.tiers.price,
            maxAssets: data.tiers.max_assets,
            maxReportsPerDay: data.tiers.max_reports_per_day,
            additionalAssetPrice: data.tiers.additional_asset_price,
            additionalReportPrice: data.tiers.additional_report_price
          });
        } else {
          // User doesn't have a subscription tier
          setCurrentSubscription(null);
          setTierDetails(null);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setCurrentSubscription(null);
        setTierDetails(null);
      } finally {
        setIsLoadingSubscription(false);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  const getMaxReportsPerDay = () => {
    if (tierDetails) {
      return tierDetails.maxReportsPerDay;
    }
    if (currentSubscription && SUBSCRIPTION_TIERS[currentSubscription]) {
      return SUBSCRIPTION_TIERS[currentSubscription].maxReportsPerDay;
    }
    return 0; // No subscription
  };

  return {
    currentSubscription,
    tierDetails,
    isLoadingSubscription,
    getMaxReportsPerDay
  };
}
