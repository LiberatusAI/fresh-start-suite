
import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CryptoAsset } from '@/types';

interface AssetCardProps {
  asset: CryptoAsset;
  isSelected: boolean;
  isTracked: boolean;
  isMarkedForRemoval?: boolean; 
  onToggle: (assetId: string) => void;
}

export const AssetCard = ({ 
  asset, 
  isSelected, 
  isTracked,
  isMarkedForRemoval = false,
  onToggle 
}: AssetCardProps) => {
  const formatPrice = (price: number | undefined) => {
    if (!price) return 'N/A';
    if (price < 1) return `$${price.toFixed(2)}`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  const handleClick = () => {
    onToggle(asset.id);
  };

  return (
    <Card 
      className={`p-3 cursor-pointer transition-all duration-300 border-2 hover-lift hover:shadow-md ${
        isSelected 
          ? 'border-gold bg-gold/5' 
          : isMarkedForRemoval
            ? 'border-red-400 bg-red-50 dark:bg-red-950/30 dark:border-red-600'
            : isTracked
              ? 'border-green-500 bg-green-50 dark:bg-green-950/30 dark:border-green-600'
              : 'border-gray-200 bg-white dark:bg-charcoal-light/40 dark:border-gray-700 hover:border-gold/50'
      }`}
      onClick={handleClick}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-base font-medium text-gold mr-2 transition-all duration-300 group-hover:bg-gold/20">
            {asset.icon}
          </div>
          <div>
            <h3 className="text-sm font-medium">{asset.name}</h3>
            <p className="text-xs text-muted-foreground">{asset.symbol}</p>
          </div>
        </div>
        
        <div className="mt-auto">
          <p className="font-medium text-base">{formatPrice(asset.currentPrice)}</p>
          <p className={`text-xs ${
            (asset.priceChange24h || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {(asset.priceChange24h || 0) >= 0 ? '+' : ''}{asset.priceChange24h}% (24h)
          </p>
          
          <div className="mt-2 text-xs font-medium">
            {isTracked && !isMarkedForRemoval && (
              <span className="text-green-600 dark:text-green-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Tracking
              </span>
            )}
            {isMarkedForRemoval && (
              <span className="text-red-600 dark:text-red-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </span>
            )}
            {isSelected && (
              <span className="text-gold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
