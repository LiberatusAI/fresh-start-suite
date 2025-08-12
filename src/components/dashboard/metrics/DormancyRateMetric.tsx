import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatPrice } from '../utils/formatUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssetMetricsContext } from '@/context/AssetMetricsContext';

interface DormancyRateMetricProps {
  assetName?: string;
}

export function DormancyRateMetric({ assetName }: DormancyRateMetricProps) {
  const { metrics, isLoading, error } = useAssetMetricsContext();
  
  const chartConfig = {
    dormancy: {
      theme: {
        base: "#f59e0b",
        gradient: {
          from: "#fcd34d",
          to: "#f59e0b",
        },
      },
    },
  };

  // Set CSS variables for the chart colors
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-dormancy', chartConfig.dormancy.theme.base);
    root.style.setProperty('--color-dormancy-gradient-from', chartConfig.dormancy.theme.gradient.from);
    root.style.setProperty('--color-dormancy-gradient-to', chartConfig.dormancy.theme.gradient.to);
  }, []);

  if (isLoading || !metrics.dormantCirculation) {
    return (
      <Card className="border-gold/20 bg-white/70 dark:bg-charcoal-light/70 dark:border-gold/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center justify-between dark:text-white">
            Dormancy Rate
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
            Dormancy Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600 dark:text-red-400">
            Failed to load dormancy rate data
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data, currentValue, percentChange24h } = metrics.dormantCirculation;
  const isPositive = percentChange24h >= 0;

  return (
    <Card className="border-gold/20 bg-white/70 dark:bg-charcoal-light/70 dark:border-gold/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between dark:text-white">
          Dormancy Rate
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
              <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="dormancyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-dormancy-gradient-from)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-dormancy-gradient-to)" stopOpacity={0.1} />
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
                  tickFormatter={(value) => `${(value / 1e6).toFixed(1)}M`}
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
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-dormancy)"
                  strokeWidth={2}
                  fill="url(#dormancyGradient)"
                  dot={false}
                  activeDot={{ stroke: "var(--color-dormancy)", strokeWidth: 2, r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
