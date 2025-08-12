import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { CryptoAsset, SubscriptionTier, SUBSCRIPTION_TIERS } from '@/types';
import { AssetSubscription } from '@/hooks/useAssetSubscriptions';
import { saveAssetSubscriptionToDb, removeAssetSubscriptionFromDb } from '@/utils/assetSubscriptionUtils';
import { useAuth } from '@/context/AuthContext';
import { convertLocalTimeToUTC, convertUTCTimeToLocal } from '@/utils/timezoneUtils';
import { supabase } from '@/integrations/supabase/client';

interface UseAssetSelectionSubmitProps {
  selectedAssets: CryptoAsset[];
  assetsToRemove: string[];
  existingAssetCount: number;
  userTier: SubscriptionTier;
  assetSubscriptions: AssetSubscription[];
  removeAssetSubscription: (assetId: string) => Promise<boolean>;
  calculateNewBilling: () => { totalCost: number; additionalAssets: number };
  setSelectedAssetIds: (ids: string[]) => void;
  setContextSelectedAssets: (assets: CryptoAsset[]) => void;
  navigationFromDashboard: boolean;
  // New props for first-time user handling
  isFirstTimeUser?: boolean;
  selectedReportTime?: string;
}

export const useAssetSelectionSubmit = ({
  selectedAssets,
  assetsToRemove,
  existingAssetCount,
  userTier,
  assetSubscriptions,
  removeAssetSubscription,
  calculateNewBilling,
  setSelectedAssetIds,
  setContextSelectedAssets,
  navigationFromDashboard,
  isFirstTimeUser = false,
  selectedReportTime = '09:00'
}: UseAssetSelectionSubmitProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save assets",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Separate truly new assets from already tracked ones
      const newAssets = selectedAssets.filter(asset => 
        !assetSubscriptions.some(sub => sub.assetId === asset.id)
      );

      const assetsToDelete = [
        ...assetsToRemove,
        // Include selected assets that are already tracked
        ...selectedAssets
          .filter(asset => assetSubscriptions.some(sub => sub.assetId === asset.id))
          .map(asset => asset.id)
      ];

      // Handle all removals first
      for (const assetId of assetsToDelete) {
        const subscription = assetSubscriptions.find(sub => sub.assetId === assetId);
        if (subscription) {
          await removeAssetSubscription(subscription.id);
        }
      }

      // Calculate if we need to go to checkout after removals
      const remainingAssetCount = existingAssetCount - assetsToDelete.length + newAssets.length;
      const maxAssets = SUBSCRIPTION_TIERS[userTier].maxAssets;
      const additionalAssets = Math.max(0, remainingAssetCount - maxAssets);
      const additionalAssetPrice = SUBSCRIPTION_TIERS[userTier].additionalAssetPrice;
      const totalCost = additionalAssets * additionalAssetPrice;

      // If only removing assets or reselecting tracked assets
      if (newAssets.length === 0) {
        if (additionalAssets > 0) {
          // Still over limit after removals, go to checkout
          navigate('/checkout', {
            search: new URLSearchParams({
              removingOnly: 'true',
              tier: userTier,
              existingAssetCount: remainingAssetCount.toString(),
              removedAssets: assetsToDelete.length.toString(),
              totalCost: totalCost.toString()
            }).toString()
          });
        } else {
          // Under limit after removals, go to dashboard
          toast({
            title: "Success",
            description: "Assets updated successfully",
          });
          navigate('/dashboard');
        }
        return;
      }

      // Get user's current global report time (or use selected time for first-time users)
      let globalReportTimeUTC = convertLocalTimeToUTC(selectedReportTime);
      
      if (isFirstTimeUser) {
        // For first-time users, use their selected time
        globalReportTimeUTC = convertLocalTimeToUTC(selectedReportTime);
      } else {
        // For existing users, get their current global report time
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('global_report_time')
            .eq('id', user.id)
            .single();
          
          if (profile?.global_report_time) {
            // User already has a global report time set (stored as UTC)
            globalReportTimeUTC = profile.global_report_time;
          }
        } catch (error) {
          console.log('Using selected report time for existing user');
        }
      }

      // Handle additions of truly new assets
      for (const asset of newAssets) {
        try {
          if (!asset || !asset.id || !asset.slug || !asset.name || !asset.symbol) {
            console.error('Invalid asset data:', asset);
            continue;
          }

          await saveAssetSubscriptionToDb(
            user.id,
            {
              id: asset.id,
              slug: asset.slug,
              name: asset.name,
              symbol: asset.symbol,
              icon: asset.icon || '',
            },
            [globalReportTimeUTC],
            'daily'
          );
        } catch (error) {
          console.error('Error saving new asset:', error);
          toast({
            title: "Error",
            description: `Failed to save ${asset?.name || 'asset'}`,
            variant: "destructive"
          });
        }
      }

      // Save global report time for first-time users
      if (isFirstTimeUser && newAssets.length > 0) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ global_report_time: globalReportTimeUTC })
            .eq('id', user.id);

          if (profileError) {
            console.error("Error saving global report time:", profileError);
            // Don't fail the whole process for this error, just log it
          } else {
            console.log("Global report time saved for first-time user:", selectedReportTime);
          }
        } catch (error) {
          console.error("Error saving global report time:", error);
        }

        // Note: Welcome report will be triggered AFTER plan selection/payment to ensure
        // only assets within the user's tier limits are included in the report
      }

      // Show success message
      toast({
        title: "Success",
        description: isFirstTimeUser 
          ? "Assets saved and report time set successfully!" 
          : "Asset selection saved successfully",
      });

      // Update context with only the new assets
      setContextSelectedAssets(newAssets);
      
      // Navigate to scheduling page only if we have new assets
      navigate('/scheduling', { 
        state: { 
          fromDashboard: navigationFromDashboard,
          selectedAssets: newAssets,
          isFirstTimeUser,
          fromSignup: isFirstTimeUser // Pass this flag for value-first flow
        },
        replace: true
      });

      // Clear the local selection state
      setSelectedAssetIds([]);
    } catch (error) {
      console.error("Asset selection error:", error);
      toast({
        title: "Error",
        description: "Failed to save asset selection",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleSubmit
  };
};
