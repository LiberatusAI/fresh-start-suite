import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface Metric {
  id: string;
  name: string;
  format: 'price' | 'large' | 'percent';
  chartType: 'area' | 'bar' | 'line';
  yAxisFormat: string;
  yAxisLabel: string;
}

export function useAvailableMetrics(assetSlug?: string) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryKey = ['availableMetrics', assetSlug];

  const { data: metrics, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchAvailableMetrics(assetSlug),
    enabled: Boolean(!isAuthLoading && user),
    staleTime: 1 * 60 * 1000, // Consider data fresh for 1 minute (was 5 minutes)
    cacheTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes (was 30 minutes)
    refetchOnWindowFocus: true, // Refetch when window regains focus (was false)
    refetchOnMount: true, // Refetch when component mounts (was false)
  });

  return { 
    metrics: metrics || [], 
    isLoading: isLoading || isAuthLoading, 
    error: error as Error | null 
  };
}

// Move the fetchAvailableMetrics function outside the hook
async function fetchAvailableMetrics(assetSlug?: string) {
  // First, get the total count of unique metric types
  const countQuery = supabase
    .from('asset_metrics')
    .select('metric_type', { count: 'exact', head: true });

  if (assetSlug) {
    countQuery.eq('asset_slug', assetSlug);
  }

  const { count, error: countError } = await countQuery;
  if (countError) throw countError;

  // Fetch all records using pagination
  const PAGE_SIZE = 1000; // Supabase's default limit
  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);
  let allMetricTypes: string[] = [];

  for (let page = 0; page < totalPages; page++) {
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    let query = supabase
      .from('asset_metrics')
      .select('metric_type')
      .range(start, end);

    if (assetSlug) {
      query = query.eq('asset_slug', assetSlug);
    }

    const { data: pageData, error: pageError } = await query;
    if (pageError) throw pageError;

    if (pageData) {
      allMetricTypes = [...allMetricTypes, ...pageData.map(m => m.metric_type)];
    }
  }

  // Get unique metric types using Set
  const uniqueMetricTypes = Array.from(new Set(allMetricTypes));

  // Filter and transform the metric types into the format we need
  return uniqueMetricTypes
    .filter(metric_type => {
      // Only include metrics that are in our allowed list
      // and exclude any time-based metrics (1d, 5m)
      return Object.keys(allowedMetrics).includes(metric_type) && 
             !metric_type.includes('1d') && 
             !metric_type.includes('5m');
    })
    .map((metric_type) => {
      const metricConfig = allowedMetrics[metric_type as keyof typeof allowedMetrics];
      return {
        id: metric_type,
        name: metricConfig.name,
        format: metricConfig.format,
        chartType: metricConfig.chartType,
        yAxisFormat: metricConfig.yAxisFormat,
        yAxisLabel: metricConfig.yAxisLabel
      };
    });
}

// Define the allowed metrics and their display names with specific formatting rules
const allowedMetrics = {
  'price_usd': {
    name: 'Price (USD)',
    format: 'price',
    chartType: 'line',
    yAxisFormat: 'price',
    yAxisLabel: 'USD'
  },
  'volume_usd': {
    name: 'Volume (USD)',
    format: 'price',
    chartType: 'area',
    yAxisFormat: 'price',
    yAxisLabel: 'USD'
  },
  'marketcap_usd': {
    name: 'Market Cap (USD)',
    format: 'price',
    chartType: 'area',
    yAxisFormat: 'price',
    yAxisLabel: 'USD'
  },
  'social_volume_total': {
    name: 'Social Volume',
    format: 'number',
    chartType: 'area',
    yAxisFormat: 'plain_number',
    yAxisLabel: 'Posts'
  },
  'social_dominance_total': {
    name: 'Social Dominance',
    format: 'percent',
    chartType: 'line',
    yAxisFormat: 'percent',
    yAxisLabel: '%'
  },
  'unique_social_volume_total': {
    name: 'Unique Social Volume',
    format: 'number',
    chartType: 'area',
    yAxisFormat: 'plain_number',
    yAxisLabel: 'Users'
  },
  'sentiment_volume_consumed_total': {
    name: 'Sentiment Volume',
    format: 'number',
    chartType: 'area',
    yAxisFormat: 'plain_number',
    yAxisLabel: 'Posts'
  },
  'fully_diluted_valuation_usd': {
    name: 'Fully Diluted Valuation',
    format: 'price',
    chartType: 'area',
    yAxisFormat: 'price_compact',
    yAxisLabel: 'USD'
  },
  'mean_coin_age': {
    name: 'Mean Coin Age',
    format: 'number',
    chartType: 'line',
    yAxisFormat: 'plain_number',
    yAxisLabel: 'Days'
  },
  'gini_index': {
    name: 'Gini Index',
    format: 'number',
    chartType: 'line',
    yAxisFormat: 'decimal_4',
    yAxisLabel: 'Index'
  },
  'annual_inflation_rate': {
    name: 'Annual Inflation Rate',
    format: 'percent',
    chartType: 'line',
    yAxisFormat: 'percent',
    yAxisLabel: '%'
  },
  'price_btc': {
    name: 'Price (BTC)',
    format: 'price',
    chartType: 'line',
    yAxisFormat: 'price',
    yAxisLabel: 'BTC'
  },
  'price_usdt': {
    name: 'Price (USDT)',
    format: 'price',
    chartType: 'line',
    yAxisFormat: 'price',
    yAxisLabel: 'USDT'
  },
  'price_ohlc': {
    name: 'Price OHLC',
    format: 'price',
    chartType: 'bar',
    yAxisFormat: 'price',
    yAxisLabel: 'USD'
  }
}; 