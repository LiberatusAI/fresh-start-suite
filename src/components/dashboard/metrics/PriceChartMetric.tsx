import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatPrice } from '../utils/formatUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssetMetricsContext } from '@/context/AssetMetricsContext';

interface PriceChartMetricProps {
  assetName?: string;
}

export function PriceChartMetric({ assetName }: PriceChartMetricProps) {
  const { metrics, isLoading, error } = useAssetMetricsContext();
  
  const chartConfig = React.useMemo(() => ({
    price: {
      theme: {
        base: "#22c55e",
        gradient: {
          from: "#22c55e",
          to: "#16a34a",
        },
      },
    },
  }), []);

  // Set CSS variables for the chart colors
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-price', chartConfig.price.theme.base);
    root.style.setProperty('--color-price-gradient-from', chartConfig.price.theme.gradient.from);
    root.style.setProperty('--color-price-gradient-to', chartConfig.price.theme.gradient.to);
  }, [chartConfig]);

  // Debug log the metrics state
  React.useEffect(() => {
    console.log('Price metrics state:', {
      isLoading,
      error,
      data: metrics.price
    });
  }, [metrics.price, isLoading, error]);

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-white/70 dark:bg-charcoal-light/70 dark:border-gold/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center justify-between dark:text-white">
            Price History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[24px] w-[140px] mb-2" />
          <Skeleton className="h-[100px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-gold/20 bg-white/70 dark:bg-charcoal-light/70 dark:border-gold/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center justify-between dark:text-white">
            Price History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600 dark:text-red-400">
            Failed to load price data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics.price.data.length) {
    return (
      <Card className="border-gold/20 bg-white/70 dark:bg-charcoal-light/70 dark:border-gold/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center justify-between dark:text-white">
            Price History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            No price data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data, currentValue, percentChange24h } = metrics.price;
  const isPositive = percentChange24h >= 0;

  return (
    <Card className="border-gold/20 bg-white/70 dark:bg-charcoal-light/70 dark:border-gold/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between dark:text-white">
          Price History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline space-x-2 mb-4">
          <span className="text-2xl font-bold dark:text-white">{formatPrice(currentValue)}</span>
          <span className={`text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositive ? '+' : ''}{percentChange24h.toFixed(2)}%
          </span>
        </div>
        
        <div className="h-[100px]">
          <ChartContainer
            config={chartConfig}
            className="w-full h-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-price-gradient-from)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-price-gradient-to)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  stroke="currentColor"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  stroke="currentColor"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <ChartTooltipContent
                        className="dark:bg-charcoal-light dark:border-gray-700 dark:text-white"
                        payload={payload.map(item => ({
                          ...item,
                          value: formatPrice(item.value as number)
                        }))}
                      />
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-price)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ stroke: "var(--color-price)", strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
