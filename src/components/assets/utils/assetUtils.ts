
import { CryptoAsset, SUBSCRIPTION_TIERS, SubscriptionTier } from '@/types';

/**
 * Formats a price with appropriate currency symbol and formatting
 */
export const formatPrice = (price: number): string => {
  if (price < 1) return `$${price.toFixed(2)}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

/**
 * Returns the maximum number of assets allowed for a subscription tier
 */
export const getMaxAssets = (tier: SubscriptionTier): number => {
  return SUBSCRIPTION_TIERS[tier].maxAssets;
};

/**
 * Calculates the additional cost based on total assets and subscription tier
 */
export const calculateAdditionalCost = (
  selectedAssetCount: number,
  existingAssetCount: number,
  tier: SubscriptionTier
): number => {
  const maxAssets = getMaxAssets(tier);
  const totalAssetCount = existingAssetCount + selectedAssetCount;
  const additionalAssets = Math.max(0, totalAssetCount - maxAssets);
  
  if (additionalAssets <= 0 || tier === 'institutional') return 0;
  
  return additionalAssets * SUBSCRIPTION_TIERS[tier].additionalAssetPrice;
};

/**
 * Calculates how many additional assets are being selected beyond the plan limit
 */
export const calculateAdditionalAssets = (
  selectedAssetCount: number,
  existingAssetCount: number,
  tier: SubscriptionTier
): number => {
  const maxAssets = getMaxAssets(tier);
  const totalAssetCount = existingAssetCount + selectedAssetCount;
  return Math.max(0, totalAssetCount - maxAssets);
};
