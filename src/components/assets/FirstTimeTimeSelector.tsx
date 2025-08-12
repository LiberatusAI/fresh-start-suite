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

interface FirstTimeTimeSelectorProps {
  selectedTime: string;
  onTimeChange: (time: string) => void;
}

export function FirstTimeTimeSelector({
  selectedTime,
  onTimeChange
}: FirstTimeTimeSelectorProps) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          Set Your Report Time
        </h3>
      </div>
      
      <p className="text-xs text-amber-700 dark:text-amber-300">
        Choose when you want to receive your daily crypto reports. This will be your default time for all assets.
      </p>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-amber-800 dark:text-amber-200 block">
          Report Time
        </label>
        <div className="flex items-center space-x-2">
          <Select
            value={selectedTime}
            onValueChange={onTimeChange}
          >
            <SelectTrigger className="w-full md:w-[200px] border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-950/40 text-amber-900 dark:text-amber-100">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent 
              position="item-aligned"
              avoidCollisions={true}
              align="center"
              side="bottom"
              className="z-50 bg-white dark:bg-amber-950 border-amber-200 dark:border-amber-800 min-w-[200px]"
            >
              {TIME_OPTIONS.map((option) => (
                <SelectItem 
                  key={option} 
                  value={option}
                  className="text-amber-900 dark:text-amber-100 focus:bg-amber-100 dark:focus:bg-amber-900/50"
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Your timezone: {getUserTimezone()}
        </p>
      </div>
    </div>
  );
} 