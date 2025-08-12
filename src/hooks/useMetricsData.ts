import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MetricDataPoint {
  datetime: string;
  value: number;
}

async function fetchMetricsData(assetSlug: string, metricType: string, timeframe: string) {
  // Calculate the date range based on timeframe
  const endDate = new Date();
  const startDate = new Date();
  switch (timeframe) {
    case '1w':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '1m':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '1y':
      startDate.setDate(endDate.getDate() - 365);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30); // Default to 1 month
  }

  const { data: metricsData, error: supabaseError } = await supabase
    .from('asset_metrics')
    .select('datetime, value')
    .eq('asset_slug', assetSlug)
    .eq('metric_type', metricType)
    .gte('datetime', startDate.toISOString())
    .lte('datetime', endDate.toISOString())
    .order('datetime', { ascending: true });

  if (supabaseError) throw supabaseError;
  return metricsData || [];
}

export function useMetricsData(assetSlug: string, metricType: string, timeframe: string = '1m') {
  const queryKey = ['metrics', assetSlug, metricType, timeframe];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchMetricsData(assetSlug, metricType, timeframe),
    enabled: Boolean(assetSlug && metricType),
    staleTime: 1 * 60 * 1000, // Consider data fresh for 1 minute (was 5 minutes)
    cacheTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes (was 30 minutes)
    refetchOnWindowFocus: true, // Refetch when window regains focus (was false)
    refetchOnMount: true, // Refetch when component mounts (was false)
  });

  return { 
    data: data || [], 
    isLoading, 
    error: error as Error | null 
  };
} 