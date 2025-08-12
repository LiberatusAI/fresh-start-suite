import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

interface MetricData {
  datetime: string;
  value: string | number;
  ohlc_open?: number;
  ohlc_high?: number;
  ohlc_low?: number;
  ohlc_close?: number;
}

interface ProcessedMetric {
  data: Array<{ date: string; value: number }>;
  currentValue: number;
  percentChange24h: number;
}

export const useAssetMetrics = (slug: string, days: number = 30) => {
  const [metrics, setMetrics] = useState<{
    price: ProcessedMetric;
    volume: ProcessedMetric;
    marketcap: ProcessedMetric;
    socialVolume: ProcessedMetric;
    exchangeInflow: ProcessedMetric;
    dormantCirculation: ProcessedMetric;
  }>({
    price: { data: [], currentValue: 0, percentChange24h: 0 },
    volume: { data: [], currentValue: 0, percentChange24h: 0 },
    marketcap: { data: [], currentValue: 0, percentChange24h: 0 },
    socialVolume: { data: [], currentValue: 0, percentChange24h: 0 },
    exchangeInflow: { data: [], currentValue: 0, percentChange24h: 0 },
    dormantCirculation: { data: [], currentValue: 0, percentChange24h: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const from = subDays(new Date(), days);
        
        // Fetch metrics from the database
        const { data: metricsData, error: metricsError } = await supabase
          .from('asset_metrics')
          .select('*')
          .eq('asset_slug', slug)
          .gte('datetime', from.toISOString())
          .order('datetime', { ascending: true });

        if (metricsError) {
          throw new Error(metricsError.message);
        }

        // Process metrics by type
        const processMetricData = (data: MetricData[]): ProcessedMetric => {
          if (!data.length) {
            return { data: [], currentValue: 0, percentChange24h: 0 };
          }

          // Sort data chronologically
          const sortedData = [...data].sort((a, b) => 
            new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
          );

          // Get current and previous values
          const lastIndex = sortedData.length - 1;
          const currentValue = Number(sortedData[lastIndex]?.value) || 0;
          const previousValue = Number(sortedData[lastIndex - 1]?.value) || currentValue;

          // Calculate percent change
          const percentChange24h = previousValue !== 0 
            ? ((currentValue - previousValue) / previousValue) * 100 
            : 0;

          // Transform data for charting
          const chartData = sortedData.map(({ datetime, value }) => ({
            date: new Date(datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: Number(value) || 0
          }));

          return {
            data: chartData,
            currentValue,
            percentChange24h
          };
        };

        // Group metrics by type
        const metricsByType = metricsData?.reduce((acc: { [key: string]: MetricData[] }, metric) => {
          const type = metric.metric_type;
          if (!acc[type]) {
            acc[type] = [];
          }
          acc[type].push(metric);
          return acc;
        }, {});

        // Update state with processed metrics
        setMetrics({
          price: processMetricData(metricsByType['price_usd_5m'] || []),
          volume: processMetricData(metricsByType['volume_usd'] || []),
          marketcap: processMetricData(metricsByType['marketcap_usd'] || []),
          socialVolume: processMetricData(metricsByType['social_volume_total'] || []),
          exchangeInflow: processMetricData(metricsByType['exchange_inflow'] || []),
          dormantCirculation: processMetricData(metricsByType['dormant_circulation_365d'] || []),
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchMetrics();
    }
  }, [slug, days]);

  return { metrics, isLoading, error };
}; 