import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatPrice } from '../utils/formatUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssetMetricsContext } from '@/context/AssetMetricsContext';

interface ExchangeFlowMetricProps {
  assetName?: string;
}

export function ExchangeFlowMetric({ assetName }: ExchangeFlowMetricProps) {
  const { metrics, isLoading, error } = useAssetMetricsContext();
  
  const chartConfig = {
    flow: {
      theme: {
        inflow: "#22c55e",
        outflow: "#ef4444",
      },
    },
  };

  // Set CSS variables for the chart colors
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-inflow', chartConfig.flow.theme.inflow);
    root.style.setProperty('--color-outflow', chartConfig.flow.theme.outflow);
  }, []);

  if (isLoading || !metrics.exchangeInflow) {
    return (
      <Card className="border-gold/20 bg-white/70 dark:bg-charcoal-light/70 dark:border-gold/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center justify-between dark:text-white">
            Exchange Flow
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
            Exchange Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600 dark:text-red-400">
            Failed to load exchange flow data
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data, currentValue, percentChange24h } = metrics.exchangeInflow;
  const isPositive = percentChange24h >= 0;

  return (
    <Card className="border-gold/20 bg-white/70 dark:bg-charcoal-light/70 dark:border-gold/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between dark:text-white">
          Exchange Flow
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
              <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
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
                  tickFormatter={(value) => `$${(value / 1e6).toFixed(1)}M`}
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
                <Bar
                  dataKey="value"
                  fill={isPositive ? "var(--color-inflow)" : "var(--color-outflow)"}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
        <div className="text-xs text-muted-foreground dark:text-gray-400 mt-2">
          Net flow of assets into/out of exchanges
        </div>
      </CardContent>
    </Card>
  );
}
