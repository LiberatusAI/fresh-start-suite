import { useAssetSubscriptions } from '@/hooks/useAssetSubscriptions';
import { useAggregateScores } from '@/hooks/useAggregateScores';
import { useSubscriptionData } from './useSubscriptionData';
import { useAssetEditing } from './useAssetEditing';

export function useDashboardState() {
  const { 
    assetSubscriptions, 
    isLoading: isLoadingAssets, 
    fetchAssetSubscriptions, 
    updateAssetSubscription, 
    removeAssetSubscription 
  } = useAssetSubscriptions();
  
  const { 
    isLoadingSubscription, 
    getMaxReportsPerDay 
  } = useSubscriptionData();

  // Get asset slugs for aggregate scores
  const assetSlugs = assetSubscriptions.map(sub => sub.slug);
  
  const {
    aggregateScores,
    isLoading: isLoadingScores,
    error: scoresError,
    getScoreForAsset,
    refetch: refetchScores
  } = useAggregateScores(assetSlugs);

  const {
    editingAssetId,
    editingTimes,
    isUpdating,
    handleAddAsset,
    handleEditSchedule,
    handleCancelEdit,
    handleSaveSchedule,
    handleRemoveAsset,
    handleAddTime,
    handleRemoveTime,
    handleTimeChange,
    canAddMoreTimes
  } = useAssetEditing(assetSubscriptions, updateAssetSubscription, getMaxReportsPerDay);

  return {
    assetSubscriptions,
    isLoadingAssets,
    isLoadingSubscription,
    aggregateScores,
    isLoadingScores,
    scoresError,
    getScoreForAsset,
    refetchScores,
    editingAssetId,
    editingTimes,
    isUpdating,
    handleAddAsset,
    handleEditSchedule,
    handleCancelEdit,
    handleSaveSchedule,
    handleRemoveAsset,
    handleAddTime,
    handleRemoveTime,
    handleTimeChange,
    canAddMoreTimes
  };
}
