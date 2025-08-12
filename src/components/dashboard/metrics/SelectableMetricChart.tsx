import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatLargeNumber, formatPrice } from '@/utils/formatUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMetricsData } from '@/hooks/useMetricsData';
import { useAvailableMetrics } from '@/hooks/useAvailableMetrics';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MetricGrid } from './MetricGrid';
import { LayoutGrid, Maximize2 } from 'lucide-react';

interface SelectableMetricChartProps {
  assetSymbol?: string;
  assetName?: string;
  assetSlug?: string;
  className?: string;
}

export function SelectableMetricChart({
  assetName = "Bitcoin",
  assetSymbol = "BTC",
  assetSlug = "bitcoin",
  className
}: SelectableMetricChartProps) {
  const [timeframe, setTimeframe] = useState('1m');
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const { metrics: availableMetrics, isLoading: isLoadingMetrics } = useAvailableMetrics(assetSlug);
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const metric = availableMetrics.find(m => m.id === selectedMetric);
  
  // Set initial selected metric when metrics are loaded
  React.useEffect(() => {
    if (!selectedMetric && availableMetrics.length > 0) {
      setSelectedMetric(availableMetrics[0].id);
    }
  }, [availableMetrics, selectedMetric]);

  const { data, isLoading: isLoadingData, error } = useMetricsData(
    assetSlug,
    selectedMetric,
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

  if (isLoadingMetrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle>{assetName} Metrics</CardTitle>
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
              </div>
              <div className="h-10 w-[180px] bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
              <div className="text-sm text-muted-foreground">Loading available metrics...</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            </div>
            <div className="h-[250px] bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[500px]">
          <div className="text-red-500 dark:text-red-400">Failed to load metrics data</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>{assetName} Metrics</CardTitle>
            {!isDesktopMode && latestValue && metric && (
              <div className="text-2xl font-bold">
                {formatValue(latestValue, metric.format)}
                <span className={`ml-2 text-sm font-normal ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositive ? '↑' : '↓'} {Math.abs(percentChange).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {!isDesktopMode && (
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue>{metric?.name || 'Select Metric'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableMetrics.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center space-x-2">
              <Label htmlFor="desktop-mode" className="flex items-center gap-2 cursor-pointer">
                {isDesktopMode ? <LayoutGrid className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                <span className="text-sm">Desktop Mode</span>
              </Label>
              <Switch
                id="desktop-mode"
                checked={isDesktopMode}
                onCheckedChange={setIsDesktopMode}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={timeframe} onValueChange={setTimeframe} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="1w">1W</TabsTrigger>
              <TabsTrigger value="1m">1M</TabsTrigger>
              <TabsTrigger value="1y">1Y</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value={timeframe}>
            {isDesktopMode ? (
              <MetricGrid
                assetName={assetName}
                assetSlug={assetSlug}
                metrics={availableMetrics}
                timeframe={timeframe}
              />
            ) : (
              <ChartContainer
                className="h-[250px] w-full"
                config={{
                  value: {
                    theme: {
                      light: "#10b981",
                      dark: "#10b981"
                    }
                  }
                }}
              >
                {isLoadingData ? (
                  <div className="h-[250px] w-full flex flex-col items-center justify-center space-y-4">
                    <div className="h-4 w-4 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
                    <div className="text-sm text-muted-foreground">Loading chart data...</div>
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-[250px] w-full flex items-center justify-center text-muted-foreground">
                    No data available for this metric
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    {metric?.chartType === 'bar' ? (
                      <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: 'currentColor', fontSize: 11 }}
                          stroke="currentColor"
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                          minTickGap={30}
                        />
                        <YAxis 
                          tick={{ fill: 'currentColor', fontSize: 11 }}
                          stroke="currentColor"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatYAxisValue(value, metric.yAxisFormat)}
                          width={60}
                          domain={['auto', 'auto']}
                          allowDataOverflow={false}
                          label={{ 
                            value: metric.yAxisLabel, 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 11 }
                          }}
                        />
                        <Bar dataKey="value" fill="#10b981" />
                        <ChartTooltip
                          cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="bg-white dark:bg-charcoal-light p-2 border border-border/50 rounded-lg shadow-lg">
                                <p className="text-sm text-muted-foreground">{label}</p>
                                <p className="text-base font-bold">
                                  {formatYAxisValue(payload[0].value as number, metric.yAxisFormat)}
                                </p>
                              </div>
                            );
                          }}
                        />
                      </BarChart>
                    ) : metric?.chartType === 'area' ? (
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: 'currentColor', fontSize: 11 }}
                          stroke="currentColor"
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                          minTickGap={30}
                        />
                        <YAxis 
                          tick={{ fill: 'currentColor', fontSize: 11 }}
                          stroke="currentColor"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatYAxisValue(value, metric.yAxisFormat)}
                          width={60}
                          domain={['auto', 'auto']}
                          allowDataOverflow={false}
                          label={{ 
                            value: metric.yAxisLabel, 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 11 }
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10b981" 
                          fillOpacity={1} 
                          fill="url(#colorValue)" 
                        />
                        <ChartTooltip
                          cursor={{ stroke: 'rgba(0, 0, 0, 0.1)' }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="bg-white dark:bg-charcoal-light p-2 border border-border/50 rounded-lg shadow-lg">
                                <p className="text-sm text-muted-foreground">{label}</p>
                                <p className="text-base font-bold">
                                  {formatYAxisValue(payload[0].value as number, metric.yAxisFormat)}
                                </p>
                              </div>
                            );
                          }}
                        />
                      </AreaChart>
                    ) : (
                      <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: 'currentColor', fontSize: 11 }}
                          stroke="currentColor"
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                          minTickGap={30}
                        />
                        <YAxis 
                          tick={{ fill: 'currentColor', fontSize: 11 }}
                          stroke="currentColor"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatYAxisValue(value, metric.yAxisFormat)}
                          width={60}
                          domain={['auto', 'auto']}
                          allowDataOverflow={false}
                          label={{ 
                            value: metric.yAxisLabel, 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 11 }
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10b981" 
                          dot={false}
                          strokeWidth={2}
                        />
                        <ChartTooltip
                          cursor={{ stroke: 'rgba(0, 0, 0, 0.1)' }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="bg-white dark:bg-charcoal-light p-2 border border-border/50 rounded-lg shadow-lg">
                                <p className="text-sm text-muted-foreground">{label}</p>
                                <p className="text-base font-bold">
                                  {formatYAxisValue(payload[0].value as number, metric.yAxisFormat)}
                                </p>
                              </div>
                            );
                          }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}
              </ChartContainer>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 