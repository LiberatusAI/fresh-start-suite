
import React from 'react';
import { SubscriptionTier, SUBSCRIPTION_TIERS } from '@/types';

interface SchedulingHeaderProps {
  userTier: SubscriptionTier;
}

export function SchedulingHeader({ userTier }: SchedulingHeaderProps) {
  return (
    <div className="space-y-1.5 text-center mb-6">
      <h1 className="text-2xl font-medium tracking-tight">Configure Your Insights</h1>
      <p className="text-muted-foreground text-sm font-light">
        Select a time to receive market analysis for all your selected assets
      </p>
      <p className="text-xs font-medium mt-2">
        Your {userTier} plan includes {SUBSCRIPTION_TIERS[userTier].maxReportsPerDay} insight{SUBSCRIPTION_TIERS[userTier].maxReportsPerDay > 1 ? 's' : ''} per day for each asset
      </p>
    </div>
  );
}
