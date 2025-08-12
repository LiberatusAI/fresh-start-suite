import React from 'react';
import { Card } from "@/components/ui/card";
import { AssetSubscription } from '@/hooks/useAssetSubscriptions';
import { AggregateScore } from '@/hooks/useAggregateScores';
import { AssetHeader } from './asset-card/AssetHeader';
import { AssetFooter } from './asset-card/AssetFooter';
import { EditScheduleForm } from './asset-card/EditScheduleForm';

interface AssetCardProps {
  asset: AssetSubscription;
  editingAssetId: string | null;
  editingTimes: string[];
  isUpdating: boolean;
  onEditSchedule: (asset: AssetSubscription) => void;
  onCancelEdit: () => void;
  onSaveSchedule: () => void;
  onRemoveAsset: (assetId: string) => void;
  onAddTime: () => void;
  onRemoveTime: (index: number) => void;
  onTimeChange: (index: number, time: string) => void;
  canAddMoreTimes: () => boolean;
  aggregateScore: AggregateScore | null;
  isLoadingScore: boolean;
}

export function AssetCard({
  asset,
  editingAssetId,
  editingTimes,
  isUpdating,
  onEditSchedule,
  onCancelEdit,
  onSaveSchedule,
  onRemoveAsset,
  onAddTime,
  onRemoveTime,
  onTimeChange,
  canAddMoreTimes,
  aggregateScore,
  isLoadingScore
}: AssetCardProps) {
  const isEditing = editingAssetId === asset.id;

  return (
    <Card key={asset.id} className="p-5 border-gold/20 bg-white/90 dark:bg-charcoal-light/60 dark:border-gold/10 shadow-sm animate-fade-in">
      {isEditing ? (
        <EditScheduleForm
          asset={asset}
          editingTimes={editingTimes}
          isUpdating={isUpdating}
          onCancelEdit={onCancelEdit}
          onSaveSchedule={onSaveSchedule}
          onAddTime={onAddTime}
          onRemoveTime={onRemoveTime}
          onTimeChange={onTimeChange}
          canAddMoreTimes={canAddMoreTimes}
        />
      ) : (
        <>
          <AssetHeader 
            asset={asset} 
            aggregateScore={aggregateScore}
            isLoadingScore={isLoadingScore}
          />
          <AssetFooter 
            asset={asset} 
            onEditSchedule={onEditSchedule} 
            onRemoveAsset={onRemoveAsset} 
          />
        </>
      )}
    </Card>
  );
}
