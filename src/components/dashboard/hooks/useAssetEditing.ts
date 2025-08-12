
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/hooks/use-toast";
import { AssetSubscription } from '@/hooks/useAssetSubscriptions';
import { TIME_OPTIONS } from '../constants';

export function useAssetEditing(
  assetSubscriptions: AssetSubscription[],
  updateAssetSubscription: (id: string, reportTimes: string[]) => Promise<boolean>,
  getMaxReportsPerDay: () => number
) {
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingTimes, setEditingTimes] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();

  const handleAddAsset = () => {
    navigate("/assets", { state: { fromDashboard: true } });
  };

  const handleEditSchedule = (asset: AssetSubscription) => {
    // Navigate to the scheduling page to edit global time
    navigate("/scheduling", { 
      state: { 
        fromDashboard: true,
        selectedAssets: assetSubscriptions.map(sub => ({
          id: sub.assetId,
          name: sub.name,
          symbol: sub.symbol,
          icon: sub.icon,
          slug: sub.slug
        }))
      } 
    });
  };

  const handleCancelEdit = () => {
    setEditingAssetId(null);
    setEditingTimes([]);
  };

  const handleSaveSchedule = async () => {
    if (!editingAssetId) return;
    
    const asset = assetSubscriptions.find(a => a.id === editingAssetId);
    if (!asset) return;
    
    setIsUpdating(true);
    try {
      const success = await updateAssetSubscription(editingAssetId, editingTimes);
      if (success) {
        toast({
          title: "Schedule updated",
          description: "Your report schedule has been updated successfully.",
        });
        setEditingAssetId(null);
      }
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast({
        title: "Failed to update schedule",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveAsset = async (assetId: string) => {
    // Instead of immediately removing the asset, navigate to the asset selection page
    // Pass the assetId to be pre-selected for removal
    navigate("/assets", { 
      state: { 
        fromDashboard: true,
        assetToRemove: assetId 
      } 
    });
  };

  const canAddMoreTimes = () => {
    if (!editingAssetId) return false;
    return editingTimes.length < getMaxReportsPerDay();
  };

  const handleAddTime = () => {
    if (!canAddMoreTimes()) {
      toast({
        title: "Report limit reached",
        description: `Your plan allows ${getMaxReportsPerDay()} reports per day. Upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }
    
    setEditingTimes(prev => [...prev, TIME_OPTIONS[0]]);
  };

  const handleRemoveTime = (index: number) => {
    setEditingTimes(prev => prev.filter((_, i) => i !== index));
  };

  const handleTimeChange = (index: number, time: string) => {
    setEditingTimes(prev => {
      const updated = [...prev];
      updated[index] = time;
      return updated;
    });
  };

  return {
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
