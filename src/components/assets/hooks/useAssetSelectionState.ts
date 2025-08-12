import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "@/hooks/use-toast";
import { SubscriptionTier, SUBSCRIPTION_TIERS, CryptoAsset } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useAssets } from '@/context/AssetContext';
import { supabase } from '@/integrations/supabase/client';
import { useAssetSubscriptions } from '@/hooks/useAssetSubscriptions';
import { calculateAdditionalAssets } from '../utils/assetUtils';
import { AVAILABLE_ASSETS } from '../constants/availableAssets';
import { convertUTCTimeToLocal } from '@/utils/timezoneUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const useAssetSelectionState = (fromDashboard = false) => {
  const [selectedAssets, setSelectedAssets] = useState<CryptoAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userTier, setUserTier] = useState<SubscriptionTier>('basic');
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [existingAssetCount, setExistingAssetCount] = useState(0);
  const [existingAssetIds, setExistingAssetIds] = useState<string[]>([]);
  const [assetsToRemove, setAssetsToRemove] = useState<string[]>([]);
  const [assetToConfirmDelete, setAssetToConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  // New states for first-time user time selection
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [selectedReportTime, setSelectedReportTime] = useState<string>('09:00');
  const [hasExistingGlobalTime, setHasExistingGlobalTime] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setSelectedAssetIds, setSelectedAssets: setContextSelectedAssets } = useAssets();
  const { assetSubscriptions, isLoading: isLoadingSubscriptions, removeAssetSubscription } = useAssetSubscriptions();
  
  // Check if we came from dashboard using location state
  const navigationFromDashboard = location.state?.fromDashboard || fromDashboard;
  
  // Get asset to remove if passed from dashboard
  const assetToRemove = location.state?.assetToRemove;
  
  // Check if this is a first-time user from signup
  const isFromSignup = location.state?.fromSignup || false;

  // Set isLoadingUserData to false immediately if user is not authenticated
  useEffect(() => {
    if (!user) {
      setIsLoadingUserData(false);
    }
  }, [user]);

  // Fetch user profile to get subscription tier and check for global report time
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            subscription_tier_id,
            global_report_time,
            tiers:subscription_tier_id (
              name
            )
          `)
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          // Get tier name from the related tier data or default to 'basic'
          const tierName = data.tiers?.name || 'basic';
          setUserTier(tierName as SubscriptionTier);
          
          // Check if user has an existing global report time
          if (data.global_report_time) {
            setHasExistingGlobalTime(true);
            setSelectedReportTime(convertUTCTimeToLocal(data.global_report_time));
          } else {
            setHasExistingGlobalTime(false);
            // This is a first-time user if they have no global report time AND no existing asset subscriptions
            // We'll determine the final first-time status after checking asset subscriptions
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setIsLoadingUserData(false);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  // Set existing asset data and determine first-time user status
  useEffect(() => {
    if (!isLoadingSubscriptions && !isLoadingUserData) {
      setExistingAssetCount(assetSubscriptions.length);
      // Extract the asset IDs from existing subscriptions
      const assetIds = assetSubscriptions.map(sub => sub.assetId);
      setExistingAssetIds(assetIds);
      
      // User is considered first-time if they have no existing assets OR came from signup
      setIsFirstTimeUser(assetSubscriptions.length === 0 || isFromSignup);
      
      // If we have an assetToRemove from the dashboard, add it to the assetsToRemove array
      if (assetToRemove && assetIds.includes(assetToRemove) && !assetsToRemove.includes(assetToRemove)) {
        setAssetsToRemove([assetToRemove]);
      }
    }
  }, [assetSubscriptions, isLoadingSubscriptions, assetToRemove, assetsToRemove, hasExistingGlobalTime, isLoadingUserData]);

  // Check if an asset is already being tracked
  const isAssetAlreadyTracked = (assetId: string) => {
    return assetSubscriptions.some(sub => sub.assetId === assetId) && !assetsToRemove.includes(assetId);
  };

  // Toggle asset selection for new assets
  const toggleAssetSelection = async (assetId: string) => {
    // If the asset is already being tracked
    if (existingAssetIds.includes(assetId)) {
      // Find the subscription to remove
      const subscriptionToRemove = assetSubscriptions.find(sub => sub.assetId === assetId);
      if (subscriptionToRemove) {
        // Show confirmation dialog
        setAssetToConfirmDelete({
          id: subscriptionToRemove.id,
          name: subscriptionToRemove.name
        });
      }
      return;
    }

    // Handle non-tracked assets normally
    setSelectedAssets(prev => {
      const isAlreadySelected = prev.some(asset => asset.id === assetId);
      if (isAlreadySelected) {
        return prev.filter(asset => asset.id !== assetId);
      } else {
        const assetToAdd = AVAILABLE_ASSETS.find(asset => asset.id === assetId);
        if (assetToAdd) {
          return [...prev, {
            id: assetToAdd.id,
            slug: assetToAdd.slug,
            name: assetToAdd.name,
            symbol: assetToAdd.symbol,
            icon: assetToAdd.icon,
            currentPrice: assetToAdd.currentPrice,
            priceChange24h: assetToAdd.priceChange24h
          }];
        }
        return prev;
      }
    });
  };

  // Handle confirmed asset deletion
  const handleConfirmDelete = async () => {
    if (!assetToConfirmDelete) return;

    try {
      const success = await removeAssetSubscription(assetToConfirmDelete.id);
      if (success) {
        // Update local state
        setAssetsToRemove(prev => [...prev, assetToConfirmDelete.id]);
        // Show success message
        toast({
          title: "Asset removed",
          description: `${assetToConfirmDelete.name} has been removed from your tracking list.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to remove the asset. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing asset subscription:", error);
      toast({
        title: "Error",
        description: "An error occurred while removing the asset. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAssetToConfirmDelete(null);
    }
  };

  // Handle cancel deletion
  const handleCancelDelete = () => {
    setAssetToConfirmDelete(null);
  };

  // Calculate new billing after removals
  const calculateNewBilling = () => {
    if (!user) {
      return { totalCost: 0, additionalAssets: 0 };
    }

    // Calculate new total assets after additions and removals
    const totalAssetsAfterChanges = existingAssetCount + selectedAssets.length - assetsToRemove.length;
    const maxAssets = SUBSCRIPTION_TIERS[userTier].maxAssets;
    
    // If we're still over the limit, calculate additional cost
    if (totalAssetsAfterChanges > maxAssets) {
      const additionalAssets = totalAssetsAfterChanges - maxAssets;
      const totalCost = additionalAssets * SUBSCRIPTION_TIERS[userTier].additionalAssetPrice;
      return { totalCost, additionalAssets };
    }
    
    return { totalCost: 0, additionalAssets: 0 };
  };

  return {
    selectedAssets,
    assetsToRemove,
    isLoading,
    setIsLoading,
    userTier,
    isLoadingUserData,
    existingAssetCount,
    existingAssetIds,
    navigationFromDashboard,
    assetSubscriptions,
    isLoadingSubscriptions,
    removeAssetSubscription,
    isAssetAlreadyTracked,
    toggleAssetSelection,
    calculateNewBilling,
    navigate,
    setSelectedAssetIds,
    setContextSelectedAssets,
    // Add confirmation dialog state and handlers
    assetToConfirmDelete,
    handleConfirmDelete,
    handleCancelDelete,
    // Add new states for first-time user
    isFirstTimeUser,
    selectedReportTime,
    setSelectedReportTime,
    hasExistingGlobalTime
  };
};
