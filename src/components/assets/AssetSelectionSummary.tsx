import React from 'react';
import { Button } from "@/components/ui/button";
import { formatPrice } from './utils/assetUtils';
import { SubscriptionTier, SUBSCRIPTION_TIERS } from '@/types';
import { FirstTimeTimeSelector } from './FirstTimeTimeSelector';

interface AssetSelectionSummaryProps {
  selectedCount: number;
  removedCount: number;
  isSubmitting: boolean;
  onSubmit: () => void;
  isFirstTimeUser?: boolean;
  selectedReportTime?: string;
  onTimeChange?: (time: string) => void;
}

export const AssetSelectionSummary = ({
  selectedCount,
  removedCount,
  isSubmitting,
  onSubmit,
  isFirstTimeUser = false,
  selectedReportTime = '09:00',
  onTimeChange
}: AssetSelectionSummaryProps) => {
  const hasChanges = selectedCount > 0 || removedCount > 0;

  return (
    <div className="space-y-4">
      {/* Show time selector for first-time users who are adding assets */}
      {isFirstTimeUser && selectedCount > 0 && onTimeChange && (
        <FirstTimeTimeSelector
          selectedTime={selectedReportTime}
          onTimeChange={onTimeChange}
        />
      )}
      
      <div className="flex items-center justify-between">
        <div>
          {selectedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Added: <span className="font-medium">{selectedCount}</span> asset(s)
            </p>
          )}
          {removedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Removed: <span className="font-medium">{removedCount}</span> asset(s)
            </p>
          )}
          {isFirstTimeUser && selectedCount > 0 && (
            <p className="text-xs text-amber-600 font-medium mt-1">
              Your report time will be saved as your default
            </p>
          )}
        </div>
        
        <div className="flex space-x-3">
          <Button 
            onClick={onSubmit}
            variant="gold"
            size="sm"
            className="text-xs"
            disabled={isSubmitting || !hasChanges}
          >
            {isSubmitting ? "Processing..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};
