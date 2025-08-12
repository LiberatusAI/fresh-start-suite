// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="@supabase/supabase-js" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Resend } from "resend";
import { createCanvas } from 'https://deno.land/x/canvas@v1.4.1/mod.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
async function fetchWeeklyAggregatedMetrics(supabaseClient, assetSlug) {
  try {
    console.log('Starting fetchWeeklyAggregatedMetrics for asset:', assetSlug);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    console.log('Fetching data from:', thirtyDaysAgo, 'to present');
    // Fetch all metrics data
    const { data: metricsData, error: metricsError } = await supabaseClient.from('asset_metrics').select('*').eq('asset_slug', assetSlug).gte('datetime', thirtyDaysAgo).order('datetime', {
      ascending: true
    });
    if (metricsError) {
      console.error('Error fetching metrics data:', metricsError);
      throw metricsError;
    }
    console.log('Retrieved metrics data:', metricsData?.length || 0, 'records');
    // Helper function to get week number
    const getWeekNumber = (date)=>{
      const start = new Date(date.getFullYear(), 0, 1);
      const diff = date.getTime() - start.getTime();
      const oneWeek = 1000 * 60 * 60 * 24 * 7;
      return Math.floor(diff / oneWeek);
    };
    // Process each metric type
    const processMetricWeekly = (type, valueField)=>{
      try {
        console.log(`Processing metric: ${type} with field: ${valueField}`);
        const metricData = metricsData?.filter((d)=>d.metric_type === type).sort((a, b)=>new Date(a.datetime).getTime() - new Date(b.datetime).getTime()) || [];
        if (metricData.length === 0) {
          console.log(`No data found for metric type: ${type}`);
          return {
            data: [],
            currentValue: 0,
            percentChange24h: 0
          };
        }
        
        console.log(`Found ${metricData.length} records for ${type}`);
        
        // --- Start: Keep weekly aggregation for chart data ---
        const weeklyDataMap = new Map();
        metricData.forEach((d, index)=>{
          try {
            const date = new Date(d.datetime);
            if (isNaN(date.getTime())) {
              console.warn(`Invalid date for ${type} at index ${index}:`, d.datetime);
              return;
            }
            
            const weekNumber = getWeekNumber(date);
            const value = Number(d[valueField]);
            
            if (isNaN(value)) {
              console.warn(`Invalid value for ${type} at index ${index}:`, d[valueField]);
              return;
            }
            
            if (weeklyDataMap.has(weekNumber)) {
              const existing = weeklyDataMap.get(weekNumber);
              // Use the value from the *last* day of the week for aggregation, not sum
              existing.value = value;
              // Update date to the last day's date within that week aggregation
              existing.date = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              });
            } else {
              weeklyDataMap.set(weekNumber, {
                date: date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                }),
                value
              });
            }
          } catch (err) {
            console.error(`Error processing data point for ${type}:`, err, d);
          }
        });
        
        const processedDataForChart = Array.from(weeklyDataMap.values());
        console.log(`Created ${processedDataForChart.length} weekly data points for ${type}`);
        
        // --- End: Keep weekly aggregation for chart data ---
        // --- Start: Calculate currentValue and percentChange24h from latest data ---
        const latestRecord = metricData[metricData.length - 1];
        const currentValue = Number(latestRecord?.[valueField]) || 0;
        
        // Simplified 24h calculation - just look for a record from yesterday
        let record24hAgo = null;
        const latestTime = new Date(latestRecord.datetime).getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        // Look for records within the last 25-30 hours (giving some flexibility)
        for(let i = metricData.length - 2; i >= 0 && i >= metricData.length - 50; i--){
          const recordTime = new Date(metricData[i].datetime).getTime();
          const timeDiff = latestTime - recordTime;
          
          // If we find a record between 20-30 hours ago, use it
          if (timeDiff >= 20 * 60 * 60 * 1000 && timeDiff <= 30 * 60 * 60 * 1000) {
            record24hAgo = metricData[i];
            break;
          }
        }
        
        const previousValue24h = record24hAgo ? Number(record24hAgo[valueField]) || 0 : currentValue;
        const percentChange24h = previousValue24h !== 0 ? 
          (currentValue - previousValue24h) / previousValue24h * 100 : 
          0; // Simplified: just return 0 if no previous value
        
        // --- End: Calculate currentValue and percentChange24h ---
        console.log(`Processed ${type}:`, {
          recordCount: metricData.length,
          weeklyChartPoints: processedDataForChart.length,
          currentValue,
          percentChange24h: isFinite(percentChange24h) ? percentChange24h : 0
        });
        
        return {
          data: processedDataForChart,
          currentValue,
          percentChange24h: isFinite(percentChange24h) ? percentChange24h : 0
        };
      } catch (error) {
        console.error(`Error processing metric ${type}:`, error);
        return {
          data: [],
          currentValue: 0,
          percentChange24h: 0
        };
      }
    };
    const processOHLCWeekly = (type)=>{
      const ohlcData = metricsData?.filter((d)=>d.metric_type === type).sort((a, b)=>new Date(a.datetime).getTime() - new Date(b.datetime).getTime()) || [];
      if (ohlcData.length === 0) {
        console.log(`No data found for metric type: ${type}`);
        return {
          data: [],
          currentOpen: 0,
          currentHigh: 0,
          currentLow: 0,
          currentClose: 0
        };
      }
      // --- Start: Keep weekly aggregation for chart data ---
      const weeklyOHLCMap = new Map();
      ohlcData.forEach((d)=>{
        const date = new Date(d.datetime);
        const weekNumber = getWeekNumber(date);
        const open = Number(d.ohlc_open) || 0;
        const high = Number(d.ohlc_high) || 0;
        const low = Number(d.ohlc_low) || 0;
        const close = Number(d.ohlc_close) || 0;
        if (weeklyOHLCMap.has(weekNumber)) {
          const existing = weeklyOHLCMap.get(weekNumber);
          // Update with the values from the *last* day of the week for aggregation
          existing.open = open;
          existing.high = high;
          existing.low = low;
          existing.close = close;
          // Update date to the last day's date within that week aggregation
          existing.date = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
        } else {
          weeklyOHLCMap.set(weekNumber, {
            date: date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            }),
            open,
            high,
            low,
            close
          });
        }
      });
      const processedDataForChart = Array.from(weeklyOHLCMap.values());
      // --- End: Keep weekly aggregation for chart data ---
      // --- Start: Get current OHLC from the latest record ---
      const latestRecord = ohlcData[ohlcData.length - 1];
      const currentOpen = Number(latestRecord?.ohlc_open) || 0;
      const currentHigh = Number(latestRecord?.ohlc_high) || 0;
      const currentLow = Number(latestRecord?.ohlc_low) || 0;
      const currentClose = Number(latestRecord?.ohlc_close) || 0;
      // --- End: Get current OHLC from the latest record ---
      console.log(`Processed weekly ${type} (Chart Data):`, {
        recordCount: ohlcData.length,
        weeklyChartPoints: processedDataForChart.length,
        currentOpen,
        currentHigh,
        currentLow,
        currentClose
      });
      return {
        data: processedDataForChart,
        currentOpen,
        currentHigh,
        currentLow,
        currentClose
      };
    };
    // Helper function to try multiple metric names and return the first one with data
    const processMetricWithFallbacks = (metricNames, valueField) => {
      for (const metricName of metricNames) {
        const result = processMetricWeekly(metricName, valueField);
        if (result.data && result.data.length > 0) {
          console.log(`Using metric: ${metricName} (found ${result.data.length} data points)`);
          return result;
        }
      }
      console.log(`No data found for any of: ${metricNames.join(', ')}`);
      return { data: [], currentValue: 0, percentChange24h: 0 };
    };

    // Process all metrics with fallback names to handle different sync function naming
    const result = {
      price: processMetricWithFallbacks(['price_usd', 'price_usd_5m', 'daily_closing_price_usd'], 'value'),
      volume: processMetricWithFallbacks(['volume_usd', 'volume_usd_5m'], 'value'),
      marketcap: processMetricWithFallbacks(['marketcap_usd'], 'value'),
      socialVolume: processMetricWithFallbacks(['social_volume_total'], 'value'),
      socialDominance: processMetricWithFallbacks(['social_dominance_total'], 'value'),
      uniqueSocialVolume: processMetricWithFallbacks(['unique_social_volume_total'], 'value'),
      sentimentVolume: processMetricWithFallbacks(['sentiment_volume_consumed_total'], 'value'),
      rsi: processMetricWithFallbacks(['rsi_1d'], 'value'),
      priceVolatility: processMetricWithFallbacks(['price_volatility_1d'], 'value'),
      fullyDilutedValuation: processMetricWithFallbacks(['fully_diluted_valuation_usd'], 'value'),
      meanCoinAge: processMetricWithFallbacks(['mean_coin_age', 'mean_age'], 'value'),
      giniIndex: processMetricWithFallbacks(['gini_index'], 'value'),
      annualInflationRate: processMetricWithFallbacks(['annual_inflation_rate'], 'value'),
      priceBTC: processMetricWithFallbacks(['price_btc'], 'value'),
      priceUSDT: processMetricWithFallbacks(['price_usdt'], 'value'),
      priceOHLC: processOHLCWeekly('price_ohlc')
    };
    console.log('Returning weekly aggregated metrics:', {
      price: result.price.currentValue,
      volume: result.volume.currentValue,
      marketcap: result.marketcap.currentValue,
      socialVolume: result.socialVolume.currentValue,
      socialDominance: result.socialDominance.currentValue,
      uniqueSocialVolume: result.uniqueSocialVolume.currentValue,
      sentimentVolume: result.sentimentVolume.currentValue,
      rsi: result.rsi.currentValue,
      priceVolatility: result.priceVolatility.currentValue,
      fullyDilutedValuation: result.fullyDilutedValuation.currentValue,
      meanCoinAge: result.meanCoinAge.currentValue,
      giniIndex: result.giniIndex.currentValue,
      annualInflationRate: result.annualInflationRate.currentValue,
      priceBTC: result.priceBTC.currentValue,
      priceUSDT: result.priceUSDT.currentValue,
      priceOHLC: {
        open: result.priceOHLC.currentOpen,
        high: result.priceOHLC.currentHigh,
        low: result.priceOHLC.currentLow,
        close: result.priceOHLC.currentClose
      }
    });
    return result;
  } catch (err) {
    console.error('Unexpected error in fetchWeeklyAggregatedMetrics:', err);
    throw err;
  }
}
async function generateMetricAnalysis(metricName, metricData, assetName, assetSymbol) {
  const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash"
  });
  const prompt = `You are a professional cryptocurrency analyst. Analyze the following ${metricName} data for ${assetName} (${assetSymbol}):

Current Value: ${metricData.currentValue.toLocaleString()}
24h Change: ${metricData.percentChange24h.toFixed(2)}%

Consider this metric in terms of its historic relationship to price. Please explain how changes in this metric may have determined future price movement. Be sure to include an explanation of this metric and why it is important

Please provide a detailed analysis including:
1. Current value interpretation
2. 24h change significance
3. Historical context (if data available)
4. Market implications
5. Key takeaways
6. Given where we are in cryptocurrency's 4 year cycle do we expect the value of this asset to increase or decrease in the following weeks? Please note where we are in the cycle and how much time is left on average.

Format the analysis with clear sections and bullet points. Focus on actionable insights and data-backed conclusions. Respond in the style of the economist Fisher Black as if writing a report, OMITTING ANY AND ALL NON REPORT NESSISARY LANGUAGE. Consider whether the recent changes to this data point are good, bad, or neutral for the near term price of this asset. If it is good give it a +1. If it is Neutral give it a zero. If it is bad give it a -1 and add that score to the report`;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const rawText = response.text();
  // Sanitize the text: remove '*' and '#'
  const sanitizedText = rawText.replace(/[*#]/g, '');
  return {
    title: `${metricName} Analysis`,
    content: sanitizedText,
    data: metricData
  };
}
async function generateReport(metrics, assetName, assetSymbol) {
  // Filter to only include metrics with meaningful data
  const availableMetrics = Object.entries(metrics)
    .filter(([_, value]) => {
      // Must be an object with currentValue
      if (!value || typeof value !== 'object' || !('currentValue' in value)) {
        return false;
      }
      
      // Must have a meaningful current value (not zero or very close to zero)
      const currentValue = Number(value.currentValue) || 0;
      if (Math.abs(currentValue) < 0.000001) {
        console.log(`Skipping ${_} - currentValue is zero or near-zero:`, currentValue);
        return false;
      }
      
      // Must have chart data with multiple points
      const valueWithData = value as any;
      if (!('data' in value) || !valueWithData.data || !Array.isArray(valueWithData.data) || valueWithData.data.length < 2) {
        console.log(`Skipping ${_} - insufficient chart data:`, valueWithData.data?.length || 0);
        return false;
      }
      
      // Check if all data points are zero (meaningless data)
      const hasNonZeroData = valueWithData.data.some((point: any) => {
        const val = Number(point.value) || 0;
        return Math.abs(val) > 0.000001;
      });
      
      if (!hasNonZeroData) {
        console.log(`Skipping ${_} - all data points are zero`);
        return false;
      }
      
      return true;
    })
    .map(([key, value]) => ({
      name: key,
      data: value
    }));
    
  console.log('Metrics with meaningful data:', availableMetrics.map((m) => m.name));
  console.log('Skipped metrics due to zero/no data:', 
    Object.keys(metrics).filter(key => !availableMetrics.find(m => m.name === key))
  );
  
  const analyses = [];
  for (const metric of availableMetrics) {
    try {
      console.log(`[LOG] Generating analysis for meaningful metric: ${metric.name}`);
      const analysis = await generateMetricAnalysis(metric.name, metric.data, assetName, assetSymbol);
      console.log(`[LOG] Finished analysis for metric: ${metric.name}`);
      analyses.push(analysis);
    } catch (error) {
      console.error(`Error generating analysis for ${metric.name}:`, error);
    }
  }
  return analyses;
}
async function generateChartImage(data, title, color) {
  // Increased dimensions for better visibility
  const width = 900;
  const height = 450;
  const padding = 60;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Modern light background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Subtle grid
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 0.5;
  const gridSpacing = chartHeight / 6;
  
  // Draw grid lines
  for (let i = 0; i <= 6; i++) {
    const y = padding + i * gridSpacing;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Calculate scales
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue;
  const scaleY = chartHeight / valueRange;

  // Area fill with modern opacity
  ctx.fillStyle = `${color}15`;
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  
  data.forEach((point, i) => {
    const x = padding + i * chartWidth / (data.length - 1);
    const y = height - padding - (point.value - minValue) * scaleY;
    if (i === 0) {
      ctx.lineTo(x, y);
    } else {
      const prevX = padding + (i - 1) * chartWidth / (data.length - 1);
      const prevY = height - padding - (data[i - 1].value - minValue) * scaleY;
      const cp1x = prevX + (x - prevX) * 0.5;
      const cp1y = prevY;
      const cp2x = cp1x;
      const cp2y = y;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    }
  });

  ctx.lineTo(width - padding, height - padding);
  ctx.closePath();
  ctx.fill();

  // Main line with modern styling
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw smooth curve
  ctx.beginPath();
  data.forEach((point, i) => {
    const x = padding + i * chartWidth / (data.length - 1);
    const y = height - padding - (point.value - minValue) * scaleY;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      const prevX = padding + (i - 1) * chartWidth / (data.length - 1);
      const prevY = height - padding - (data[i - 1].value - minValue) * scaleY;
      const cp1x = prevX + (x - prevX) * 0.5;
      const cp1y = prevY;
      const cp2x = cp1x;
      const cp2y = y;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    }
  });
  ctx.stroke();

  // Modern data points
  data.forEach((point, i) => {
    const x = padding + i * chartWidth / (data.length - 1);
    const y = height - padding - (point.value - minValue) * scaleY;
    
    // Point glow
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = `${color}33`;
    ctx.fill();
    
    // Point
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  // Modern typography
  ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, padding - 20);

  // Value labels
  ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  
  // Format large numbers
  const formatValue = (value) => {
    if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
    return value.toFixed(2);
  };

  for (let i = 0; i <= 6; i++) {
    const value = minValue + valueRange * i / 6;
    const y = padding + i * gridSpacing;
    ctx.fillText(formatValue(value), padding - 10, y + 4);
  }

  // Date labels
  ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  
  // Show fewer date labels
  const dateLabelInterval = Math.ceil(data.length / 6);
  data.forEach((point, i) => {
    if (i % dateLabelInterval === 0) {
      const x = padding + i * chartWidth / (data.length - 1);
      const date = new Date(point.date);
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ctx.fillText(label, x, height - padding + 20);
    }
  });

  return canvas.toDataURL('image/png');
}
async function generatePDFReport(analyses, assetName, assetSymbol, aggregateScoreData = null) {
  console.log('Starting PDF generation...');
  try {
    // Generate overall analysis
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });
    const overallPrompt = `You are a professional cryptocurrency analyst. Provide a comprehensive overview analysis of ${assetName} (${assetSymbol}) based on the following metrics:

${analyses.map((analysis)=>`
${analysis.title}:
- Current Value: ${analysis.data.currentValue.toLocaleString()}
- 24h Change: ${analysis.data.percentChange24h.toFixed(2)}%
`).join('\n')}

Please provide a detailed executive summary including:
1. Overall market position and performance
2. Key strengths and weaknesses
3. Market sentiment and trends
4. Risk assessment
5. Future outlook

Format the analysis with clear sections and bullet points. Focus on actionable insights and data-backed conclusions. Do not use asterisks (*) in the text.`;
    const overallResult = await model.generateContent(overallPrompt);
    const overallResponse = await overallResult.response;
    const rawOverallText = overallResponse.text();
    // Sanitize the text: remove '*' and '#'
    const sanitizedOverallText = rawOverallText.replace(/[*#]/g, '');
    
    // Generate chart images for each analysis - fix indexing issue with better debugging
    const chartImages: Array<{title: string, image: string} | null> = [];
    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      console.log(`[CHART DEBUG] Processing chart ${i} for: ${analysis.title}`);
      console.log(`[CHART DEBUG] Data available:`, !!analysis.data.data);
      console.log(`[CHART DEBUG] Data length:`, analysis.data.data?.length || 0);
      
      if (analysis.data.data && analysis.data.data.length > 0) {
        try {
          // Log first few data points to debug format
          console.log(`[CHART DEBUG] Sample data points:`, analysis.data.data.slice(0, 3));
          
          const chartImage = await generateChartImage(analysis.data.data, analysis.title, '#222');
          chartImages[i] = {
            title: analysis.title,
            image: chartImage
          };
          console.log(`[CHART DEBUG] ✅ Successfully generated chart for: ${analysis.title}`);
        } catch (error) {
          console.error(`[CHART DEBUG] ❌ Failed to generate chart for ${analysis.title}:`, error);
          chartImages[i] = null;
        }
      } else {
        console.log(`[CHART DEBUG] ❌ No data available for: ${analysis.title}`);
        chartImages[i] = null;
      }
    }
    
    // Format aggregate score for display
    const formatAggregateScore = (scoreData) => {
      if (!scoreData || !scoreData.success) return { display: 'N/A', color: '#888', label: 'NO DATA' };
      
      const score = scoreData.score || 0;
      const priceChange = scoreData.priceChange || 0;
      const metricCount = scoreData.metricCount || 0;
      
      let color, label, display;
      
      // Updated scoring ranges for -15 to +15 scale with more descriptive labels
      if (score >= 10) {
        color = '#059669'; // Dark green
        label = 'EXTREMELY BULLISH';
        display = `+${score}`;
      } else if (score >= 5) {
        color = '#10b981'; // Green
        label = 'MODERATELY BULLISH';
        display = `+${score}`;
      } else if (score >= 2) {
        color = '#34d399'; // Light green
        label = 'SLIGHTLY BULLISH';
        display = `+${score}`;
      } else if (score >= -1 && score <= 1) {
        color = '#6b7280'; // Gray
        label = 'NEUTRAL';
        display = score >= 0 ? `+${score}` : `${score}`;
      } else if (score >= -4) {
        color = '#f87171'; // Light red
        label = 'SLIGHTLY BEARISH';
        display = `${score}`;
      } else if (score >= -9) {
        color = '#dc2626'; // Red
        label = 'MODERATELY BEARISH';
        display = `${score}`;
      } else {
        color = '#991b1b'; // Dark red
        label = 'EXTREMELY BEARISH';
        display = `${score}`;
      }
      
      return { display, color, label, priceChange: priceChange.toFixed(2), metricCount };
    };
    
    const scoreInfo = formatAggregateScore(aggregateScoreData);
    
    // Generate HTML content with a page for each analysis
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${assetName} (${assetSymbol}) Analysis Report</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
      
body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        line-height: 1.6;
        color: #1a1a1a;
  margin: 0;
  padding: 0;
}

/* Page break utilities */
.page-break {
  page-break-after: always;
  break-after: page;
}

.avoid-break {
  page-break-inside: avoid;
  break-inside: avoid;
}

/* Top bar for cover and sections */
.top-bar, .section-top-bar {
  width: 100vw;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #222;
  padding: 18px 32px 6px 32px;
  box-sizing: border-box;
  margin: 0;
}

/* Cover page layout */
.cover {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  background: #f7f8f6;
  position: relative;
  page-break-after: always;
  break-after: page;
  margin: 0;
  padding: 0;
}
.cover-logo-row {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 32px;
}
.cover-logo-svg {
  width: 320px;
  height: 64px;
}
.cover-image-row {
  display: flex;
  align-items: flex-start;
  margin: 48px 0 0 80px;
}
.cover-geo-img {
  width: 220px;
  height: 220px;
  background: #eee;
  border-radius: 0 32px 0 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-geo-svg {
  width: 100%;
  height: 100%;
}

/* Aggregate Score Section - moved to bottom of cover page */
.cover-score-section {
  margin: 40px 40px 20px 40px;
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  border-left: 6px solid ${scoreInfo.color};
}
.cover-score-header {
  font-size: 14px;
  font-weight: 700;
  color: #666;
  letter-spacing: 1px;
  margin-bottom: 16px;
}
.cover-score-main {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 12px;
}
.cover-score-value {
  font-size: 72px;
  font-weight: 900;
  color: ${scoreInfo.color};
  line-height: 1;
  font-family: 'Inter', sans-serif;
}
.cover-score-label {
  font-size: 24px;
  font-weight: 700;
  color: ${scoreInfo.color};
  letter-spacing: 1px;
}
.cover-score-details {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.cover-title-row {
  margin: 20px 0 0 0;
  padding: 0 0 0 40px;
  position: relative;
}
.cover-title-bg {
  background: #f3f4f2;
  display: inline-block;
        padding: 20px 24px 16px 24px;
  border-radius: 4px;
        font-size: 28px;
  font-weight: 900;
        letter-spacing: -1px;
        line-height: 1.4;
  position: relative;
  z-index: 2;
}
.cover-title-arrow {
  position: absolute;
  right: 40px;
  top: 40px;
  width: 180px;
  height: 180px;
  opacity: 0.08;
  z-index: 1;
}
.cover-footer {
  font-size: 10px;
  color: #181818;
  padding: 0 0 24px 40px;
  font-weight: 700;
}

/* Section/analysis layout */
.section {
  page-break-before: always;
  break-before: page;
  padding: 0 40px 40px 40px;
  margin: 0;
  min-height: 90vh;
}

/* Remove forced page breaks from sections except for the last analysis section */
.section:not(.last-section) {
  page-break-after: auto;
  break-after: auto;
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  margin-top: 40px;
  margin-bottom: 20px;
  position: relative;
}
.section-number {
  font-size: 56px;
  font-weight: 900;
  color: rgb(206,202,185);
  line-height: 1;
  margin-right: 18px;
        font-family: 'Inter', sans-serif;
}
.section-title {
  font-size: 38px;
  font-weight: 900;
  color: #181818;
        line-height: 1.2;
  margin-right: 18px;
        margin-bottom: 20px;
        font-family: 'Inter', sans-serif;
}
.section-arrow-svg {
  width: 48px;
  height: 48px;
  margin-left: 12px;
}
.section-meta {
  font-size: 12px;
  color: #888;
  margin-top: 8px;
  margin-bottom: 24px;
}

/* Executive summary columns */
.exec-summary {
  display: flex;
  flex-direction: row;
  gap: 40px;
  margin-top: 32px;
  page-break-inside: avoid;
  break-inside: avoid;
}
.exec-summary-col {
  flex: 1;
}
.analysis-title {
  font-size: 28px;
  font-weight: 900;
  margin-bottom: 16px;
}

/* Chart and analysis */
.chart-container {
  width: 100%;
  margin: 32px 0 32px 0;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  page-break-inside: avoid;
  break-inside: avoid;
}
.chart-image {
  width: 100%;
  height: 240px;
  object-fit: contain;
  filter: grayscale(1) contrast(1.2);
}
.analysis-section {
  margin-top: 40px;
}
.analysis-meta {
  font-size: 12px;
  color: #888;
  margin-bottom: 16px;
}
.analysis-score {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
}

/* Footer and disclaimer */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  font-size: 10px;
  color: #181818;
  padding: 0 40px 16px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-number {
  font-weight: 700;
}
.disclaimer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
  color: #888;
  font-size: 9pt;
}

/* Print-specific fixes */
@media print {
  .cover {
    page-break-after: always !important;
    break-after: page !important;
  }
  
  .section:not(.last-section) {
    page-break-after: auto !important;
    break-after: auto !important;
  }
  
  body {
    margin: 0 !important;
    padding: 0 !important;
  }
}
</style>
    </head>
    <body>
      <!-- Cover Page -->
      <div class="cover">
  <div class="top-bar">
    <span>ANALYSIS REPORT</span>
    <span>FUTURE CAST AI</span>
  </div>
  <div class="cover-logo-row">
    <!-- Placeholder SVG logo with split color -->
    <svg class="cover-logo-svg" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="35" font-family="'Inter', sans-serif" font-size="40" font-weight="900" fill="#181818">FUTURECAST</text>
      <text x="0" y="70" font-family="'Inter', sans-serif" font-size="40" font-weight="900" fill="#cecab9">AI</text>
      <g transform="translate(280,10)">
        <path d="M0 24 L24 0 M12 0 L24 0 L24 12" stroke="#181818" stroke-width="4"/>
      </g>
    </svg>
  </div>
  
  <div class="cover-image-row">
    <div class="cover-geo-img">
      <!-- Placeholder geometric SVG with cut corner -->
      <svg class="cover-geo-svg" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#bbb"/>
            <stop offset="100%" stop-color="#eee"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="220" height="220" fill="url(#grad1)"/>
        <polygon points="220,0 220,60 160,0" fill="#f7f8f6"/>
        <rect x="40" y="40" width="140" height="140" fill="#222" opacity="0.12"/>
      </svg>
    </div>
  </div>
  <div class="cover-title-row">
    <div style="background: #f3f4f2; display: inline-block; padding: 24px 28px; border-radius: 4px; font-size: 20px; font-weight: 900; letter-spacing: 0px; line-height: 1.8; position: relative; z-index: 2; margin: 15px 0; text-align: center;">
  ${assetName.toUpperCase()} (${assetSymbol.toUpperCase()})<br><br>ANALYSIS REPORT
    </div>
    <div class="cover-title-arrow">
      <!-- Large faint arrow SVG -->
      <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.5">
          <path d="M0 180 L180 0" stroke="#cecab9" stroke-width="16"/>
          <path d="M120 0 L180 0 L180 60" stroke="#cecab9" stroke-width="16"/>
        </g>
      </svg>
    </div>
  </div>
  
  <!-- Aggregate Score Section - moved to bottom of cover page -->
  <div class="cover-score-section" style="margin-top: 60px;">
    <div class="cover-score-header">AGGREGATE MARKET SCORE</div>
    <div class="cover-score-main">
      <div class="cover-score-value">${scoreInfo.display}</div>
      <div class="cover-score-label">${scoreInfo.label}</div>
    </div>
    <div class="cover-score-details">
      Based on comprehensive analysis of ${scoreInfo.metricCount || 'multiple'} market metrics | Score range: -15 (Extremely Bearish) to +15 (Extremely Bullish)
    </div>
  </div>
  
  <div class="cover-footer">
    ${assetName.toUpperCase()} (${assetSymbol.toUpperCase()}) ANALYSIS REPORT
  </div>
</div>

      <!-- Executive Summary -->
      <div class="section">
  <div class="section-top-bar">
    <span>EXECUTIVE SUMMARY</span>
    <span style="font-weight:900;">02</span>
  </div>
  <div class="section-header">
    <span class="section-number">01</span>
    <span class="section-title">EXECUTIVE SUMMARY</span>
    <span class="section-arrow-svg">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.5">
          <path d="M0 48 L48 0" stroke="#cecab9" stroke-width="6"/>
          <path d="M32 0 L48 0 L48 16" stroke="#cecab9" stroke-width="6"/>
        </g>
      </svg>
    </span>
  </div>
  <div class="section-meta">
    ${assetName.toUpperCase()} (${assetSymbol.toUpperCase()}) MARKET &nbsp; | &nbsp; ANALYSIS: PROBABILISTIC PERSPECTIVE
  </div>
  
  <div class="exec-summary">
    <div style="margin-top: 32px; width: 100%;">
      <div class="analysis-title" style="font-family: 'Inter', sans-serif; font-weight: 700;">EXECUTIVE SUMMARY</div>
      <div style="width: 100%; max-width: none; margin-top: 20px;">
        ${sanitizedOverallText.split('\n').filter(line => line.trim().length > 0).map((line) => {
          // If line looks like a header (short and ends with colon or has capital letters)
          if (line.length < 80 && (line.endsWith(':') || /^[A-Z\s]+$/.test(line.trim()))) {
            return `<h3 style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 16px; color: #181818; margin: 25px 0 10px 0;">${line}</h3>`;
          }
          // Regular content as bullet points
          else {
            return `<ul style="margin: 5px 0 5px 20px;"><li style="margin-bottom: 8px; line-height: 1.6; font-family: 'Inter', sans-serif;">${line}</li></ul>`;
          }
        }).join('')}
      </div>
      
      <!-- Add separator -->
      <div style="text-align: center; font-size: 24px; color: #cecab9; margin: 30px 0; letter-spacing: 8px; font-family: 'Inter', sans-serif;">///</div>
  </div>
</div>

      <!-- Analysis Pages -->
      ${analyses.map((analysis, index)=>`
<div class="section${index === analyses.length - 1 ? ' last-section' : ''}">
  <div class="section-top-bar">
    <span>${analysis.title.replace(' Analysis','').toUpperCase()}</span>
    <span style="font-weight:900;">${(index+3).toString().padStart(2,'0')}</span>
  </div>
  <div class="section-header">
    <span class="section-number">${(index+2).toString().padStart(2,'0')}</span>
    <span class="section-title">${analysis.title.replace(' Analysis','').toUpperCase()}</span>
    <span class="section-arrow-svg">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.5">
          <path d="M0 48 L48 0" stroke="#cecab9" stroke-width="6"/>
          <path d="M32 0 L48 0 L48 16" stroke="#cecab9" stroke-width="6"/>
        </g>
      </svg>
    </span>
  </div>
  <div class="section-meta">
    Current Value: <b>${analysis.data.currentValue.toLocaleString()}</b> &nbsp; | &nbsp; 24h Change: <b>${analysis.data.percentChange24h.toFixed(2)}%</b>
  </div>
  <div class="chart-container">
    ${chartImages[index] && chartImages[index].image ? `<img class="chart-image" src="${chartImages[index].image}" alt="${analysis.title} Chart">` : '<div style="height: 240px; display: flex; align-items: center; justify-content: center; color: #888; font-style: italic;">Chart data unavailable</div>'}
  </div>
  <div class="analysis-section">
    ${analysis.content.split('\n').filter(line => line.trim().length > 0).map((line) => {
      // If line looks like a header (short and ends with colon or has capital letters)
      if (line.length < 80 && (line.endsWith(':') || /^[A-Z\s]+$/.test(line.trim()))) {
        return `<h3 style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 16px; color: #181818; margin: 25px 0 10px 0;">${line}</h3>`;
      }
      // Regular content as bullet points
      else {
        return `<ul style="margin: 5px 0 5px 20px;"><li style="margin-bottom: 8px; line-height: 1.6; font-family: 'Inter', sans-serif;">${line}</li></ul>`;
      }
    }).join('')}
    
    <!-- Add separator after each analysis section -->
    <div style="text-align: center; font-size: 24px; color: #cecab9; margin: 30px 0; letter-spacing: 8px; font-family: 'Inter', sans-serif;">///</div>
  </div>
</div>
      `).join('')}
      
      <div class="disclaimer">
        <p>This report was automatically generated based on current market data and metrics. The information provided should not be considered as financial advice. Always conduct your own research before making investment decisions.</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
    // Convert HTML to PDF using PDFShift API
    console.log('Converting HTML to PDF using PDFShift...');
    const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa('api:' + Deno.env.get('PDF_API_KEY'))}`
      },
      body: JSON.stringify({
        source: htmlContent,
        landscape: false,
        use_print: false
      })
    });
    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.statusText}`);
    }
    const pdfBuffer = new Uint8Array(await response.arrayBuffer());
    console.log('PDF generation successful!');
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}
function createASCIIChart(data, width = 50, height = 10) {
  if (data.length === 0) return '';
  // Handle both regular metrics and OHLC data
  const values = data.map((d)=>{
    if ('value' in d) {
      return d.value;
    } else {
      return d.close; // Use closing price for OHLC data
    }
  });
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const chart = [];
  const step = Math.ceil(data.length / width);
  for(let y = height; y >= 0; y--){
    const line = [];
    const threshold = min + range * y / height;
    for(let x = 0; x < width; x++){
      const index = Math.min(Math.floor(x * step), data.length - 1);
      const point = data[index];
      const value = 'value' in point ? point.value : point.close;
      line.push(value >= threshold ? '█' : ' ');
    }
    chart.push(line.join(''));
  }
  // Add x-axis labels
  const labels = [];
  for(let x = 0; x < width; x += 10){
    const index = Math.min(Math.floor(x * step), data.length - 1);
    labels.push(data[index].date.padEnd(10));
  }
  chart.push(labels.join(''));
  return chart.join('\n');
}
async function generateTextReport(metrics, assetName, assetSymbol, aiReport) {
  let report = `# ${assetName} (${assetSymbol}) Analysis Report\n\n`;
  // Split AI report into sections
  const sections = aiReport.split('\n\n').filter((section)=>section.trim());
  // Process each section
  for (const [index, section] of sections.entries()){
    // Add section title
    const title = section.split('\n')[0];
    report += `## ${title}\n\n`;
    // Add section content
    report += section.split('\n').slice(1).join('\n') + '\n\n';
    // Add corresponding chart if available
    const metricKey = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (metrics[metricKey]) {
      const metricData = metrics[metricKey];
      if ('data' in metricData && metricData.data.length > 0) {
        report += '```\n';
        report += createASCIIChart(metricData.data);
        report += '\n```\n\n';
      }
    }
    report += '---\n\n';
  }
  // Add disclaimer
  report += '*This report was automatically generated based on current market data and metrics. ' + 'The information provided should not be considered as financial advice. ' + 'Always conduct your own research before making investment decisions.*\n';
  return report;
}
function arrayBufferToBase64(buffer) {
  const CHUNK_SIZE = 0x8000; // 32KB chunks
  let binary = '';
  const len = buffer.length;
  for(let i = 0; i < len; i += CHUNK_SIZE){
    const chunk = buffer.slice(i, Math.min(i + CHUNK_SIZE, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}
async function sendSimpleNotificationEmail(userEmails, assetName, assetSymbol) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  
  try {
    const userName = Array.isArray(userEmails) && userEmails.length > 0 ? userEmails[0].split('@')[0] : 'Valued User';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Market Report Update - ${assetName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin:0; padding:0; background:#393939; font-family: 'Inter', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#393939;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff; margin:40px 0; border-radius:8px; overflow:hidden;">
                <tr>
                  <td style="padding:40px 30px; background:#232323; text-align:center;">
                    <h1 style="color:#fff; font-family:'Inter',sans-serif; font-size:28px; font-weight:700; margin:0;">FUTURECAST AI</h1>
                    <p style="color:#cecab9; font-size:14px; margin:10px 0 0 0; font-family:'Inter',sans-serif;">MARKET UPDATE</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px 30px;">
                    <h2 style="margin:0 0 12px 0; font-size:1.25rem; color:#232323; font-weight:600; font-family:'Inter',sans-serif;">Hi ${userName},</h2>
                    <p style="margin:0 0 18px 0; color:#232323; font-size:1rem; font-weight:500; font-family:'Inter',sans-serif;">YOUR ${assetName.toUpperCase()} (${assetSymbol.toUpperCase()}) MARKET UPDATE</p>
                    <div style="background:#f6f6f6; border-radius:8px; padding:24px; margin:24px 0;">
                      <p style="margin:0 0 16px 0; color:#232323; font-size:1rem; line-height:1.6; font-family:'Inter',sans-serif;">We're currently experiencing high demand for our AI analysis reports. Your detailed PDF report will be available soon.</p>
                      <p style="margin:0 0 16px 0; color:#232323; font-size:1rem; line-height:1.6; font-family:'Inter',sans-serif;">In the meantime, we've successfully updated your market data and scoring metrics for ${assetName}.</p>
                      <p style="margin:0; color:#232323; font-size:1rem; line-height:1.6; font-family:'Inter',sans-serif;"><strong>Your full analysis report will be delivered within the next few hours.</strong></p>
                    </div>
                    <p style="margin:24px 0 0 0; color:#232323; font-size:0.95rem; font-family:'Inter',sans-serif;">Thank you for your patience,<br><span style="font-weight:600;">- THE FUTURECAST AI TEAM</span></p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 30px 24px 30px; text-align:center; background:#fff;">
                    <p style="color:#888; font-size:0.9rem; margin:0; font-family:'Inter',sans-serif;">© ${new Date().getFullYear()} Futurecast AI. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: 'Future Cast <reports@futurecast.pro>',
      to: userEmails,
      subject: `${assetName} (${assetSymbol}) Market Update - Report Processing`,
      html: htmlContent
    });

    console.log('Simple notification email sent successfully');
  } catch (e) {
    console.error('Error sending notification email:', e);
    throw e;
  }
}

async function sendEmailReport(userEmails, assetName, assetSymbol, analyses, pdfBuffer) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  try {
    // Convert Uint8Array to base64 using chunked conversion
    const base64PDF = arrayBufferToBase64(pdfBuffer);
    // Generate HTML content for email
    const userName = Array.isArray(userEmails) && userEmails.length > 0 ? userEmails[0].split('@')[0] : 'Valued User';
    const reportLink = '#'; // TODO: Replace with actual report link if available
    const unsubscribeLink = '#'; // TODO: Replace with actual unsubscribe link if available
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Latest Market Report Powered by Futurecast AI</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin:0; padding:0; background:#393939; font-family: 'Inter', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#393939;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff; margin:40px 0; border-radius:8px; overflow:hidden;">
                <!-- Simple Header without images -->
                <tr>
                  <td style="padding:40px 30px; background:#232323; text-align:center;">
                    <h1 style="color:#fff; font-family:'Inter',sans-serif; font-size:28px; font-weight:700; margin:0;">FUTURECAST AI</h1>
                    <p style="color:#cecab9; font-size:14px; margin:10px 0 0 0; font-family:'Inter',sans-serif;">MARKET ANALYSIS REPORT</p>
                  </td>
                </tr>
                <!-- Main content -->
                <tr>
                  <td style="padding:40px 30px 30px 30px;">
                    <h1 style="font-size:2rem; font-weight:600; color:#232323; margin:0 0 16px 0; letter-spacing:-1px; font-family:'Inter',sans-serif;">EFFORTLESS<br>MARKET CLARITY,<br>DELIVERED</h1>
                    <hr style="border:none; border-top:2px solid #e5e5e5; margin:16px 0 32px 0; width:80%;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f6f6; border-radius:8px;">
                      <tr>
                        <td style="padding:32px 24px;">
                          <h2 style="margin:0 0 12px 0; font-size:1.25rem; color:#232323; font-weight:600; font-family:'Inter',sans-serif;">Hi ${userName},</h2>
                          <p style="margin:0 0 18px 0; color:#232323; font-size:1rem; font-weight:500; font-family:'Inter',sans-serif;">YOUR LATEST FINANCIAL REPORT FROM FUTURECAST AI IS HERE.</p>
                          <p style="margin:0 0 24px 0; color:#232323; font-size:1rem; line-height:1.6; font-family:'Inter',sans-serif;">This report gives you a clear overview of market movements and asset performance, powered by our AI engine. Designed to help you stay informed—quickly and confidently.</p>
                          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                            <tr>
                              <td>
                                <a href="${reportLink}" style="display:inline-block; background:#232323; color:#fff; text-decoration:none; font-weight:600; font-size:1rem; padding:14px 32px; border-radius:4px; letter-spacing:0.5px; font-family:'Inter',sans-serif;">
                                  → VIEW YOUR REPORT
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0 0 8px 0; color:#232323; font-size:1rem; font-weight:600; font-family:'Inter',sans-serif;">THANK YOU FOR USING FUTURECAST AI.</p>
                          <p style="margin:0 0 0 0; color:#232323; font-size:0.95rem; font-family:'Inter',sans-serif;">For questions or feedback, feel free to reach out.</p>
                          <p style="margin:18px 0 0 0; color:#232323; font-size:0.95rem; font-family:'Inter',sans-serif;">Stay ahead,<br><span style="font-weight:600;">- THE FUTURECASTAI TEAM</span></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding:32px 30px 24px 30px; text-align:center; background:#fff;">
                    <p style="color:#888; font-size:0.9rem; margin:0 0 8px 0; font-family:'Inter',sans-serif;">You are receiving this email because you subscribed to Futurecast AI.<br>To unsubscribe, <a href="${unsubscribeLink}" style="color:#888; text-decoration:underline;">click here</a></p>
                    <p style="color:#888; font-size:0.9rem; margin:0; font-family:'Inter',sans-serif;">© ${new Date().getFullYear()} Futurecast AI. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    await resend.emails.send({
      from: 'Future Cast <reports@futurecast.pro>',
      to: userEmails,
      subject: `${assetName} (${assetSymbol}) Analysis Report`,
      html: htmlContent,
      attachments: [
        {
          filename: `${assetName}_${assetSymbol}_Analysis_Report.pdf`,
          content: base64PDF
        }
      ]
    });
    console.log('Email sent successfully with PDF attachment');
  } catch (e) {
    console.error('Error sending email:', e);
    throw e;
  }
}
// Score extraction and database persistence functions
async function saveAggregateScoreViaRPC(supabaseClient, assetSlug, metrics) {
  try {
    console.log('💾 Saving aggregate score via RPC for asset:', assetSlug);
    
    // Calculate individual metric scores that sum to total aggregate
    const scoreResult = await calculateSimpleAggregateScore(metrics, assetSlug);
    const {
      aggregateScore,
      normalizedScore,
      metricCount,
      individualScores,
      metricChanges
    } = scoreResult;
    
    console.log('Score calculation result:', scoreResult);
    
    // Get the primary price change for the score_change field (backwards compatibility)
    const priceChange24h = metrics.price?.percentChange24h || 0;
    
    // Try multiple RPC approaches
    console.log('🔧 Testing RPC function existence...');
    
    // First, try to call a simple built-in function to test RPC works
    try {
      const { data: testRpc, error: testError } = await supabaseClient.rpc('version');
      console.log('Built-in RPC test:', { testRpc, testError });
    } catch (rpcTestError) {
      console.log('Built-in RPC failed:', rpcTestError);
    }
    
    // Approach 1: Named parameters with individual metric scores
    console.log('🔧 Trying named parameters approach with individual scores...');
    const { data: data1, error: error1 } = await supabaseClient.rpc('save_aggregate_score', {
      p_asset_slug: assetSlug,
      p_price_change: priceChange24h,
      p_score: aggregateScore,
      p_metric_scores: individualScores,
      p_metric_count: metricCount
    });
    
    console.log('Named parameters result:', { data: data1, error: error1 });
    
    if (!error1) {
      console.log('✅ Named parameters approach worked!');
      return { 
        success: true, 
        score: aggregateScore, 
        normalizedScore,
        priceChange: priceChange24h,
        metricCount,
        individualScores,
        metricChanges,
        data: data1
      };
    }
    
    // Approach 2: Try without individual scores (backwards compatibility)
    console.log('🔧 Trying backwards compatible approach...');
    const { data: data2, error: error2 } = await supabaseClient.rpc('save_aggregate_score', {
      p_asset_slug: assetSlug,
      p_price_change: priceChange24h,
      p_score: aggregateScore
    });
    
    console.log('Backwards compatible result:', { data: data2, error: error2 });
    
    if (!error2) {
      console.log('✅ Backwards compatible approach worked!');
      return { 
        success: true, 
        score: aggregateScore, 
        normalizedScore,
        priceChange: priceChange24h,
        metricCount,
        individualScores,
        metricChanges,
        data: data2
      };
    }
    
    // Approach 3: Try calling with raw SQL as fallback
    console.log('🔧 Trying raw SQL approach as fallback...');
    const metricScoresJson = JSON.stringify(individualScores).replace(/'/g, "''");
    const { data: data3, error: error3 } = await supabaseClient
      .rpc('exec_sql', { 
        sql: `SELECT save_aggregate_score('${assetSlug}', ${priceChange24h}, ${aggregateScore}, '${metricScoresJson}'::jsonb, ${metricCount});`
      });
    
    console.log('Raw SQL result:', { data: data3, error: error3 });
    
    if (!error3) {
      console.log('✅ Raw SQL approach worked!');
      return { 
        success: true, 
        score: aggregateScore, 
        normalizedScore,
        priceChange: priceChange24h,
        metricCount,
        individualScores,
        metricChanges,
        data: data3
      };
    }
    
    // If all approaches fail
    console.log('❌ All RPC approaches failed');
    return { 
      success: false, 
      error: `All RPC approaches failed. Named: ${error1?.message}, Backwards: ${error2?.message}, SQL: ${error3?.message}`
    };
    
  } catch (error) {
    console.error('Error in saveAggregateScoreViaRPC:', error);
    return { success: false, error: error.message };
  }
}

async function calculateSimpleAggregateScore(metrics, assetSlug) {
  console.log('Calculating individual metric scores for asset:', assetSlug);
  
  let totalScore = 0;
  const individualScores = {};
  const metricChanges = {};
  
  // Dynamic scoring - process ALL available metrics that have percentChange24h data
  console.log('Available metrics to score:', Object.keys(metrics));
  
  Object.entries(metrics).forEach(([metricName, data]) => {
    // Skip OHLC data as it doesn't have percentChange24h
    if (metricName === 'priceOHLC') {
      console.log(`${metricName}: skipping OHLC data (no percentage change)`);
      return;
    }
    
    if (data && typeof data.percentChange24h === 'number' && !isNaN(data.percentChange24h)) {
      let score = 0;
      const change = data.percentChange24h;
      
      // Simple scoring: positive change = +1, negative = -1, very small changes = 0
      if (change > 2) score = 1;
      else if (change < -2) score = -1;
      else score = 0;
      
      // Add to total (each metric contributes equally)
      totalScore += score;
      individualScores[metricName] = score;
      metricChanges[metricName] = change;
      
      console.log(`${metricName}: ${change.toFixed(2)}% → score: ${score}`);
    } else {
      // Track metrics that couldn't be scored
      individualScores[metricName] = 0;
      metricChanges[metricName] = 0;
      console.log(`${metricName}: no valid data available → score: 0`);
    }
  });
  
  const metricCount = Object.keys(individualScores).length;
  const normalizedScore = metricCount > 0 ? Math.round((totalScore / metricCount) * 100) : 0;
  
  console.log(`Individual scores:`, individualScores);
  console.log(`Metric changes:`, metricChanges);
  console.log(`Total aggregate score: ${totalScore} (from ${metricCount} metrics)`);
  console.log(`Score range: -${metricCount} to +${metricCount} (${metricCount} metrics × ±1)`);
  console.log(`Normalized score: ${normalizedScore}%`);
  
  return {
    aggregateScore: totalScore,
    normalizedScore,
    metricCount,
    individualScores,
    metricChanges
  };
}

serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { asset_slug, assetName, assetSymbol, userEmails } = await req.json();
    console.log('Received request with parameters:', {
      asset_slug,
      assetName,
      assetSymbol,
      userEmails
    });
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // Log connection details for debugging (mask the key)
    console.log('🔗 Database Connection Debug:');
    console.log('SUPABASE_URL:', supabaseUrl);
    console.log('SERVICE_KEY (masked):', supabaseKey ? `${supabaseKey.substring(0, 20)}...${supabaseKey.slice(-10)}` : 'MISSING');
    console.log('Using SERVICE_ROLE_KEY:', !!Deno.env.get('SERVICE_ROLE_KEY'));
    console.log('Using SUPABASE_SERVICE_ROLE_KEY:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Test database connection by checking which database we're connected to
    console.log('🧪 Testing database connection...');
    try {
      const { data: dbTest, error: dbError } = await supabaseClient
        .from('asset_aggregate_scores')
        .select('count')
        .limit(1);
      console.log('Database connection test - success:', !dbError);
      console.log('Database connection test - error:', dbError);
      
      // Test: Can we see the table structure?
      console.log('🔍 Testing table existence...');
      const { data: tableTest, error: tableError } = await supabaseClient
        .rpc('exec_sql', { 
          sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'asset_aggregate_scores' AND table_schema = 'public' ORDER BY ordinal_position;`
        });
      console.log('Table structure test - data:', tableTest);
      console.log('Table structure test - error:', tableError);
      
      // Test: Try a direct insert with raw SQL
      console.log('🔧 Testing raw SQL insert...');
      const { data: rawInsertTest, error: rawInsertError } = await supabaseClient
        .rpc('exec_sql', { 
          sql: `INSERT INTO public.asset_aggregate_scores (asset_slug, aggregate_score, normalized_score, score_change, metric_count, metric_scores, analysis_date) VALUES ('test-raw', -999, -99.99, 0, 1, '{}', NOW()) RETURNING id, asset_slug;`
        });
      console.log('Raw SQL insert test - data:', rawInsertTest);
      console.log('Raw SQL insert test - error:', rawInsertError);
      
      // Also test a simple query to see current records
      const { data: currentRecords, error: recordError } = await supabaseClient
        .from('asset_aggregate_scores')
        .select('id, asset_slug, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      console.log('Current records in database:', currentRecords?.length || 0);
      console.log('Sample records:', currentRecords);
      
    } catch (connError) {
      console.error('Database connection failed:', connError);
    }
    // Fetch metrics
    const metrics = await fetchWeeklyAggregatedMetrics(supabaseClient, asset_slug);
    console.log('Fetched metrics:', metrics);
    // Generate analyses for each available metric
    const analyses = await generateReport(metrics, assetName, assetSymbol);
    console.log('Generated analyses:', analyses.length);
    
    // Calculate and save aggregate scores
    console.log('[LOG] Calculating and saving aggregate scores...');
    let aggregateScoreData = null;
    try {
      aggregateScoreData = await saveAggregateScoreViaRPC(supabaseClient, asset_slug, metrics);
      console.log('[LOG] Aggregate scores saved successfully:', aggregateScoreData);
    } catch (scoreError) {
      console.error('[LOG] Error saving aggregate scores (continuing with report generation):', scoreError);
      // Continue with report generation even if scoring fails
    }
    
    // Generate PDF (with fallback for AI quota issues)
    console.log('[LOG] Attempting to generate PDF...');
    let pdfBuffer = null;
    try {
      pdfBuffer = await generatePDFReport(analyses, assetName, assetSymbol, aggregateScoreData);
      console.log('[LOG] PDF generation finished. PDF size:', pdfBuffer.length);
      console.log('Generated PDF, size:', pdfBuffer.length);
      
      // Send email with report
      console.log('[LOG] Attempting to send email...');
      for (const email of userEmails){
        await sendEmailReport(email, assetName, assetSymbol, analyses, pdfBuffer);
      }
      console.log('[LOG] Email sending process finished.');
      console.log('Sent email with report');
      
    } catch (pdfError) {
      console.error('[LOG] PDF generation failed (likely AI quota exceeded):', pdfError.message);
      console.log('[LOG] Continuing without PDF - scores were still saved successfully');
      // Don't throw error - let the function return success for scoring
    }
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      debug: {
        availableMetrics: analyses.map((a)=>a.title),
        pdfSize: pdfBuffer ? pdfBuffer.length : null
      },
      aggregateScore: aggregateScoreData ? {
        current: aggregateScoreData.score,
        normalized: aggregateScoreData.normalizedScore,
        change: aggregateScoreData.priceChange,
        metricCount: aggregateScoreData.metricCount
      } : null
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
