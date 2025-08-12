
import React from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { AssetSubscription } from '@/hooks/useAssetSubscriptions';

interface EditScheduleFormProps {
  asset: AssetSubscription;
  editingTimes: string[];
  isUpdating: boolean;
  onCancelEdit: () => void;
  onSaveSchedule: () => void;
  onAddTime: () => void;
  onRemoveTime: (index: number) => void;
  onTimeChange: (index: number, time: string) => void;
  canAddMoreTimes: () => boolean;
}

export function EditScheduleForm({
  asset,
  editingTimes,
  isUpdating,
  onCancelEdit,
  onSaveSchedule,
  onAddTime,
  onRemoveTime,
  onTimeChange,
  canAddMoreTimes
}: EditScheduleFormProps) {
  const navigate = useNavigate();

  const handleEditGlobalTime = () => {
    // Navigate to scheduling page to edit global time
    navigate("/scheduling", { 
      state: { 
        fromDashboard: true,
        selectedAssets: [{
          id: asset.assetId,
          name: asset.name,
          symbol: asset.symbol,
          icon: asset.icon,
          slug: asset.assetId
        }]
      } 
    });
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-lg font-bold text-gold">
          {asset.icon}
        </div>
        <h3 className="font-medium">{asset.name} ({asset.symbol})</h3>
      </div>
      
      <div className="text-center space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Report times are now managed globally for all your assets.</p>
          <p>Click below to edit your global report time.</p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            type="button"
            onClick={handleEditGlobalTime}
            className="flex-1 bg-gold text-white hover:bg-gold/90"
          >
            Edit Global Time
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancelEdit}
            className="flex-1 border-gold/20 text-gold hover:bg-gold/5"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
