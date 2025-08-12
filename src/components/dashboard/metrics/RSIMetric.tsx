import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Skeleton } from '@/components/ui/skeleton';
import { useAssetMetricsContext } from '@/context/AssetMetricsContext';

interface RSIMetricProps {
  assetName?: string;
}

export function RSIMetric({ assetName }: RSIMetricProps) {
  const { metrics, isLoading, error } = useAssetMetricsContext();
  
  const chartConfig = {
    rsi: {
      theme: {
        light: "#0ea5e9",
        dark: "#38bdf8",
      },
    },
  };

  if (isLoading || !metrics.rsi) {
    return (
      <Card className="border-gold/20 bg-white/70 dark:bg-charcoal-light/70 dark:border-gold/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center justify-between dark:text-white">
            RSI (14)
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
            RSI (14)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600 dark:text-red-400">
            Failed to load RSI data
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data, currentValue, percentChange24h } = metrics.rsi;
  const isPositive = percentChange24h >= 0;

  // Determine RSI status
  let rsiStatus = "Neutral";
  let rsiStatusColor = "text-yellow-600 dark:text-yellow-400";
  if (currentValue >= 70) {
    rsiStatus = "Overbought";
    rsiStatusColor = "text-red-600 dark:text-red-400";
  } else if (currentValue <= 30) {
    rsiStatus = "Oversold";
    rsiStatusColor = "text-green-600 dark:text-green-400";
  }

  return (
    <Card className="border-gold/20 bg-white/70 dark:bg-charcoal-light/70 dark:border-gold/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between dark:text-white">
          RSI (14)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline space-x-2 mb-4">
          <span className="text-2xl font-bold dark:text-white">{currentValue.toFixed(2)}</span>
          <span className={`text-sm ${rsiStatusColor}`}>
            {rsiStatus}
          </span>
        </div>
        
        <div className="h-[100px]">
          <ChartContainer
            config={chartConfig}
            className="w-full h-full"
          >
            <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, 100]} />
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
                stroke="var(--color-rsi)"
                strokeWidth={2}
                dot={false}
                activeDot={{ stroke: "var(--color-rsi)", strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        </div>
        <div className="text-xs text-muted-foreground dark:text-gray-400 mt-2">
          Relative Strength Index (14-day period)
        </div>
      </CardContent>
    </Card>
  );
}
