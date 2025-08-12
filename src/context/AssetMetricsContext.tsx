import React, { createContext, useContext } from 'react';
import { useAssetMetrics } from '@/hooks/useAssetMetrics';

export interface AssetMetricsContextType {
  metrics: {
    price: ProcessedMetric;
    volume: ProcessedMetric;
    marketcap: ProcessedMetric;
    socialVolume: ProcessedMetric;
    exchangeInflow: ProcessedMetric;
    dormantCirculation: ProcessedMetric;
  };
  isLoading: boolean;
  error?: Error | null;
}

interface ProcessedMetric {
  data: Array<{ date: string; value: number }>;
  currentValue: number;
  percentChange24h: number;
}

const AssetMetricsContext = createContext<AssetMetricsContextType | undefined>(undefined);

export function AssetMetricsProvider({ children, slug }: { children: React.ReactNode; slug: string }) {
  const { metrics, isLoading, error } = useAssetMetrics(slug);

  return (
    <AssetMetricsContext.Provider value={{ metrics, isLoading, error }}>
      {children}
    </AssetMetricsContext.Provider>
  );
}

export const useAssetMetricsContext = () => {
  const context = useContext(AssetMetricsContext);
  if (context === undefined) {
    throw new Error('useAssetMetricsContext must be used within an AssetMetricsProvider');
  }
  return context;
}; 