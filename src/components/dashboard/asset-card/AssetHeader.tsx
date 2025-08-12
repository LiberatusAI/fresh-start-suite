import React from 'react';
import { AssetSubscription } from '@/hooks/useAssetSubscriptions';
import { AggregateScore } from '@/hooks/useAggregateScores';
import { formatPrice } from '../utils/formatUtils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AssetHeaderProps {
  asset: AssetSubscription;
  aggregateScore: AggregateScore | null;
  isLoadingScore: boolean;
}

const getScoreColor = (score: number) => {
  if (score >= 10) return 'text-emerald-700 dark:text-emerald-400'; // Extremely Bullish
  if (score >= 5) return 'text-green-600 dark:text-green-400';      // Moderately Bullish
  if (score >= 2) return 'text-green-500 dark:text-green-300';      // Slightly Bullish
  if (score >= -1 && score <= 1) return 'text-gray-600 dark:text-gray-400'; // Neutral
  if (score >= -4) return 'text-red-400 dark:text-red-300';         // Slightly Bearish
  if (score >= -9) return 'text-red-600 dark:text-red-400';         // Moderately Bearish
  return 'text-red-800 dark:text-red-500';                          // Extremely Bearish
};

const getScoreLabel = (score: number) => {
  if (score >= 10) return 'Extremely Bullish';
  if (score >= 5) return 'Moderately Bullish';
  if (score >= 2) return 'Slightly Bullish';
  if (score >= -1 && score <= 1) return 'Neutral';
  if (score >= -4) return 'Slightly Bearish';
  if (score >= -9) return 'Moderately Bearish';
  if (score <= -10) return 'Extremely Bearish';
  return 'Unknown';
};

const getChangeIcon = (change: number) => {
  if (change > 0) return <TrendingUp className="h-3 w-3" />;
  if (change < 0) return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
};

const formatAnalysisDate = (date: Date) => {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 48) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function AssetHeader({ asset, aggregateScore, isLoadingScore }: AssetHeaderProps) {
  const hasPrice = asset.currentPrice !== undefined && asset.currentPrice > 0;
  const hasPriceChange = asset.priceChange24h !== undefined && !isNaN(asset.priceChange24h);

  return (
    <div className="space-y-3">
      {/* Asset Info Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center space-x-3 mb-3 md:mb-0">
          <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-base font-medium text-gold">
            {asset.symbol.substring(0, 1)}
          </div>
          <div>
            <h3 className="text-sm font-medium">{asset.name} ({asset.symbol})</h3>
            <p className="text-xs text-muted-foreground">
              {asset.reportTimes.join(', ')}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col md:items-end">
          <p className="text-sm font-medium">
            {hasPrice ? formatPrice(asset.currentPrice) : 'Price loading...'}
          </p>
          {hasPriceChange ? (
            <p className={`text-xs ${
              asset.priceChange24h >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {asset.priceChange24h >= 0 ? '+' : ''}{asset.priceChange24h.toFixed(2)}% (24h)
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Change loading...</p>
          )}
        </div>
      </div>

      {/* Aggregate Score Row */}
      {isLoadingScore ? (
        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
          <div className="animate-pulse flex items-center gap-2">
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      ) : aggregateScore ? (
        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">AI Score:</span>
              <span className={`text-xs font-bold ${getScoreColor(aggregateScore.aggregateScore)}`}>
                {aggregateScore.aggregateScore >= 0 ? '+' : ''}{aggregateScore.aggregateScore}
              </span>
              <span className="text-xs text-muted-foreground">
                ({getScoreLabel(aggregateScore.aggregateScore)})
              </span>
            </div>
            {aggregateScore.analysisDate && (
              <span className="text-xs text-muted-foreground">
                {formatAnalysisDate(aggregateScore.analysisDate)}
              </span>
            )}
          </div>
          
          {aggregateScore.scoreChange !== 0 && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              aggregateScore.scoreChange > 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {getChangeIcon(aggregateScore.scoreChange)}
              <span>
                {aggregateScore.scoreChange > 0 ? '+' : ''}{aggregateScore.scoreChange}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
          <span className="text-xs text-muted-foreground">No AI score available</span>
        </div>
      )}
    </div>
  );
}
