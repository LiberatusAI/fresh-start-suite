import React from 'react';
import { CardContent } from "@/components/ui/card";
import { SubscriptionTier, SubscriptionTierDetails } from '@/types';
import { getSubscriptionDetails } from './subscriptionUtils';

type SubscriptionDetailsComponentProps = {
  currentTier: SubscriptionTier;
  tierDetails?: SubscriptionTierDetails | null;
};

export function SubscriptionDetails({ currentTier, tierDetails }: SubscriptionDetailsComponentProps) {
  const details = getSubscriptionDetails(currentTier, tierDetails);
  
  return (
    <CardContent>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground dark:text-gray-300">Plan</span>
          <span className="font-medium dark:text-white">{details.name}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground dark:text-gray-300">Price</span>
          <span className="font-medium dark:text-white">{details.price}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground dark:text-gray-300">Assets</span>
          <span className="font-medium dark:text-white">{details.assets}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground dark:text-gray-300">Reports</span>
          <span className="font-medium dark:text-white">{details.reports}</span>
        </div>
      </div>
    </CardContent>
  );
}
