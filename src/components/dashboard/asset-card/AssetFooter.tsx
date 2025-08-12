import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Settings, Trash2, ChevronRight } from "lucide-react";
import { AssetSubscription } from '@/hooks/useAssetSubscriptions';

interface AssetFooterProps {
  asset: AssetSubscription;
  onEditSchedule: (asset: AssetSubscription) => void;
  onRemoveAsset: (assetId: string) => void;
}

export function AssetFooter({ asset, onEditSchedule, onRemoveAsset }: AssetFooterProps) {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/asset/${asset.id}`);
  };

  return (
    <div className="flex flex-col mt-4 pt-3 border-t border-gold/10 dark:border-gold/20">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 px-2 text-muted-foreground dark:text-gray-400"
            onClick={() => onEditSchedule(asset)}
          >
            <Settings className="h-4 w-4 mr-1" />
            <span className="text-xs">Schedule</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            onClick={() => onRemoveAsset(asset.id)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            <span className="text-xs">Remove</span>
          </Button>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-gold hover:text-gold hover:bg-gold/5 dark:text-gold-light dark:hover:bg-gold/10"
          onClick={handleViewDetails}
        >
          <span className="text-xs">Details</span>
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
