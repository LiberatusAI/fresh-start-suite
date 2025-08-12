
import React from 'react';
import { CryptoAsset, SubscriptionTier } from '@/types';
import { AssetScheduleCard } from './AssetScheduleCard';
import { ScheduleFormActions } from './ScheduleFormActions';
import { NoAssetsSelected } from './NoAssetsSelected';
import { SchedulingHeader } from './SchedulingHeader';
import { GlobalTimeSelector } from './GlobalTimeSelector';

interface ScheduleItem {
  assetId: string;
  days: string;
}

interface SchedulingContentProps {
  selectedAssets: CryptoAsset[];
  scheduleItems: ScheduleItem[];
  globalReportTime: string;
  userTier: SubscriptionTier;
  isLoading: boolean;
  fromDashboard: boolean;
  getAssetById: (id: string) => CryptoAsset | undefined;
  onGlobalTimeChange: (time: string) => void;
  onSubmit: () => void;
}

export function SchedulingContent({
  selectedAssets,
  scheduleItems,
  globalReportTime,
  userTier,
  isLoading,
  fromDashboard,
  getAssetById,
  onGlobalTimeChange,
  onSubmit
}: SchedulingContentProps) {
  if (selectedAssets.length === 0) {
    return <NoAssetsSelected fromDashboard={fromDashboard} />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <SchedulingHeader userTier={userTier} />
      
      <div className="space-y-6 mb-8">
        {/* Global Time Selector */}
        <div className="bg-white/80 dark:bg-charcoal-light/80 rounded-lg border border-gold/20 p-6">
          <GlobalTimeSelector
            selectedTime={globalReportTime}
            onTimeChange={onGlobalTimeChange}
          />
        </div>
        
        {/* Asset List */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Selected Assets</h3>
          {scheduleItems.map((item) => {
            const asset = getAssetById(item.assetId);
            if (!asset) return null;
            
            return (
              <AssetScheduleCard
                key={item.assetId}
                asset={asset}
                userTier={userTier}
              />
            );
          })}
        </div>
      </div>
      
      <ScheduleFormActions
        isLoading={isLoading}
        fromDashboard={fromDashboard}
        onSubmit={onSubmit}
      />
    </div>
  );
}
