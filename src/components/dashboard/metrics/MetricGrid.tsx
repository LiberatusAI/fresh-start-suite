import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatLargeNumber, formatPrice } from '@/utils/formatUtils';
import { useMetricsData } from '@/hooks/useMetricsData';
import { Metric } from '@/hooks/useAvailableMetrics';

interface MetricGridProps {
  assetName: string;
  assetSlug: string;
  metrics: Metric[];
  timeframe: string;
  className?: string;
}

export function MetricGrid({
  assetName,
  assetSlug,
  metrics,
  timeframe,
  className
}: MetricGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 ${className}`}>
      {metrics.map((metric) => (
        <MetricCard
          key={metric.id}
          assetName={assetName}
          assetSlug={assetSlug}
          metric={metric}
          timeframe={timeframe}
        />
      ))}
    </div>
  );
}

interface MetricCardProps {
  assetName: string;
  assetSlug: string;
  metric: Metric;
  timeframe: string;
}

function MetricCard({ assetName, assetSlug, metric, timeframe }: MetricCardProps) {
  const { data, isLoading, error } = useMetricsData(
    assetSlug,
    metric.id,
    timeframe
  );

  // Format data for the chart
  const chartData = data.map(point => ({
    date: new Date(point.datetime).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }),
    value: point.value
  }));

  const latestValue = chartData[chartData.length - 1]?.value;

  // Format the current value based on the metric type
  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'price':
        return formatPrice(value);
      case 'large':
        return formatLargeNumber(value);
      case 'percent':
        return `${value.toFixed(2)}%`;
      default:
        return value.toLocaleString();
    }
  };

  // Calculate the percent change
  const calculateChange = () => {
    if (chartData.length < 2) return 0;
    const firstValue = chartData[0].value;
    const lastValue = chartData[chartData.length - 1].value;
    return ((lastValue - firstValue) / firstValue) * 100;
  };

  const percentChange = calculateChange();
  const isPositive = percentChange >= 0;

  const formatYAxisValue = (value: number, format: string) => {
    switch (format) {
      case 'price':
        return formatPrice(value);
      case 'price_compact':
        return formatPrice(value, { notation: 'compact' });
      case 'percent':
        return `${value.toFixed(2)}%`;
      case 'decimal_4':
        return value.toFixed(4);
      case 'plain_number':
        return value.toLocaleString();
      case 'number':
        return formatLargeNumber(value);
      default:
        return value.toLocaleString();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <CardTitle className="text-sm">{metric.name}</CardTitle>
            <div className="h-6 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[150px] bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{metric.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[150px]">
          <div className="text-red-500 dark:text-red-400 text-sm">Failed to load data</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="text-sm">{metric.name}</CardTitle>
          {latestValue && (
            <div className="text-lg font-bold">
              {formatValue(latestValue, metric.format)}
              <span className={`ml-2 text-xs font-normal ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? '↑' : '↓'} {Math.abs(percentChange).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[150px] w-full flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            {metric.chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  stroke="currentColor"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis 
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  stroke="currentColor"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatYAxisValue(value, metric.yAxisFormat)}
                  width={40}
                  domain={['auto', 'auto']}
                  allowDataOverflow={false}
                />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            ) : metric.chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
                <defs>
                  <linearGradient id={`colorValue-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  stroke="currentColor"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis 
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  stroke="currentColor"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatYAxisValue(value, metric.yAxisFormat)}
                  width={40}
                  domain={['auto', 'auto']}
                  allowDataOverflow={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill={`url(#colorValue-${metric.id})`} 
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  stroke="currentColor"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis 
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  stroke="currentColor"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatYAxisValue(value, metric.yAxisFormat)}
                  width={40}
                  domain={['auto', 'auto']}
                  allowDataOverflow={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
} 