import React from 'react';
import { AssetSubscription } from '@/hooks/useAssetSubscriptions';
import { AggregateScore } from '@/hooks/useAggregateScores';
import { AssetCard } from '../AssetCard';
import { EmptyAssetState } from '../EmptyAssetState';

interface AssetGridProps {
  assetSubscriptions: AssetSubscription[];
  editingAssetId: string | null;
  editingTimes: string[];
  isUpdating: boolean;
  onAddAsset: () => void;
  onEditSchedule: (asset: AssetSubscription) => void;
  onCancelEdit: () => void;
  onSaveSchedule: () => void;
  onRemoveAsset: (assetId: string) => void;
  onAddTime: () => void;
  onRemoveTime: (index: number) => void;
  onTimeChange: (index: number, time: string) => void;
  canAddMoreTimes: () => boolean;
  getScoreForAsset: (assetSlug: string) => AggregateScore | null;
  isLoadingScores: boolean;
}

export function AssetGrid({
  assetSubscriptions,
  editingAssetId,
  editingTimes,
  isUpdating,
  onAddAsset,
  onEditSchedule,
  onCancelEdit,
  onSaveSchedule,
  onRemoveAsset,
  onAddTime,
  onRemoveTime,
  onTimeChange,
  canAddMoreTimes,
  getScoreForAsset,
  isLoadingScores
}: AssetGridProps) {
  if (assetSubscriptions.length === 0) {
    return <EmptyAssetState onAddAsset={onAddAsset} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {assetSubscriptions.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          editingAssetId={editingAssetId}
          editingTimes={editingTimes}
          isUpdating={isUpdating}
          onEditSchedule={onEditSchedule}
          onCancelEdit={onCancelEdit}
          onSaveSchedule={onSaveSchedule}
          onRemoveAsset={onRemoveAsset}
          onAddTime={onAddTime}
          onRemoveTime={onRemoveTime}
          onTimeChange={onTimeChange}
          canAddMoreTimes={canAddMoreTimes}
          aggregateScore={getScoreForAsset(asset.slug)}
          isLoadingScore={isLoadingScores}
        />
      ))}
    </div>
  );
}
