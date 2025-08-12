import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AssetLimitCheck {
  isWithinLimit: boolean;
  currentAssetCount: number;
  maxAllowed: number;
  tierName: string;
  excessCount: number;
  keptAssets: string[];
  removedAssets: string[];
}

/**
 * Checks if user's current asset count is within their tier limits
 */
export const checkAssetLimits = async (userId: string): Promise<AssetLimitCheck> => {
  try {
    // Get user's profile with tier information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        subscription_tier_id,
        tiers (
          name,
          max_assets
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Could not fetch user profile');
    }

    // Get user's current asset subscriptions
    const { data: assetSubscriptions, error: assetError } = await supabase
      .from('asset_subscriptions')
      .select('id, asset_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }); // Oldest first

    if (assetError) {
      throw new Error('Could not fetch asset subscriptions');
    }

    const currentAssetCount = assetSubscriptions?.length || 0;
    const maxAllowed = profile.tiers?.max_assets || 1; // Default to trial limit
    const tierName = profile.tiers?.name || 'trial';
    const isWithinLimit = currentAssetCount <= maxAllowed;
    const excessCount = Math.max(0, currentAssetCount - maxAllowed);

    // Determine which assets would be kept vs removed
    const allAssets = assetSubscriptions?.map(a => a.asset_name) || [];
    const keptAssets = allAssets.slice(0, maxAllowed);
    const removedAssets = allAssets.slice(maxAllowed);

    return {
      isWithinLimit,
      currentAssetCount,
      maxAllowed,
      tierName,
      excessCount,
      keptAssets,
      removedAssets
    };
  } catch (error) {
    console.error('Error checking asset limits:', error);
    // Default to trial limits on error
    return {
      isWithinLimit: false,
      currentAssetCount: 0,
      maxAllowed: 1,
      tierName: 'trial',
      excessCount: 0,
      keptAssets: [],
      removedAssets: []
    };
  }
};

/**
 * Automatically enforces asset limits by removing excess assets
 * Keeps the first N assets based on creation order (first selected)
 * Shows user-friendly notification about what was kept/removed
 */
export const enforceAssetLimits = async (userId: string): Promise<AssetLimitCheck> => {
  try {
    const limitCheck = await checkAssetLimits(userId);
    
    if (limitCheck.isWithinLimit) {
      return limitCheck; // Already within limits
    }

    // Get all user's assets ordered by creation date (keep oldest = first selected)
    const { data: assets, error: fetchError } = await supabase
      .from('asset_subscriptions')
      .select('id, asset_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (fetchError || !assets) {
      throw new Error('Could not fetch assets for enforcement');
    }

    // Keep only the allowed number of assets (first selected)
    const assetsToRemove = assets.slice(limitCheck.maxAllowed);

    if (assetsToRemove.length > 0) {
      const idsToRemove = assetsToRemove.map(asset => asset.id);
      
      const { error: deleteError } = await supabase
        .from('asset_subscriptions')
        .delete()
        .in('id', idsToRemove);

      if (deleteError) {
        throw new Error('Could not remove excess assets');
      }

      console.log(`Enforced asset limits: Removed ${limitCheck.removedAssets.length} excess assets for ${limitCheck.tierName} user`);
    }

    // Return updated status
    return await checkAssetLimits(userId);
  } catch (error) {
    console.error('Error enforcing asset limits:', error);
    toast({
      title: "Error",
      description: "There was an issue managing your asset subscriptions. Please contact support if this persists.",
      variant: "destructive",
    });
    throw error;
  }
};