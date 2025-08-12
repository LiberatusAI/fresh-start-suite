
import React from 'react';
import { Card } from "@/components/ui/card";
import { CryptoAsset, SubscriptionTier } from '@/types';

interface AssetScheduleCardProps {
  asset: CryptoAsset;
  userTier: SubscriptionTier;
}

export function AssetScheduleCard({
  asset,
  userTier
}: AssetScheduleCardProps) {
  return (
    <Card key={asset.id} className="p-4 border-gold/20 bg-white/80 dark:bg-charcoal-light/80 dark:border-gold/30">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-lg font-bold text-gold">
          {asset.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-medium">{asset.name}</h3>
          <p className="text-sm text-muted-foreground">{asset.symbol}</p>
        </div>
      </div>
    </Card>
  );
}
