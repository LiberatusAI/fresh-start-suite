import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Skeleton } from '@/components/ui/skeleton';
import { useAssetMetricsContext } from '@/context/AssetMetricsContext';

interface SocialSentimentMetricProps {
  assetName?: string;
}

export function SocialSentimentMetric({ assetName }: SocialSentimentMetricProps) {
  const { metrics, isLoading, error } = useAssetMetricsContext();
  
  const chartConfig = {
    social: {
      theme: {
        light: "#10b981",
        dark: "#34d399",
      },
    },
  };

  // Set CSS variables for the chart colors
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-social', chartConfig.social.theme.dark);
  }, []);

  if (isLoading || !metrics.socialVolume) {
    return (
      <Card className="border-gold/20 bg-white/70 dark:bg-charcoal-light/70 dark:border-gold/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center justify-between dark:text-white">
            Social Volume
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
            Social Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600 dark:text-red-400">
            Failed to load social volume data
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data, currentValue, percentChange24h } = metrics.socialVolume;
  const isPositive = percentChange24h >= 0;

  return (
    <Card className="border-gold/20 bg-white/70 dark:bg-charcoal-light/70 dark:border-gold/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between dark:text-white">
          Social Volume
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline space-x-2 mb-4">
          <span className="text-2xl font-bold dark:text-white">{currentValue.toFixed(2)}</span>
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
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <ChartTooltipContent
                        className="dark:bg-charcoal-light dark:border-gray-700 dark:text-white"
                        payload={payload.map(item => ({
                          ...item,
                          value: Number(item.value).toFixed(2)
                        }))}
                      />
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-social)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ stroke: "var(--color-social)", strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
