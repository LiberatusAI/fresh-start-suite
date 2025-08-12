import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIME_OPTIONS } from '@/components/dashboard/constants';
import { getUserTimezone } from '@/utils/timezoneUtils';

interface GlobalTimeSelectorProps {
  selectedTime: string;
  onTimeChange: (time: string) => void;
}

export function GlobalTimeSelector({
  selectedTime,
  onTimeChange
}: GlobalTimeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium mb-1 block">Report Time</label>
      <div className="flex items-center space-x-2">
        <Select
          value={selectedTime}
          onValueChange={onTimeChange}
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
      </div>
      <p className="text-xs text-muted-foreground">
        This time will be applied to all your selected assets (your timezone: {getUserTimezone()})
      </p>
    </div>
  );
} 