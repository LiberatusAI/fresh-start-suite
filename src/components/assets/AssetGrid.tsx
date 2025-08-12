
import React from 'react';
import { CryptoAsset } from '@/types';
import { AssetCard } from './AssetCard';

interface AssetGridProps {
  assets: CryptoAsset[];
  selectedAssets: string[];
  isAssetAlreadyTracked: (assetId: string) => boolean;
  isMarkedForRemoval: (assetId: string) => boolean;
  onToggle: (assetId: string) => void;
}

export const AssetGrid = ({ 
  assets, 
  selectedAssets, 
  isAssetAlreadyTracked,
  isMarkedForRemoval,
  onToggle 
}: AssetGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          isSelected={selectedAssets.includes(asset.id)}
          isTracked={isAssetAlreadyTracked(asset.id)}
          isMarkedForRemoval={isMarkedForRemoval(asset.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
};
