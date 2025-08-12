
import React from 'react';
import { SubscriptionTier, SUBSCRIPTION_TIERS } from '@/types';
import { getMaxAssets } from './utils/assetUtils';

interface AssetSelectionHeaderProps {
  userTier: SubscriptionTier;
  existingAssetCount: number;
}

export const AssetSelectionHeader = ({ userTier, existingAssetCount }: AssetSelectionHeaderProps) => {
  return (
    <div className="space-y-1.5 text-center mb-6">
      <h1 className="text-2xl font-medium tracking-tight">Select Assets to Track</h1>
      <p className="text-muted-foreground text-sm font-light">
        Choose the cryptocurrency assets you want to receive reports for
      </p>
      <p className="text-xs font-medium mt-2">
        Your {userTier} plan includes {getMaxAssets(userTier)} assets
        {userTier !== 'institutional' && ` ($${SUBSCRIPTION_TIERS[userTier].additionalAssetPrice} per additional asset)`}
      </p>
      {existingAssetCount > 0 && (
        <p className="text-xs text-amber-600 font-medium">
          You're currently tracking {existingAssetCount} asset(s).
        </p>
      )}
    </div>
  );
};
