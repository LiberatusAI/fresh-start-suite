import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { SubscriptionTier, SUBSCRIPTION_TIERS } from '@/types';
import { TIME_OPTIONS } from '@/components/dashboard/constants';

interface ScheduleTimeSelectorProps {
  assetId: string;
  times: string[];
  userTier: SubscriptionTier;
  onAddTime: (assetId: string) => void;
  onRemoveTime: (assetId: string, timeIndex: number) => void;
  onTimeChange: (assetId: string, timeIndex: number, newTime: string) => void;
}

export function ScheduleTimeSelector({
  assetId,
  times,
  userTier,
  onAddTime,
  onRemoveTime,
  onTimeChange
}: ScheduleTimeSelectorProps) {
  // Get the max reports per day for the current subscription tier
  const getMaxReportsPerDay = () => {
    return SUBSCRIPTION_TIERS[userTier].maxReportsPerDay;
  };

  // Check if the user can add more report times for this asset
  const canAddMoreTimes = () => {
    return times.length < getMaxReportsPerDay();
  };

  const handleAddTime = () => {
    if (!canAddMoreTimes()) {
      toast({
        title: "Report limit reached",
        description: `Your ${userTier} plan allows ${getMaxReportsPerDay()} reports per day. Upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }
    
    onAddTime(assetId);
  };

  return (
    <div>
      <label className="text-sm font-medium mb-1 block">Report Times</label>
      <div className="space-y-2">
        {times.map((time, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Select
              value={time}
              onValueChange={(value) => onTimeChange(assetId, index, value)}
            >
              <SelectTrigger className="w-full md:w-[200px] border-gold/20 bg-white/80 dark:bg-charcoal-light/80 dark:border-gold/30 dark:text-white">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent 
                position="item-aligned"
                avoidCollisions={true}
                align="center"
                side="bottom"
                className="z-50 bg-white dark:bg-charcoal-light min-w-[200px]"
              >
                {TIME_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {times.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveTime(assetId, index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 h-8 w-8 p-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
            )}
          </div>
        ))}
      </div>
      
      {canAddMoreTimes() && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddTime}
          className="mt-2 text-gold border-gold/20 hover:bg-gold/5 hover:border-gold/30 dark:border-gold/30 dark:hover:bg-gold/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Time
        </Button>
      )}
    </div>
  );
}
