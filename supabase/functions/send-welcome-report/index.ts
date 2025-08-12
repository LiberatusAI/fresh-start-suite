// Welcome report for new users - based on test report format for local compatibility
// Sends immediate welcome report with onboarding context and all user's assets

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.0";
import { Resend } from "https://esm.sh/resend@4.0.1";
import { createCanvas } from 'https://deno.land/x/canvas@v1.4.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Full set of metrics for production report
const KEY_METRICS = [
  'price', 'volume', 'marketcap', 'socialVolume', 'socialDominance',
  'uniqueSocialVolume', 'sentimentVolume', 'rsi', 'priceVolatility',
  'fullyDilutedValuation', 'meanCoinAge', 'giniIndex', 'annualInflationRate', 'priceBTC'
];

async function fetchMonthlyMetrics(supabaseClient, assetSlug) {
  try {
    console.log('Starting fetchMonthlyMetrics for asset:', assetSlug);
    // Fetch 30 days of data for full report
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    console.log('Fetching data from:', thirtyDaysAgo, 'to present');
    
    // Fetch all metrics data
    const { data: metricsData, error: metricsError } = await supabaseClient
      .from('asset_metrics')
      .select('*')
      .eq('asset_slug', assetSlug)
      .gte('datetime', thirtyDaysAgo)
      .order('datetime', { ascending: true });
      
    if (metricsError) {
      console.error('Error fetching metrics data:', metricsError);
      throw metricsError;
    }
    
    console.log('Retrieved metrics data:', metricsData?.length || 0, 'records');
    
    // Process each metric type
    const processMetric = (type, valueField) => {
      try {
        const metricData = metricsData?.filter(d => d.metric_type === type) || [];
        
        if (metricData.length === 0) {
          return { data: [], currentValue: 0, percentChange24h: 0 };
        }
        
        // Sort by date
        metricData.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
        
        // Get current and 24h ago values
        const latestRecord = metricData[metricData.length - 1];
        const currentValue = Number(latestRecord?.[valueField]) || 0;
        
        // Find record from ~24h ago
        let record24hAgo = null;
        const latestTime = new Date(latestRecord.datetime).getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        for(let i = metricData.length - 2; i >= 0; i--){
          const recordTime = new Date(metricData[i].datetime).getTime();
          const timeDiff = latestTime - recordTime;
          
          if (timeDiff >= 20 * 60 * 60 * 1000 && timeDiff <= 30 * 60 * 60 * 1000) {
            record24hAgo = metricData[i];
            break;
          }
        }
        
        const previousValue24h = record24hAgo ? Number(record24hAgo[valueField]) || 0 : currentValue;
        const percentChange24h = previousValue24h !== 0 ? 
          (currentValue - previousValue24h) / previousValue24h * 100 : 0;
        
        // Transform data for charting
        const chartData = metricData.map(d => ({
          date: new Date(d.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: Number(d[valueField]) || 0
        }));
        
        return {
          data: chartData,
          currentValue,
          percentChange24h: isFinite(percentChange24h) ? percentChange24h : 0
        };
      } catch (error) {
        console.error(`Error processing metric ${type}:`, error);
        return { data: [], currentValue: 0, percentChange24h: 0 };
      }
    };
    
    // Helper function to try multiple metric names and return the first one with data
    const processMetricWithFallbacks = (metricNames, valueField) => {
      for (const metricName of metricNames) {
        const result = processMetric(metricName, valueField);
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
      priceBTC: processMetricWithFallbacks(['price_btc'], 'value')
    };
    
    console.log('Processed metrics summary:', {
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
      priceBTC: result.priceBTC.currentValue
    });
    
    return result;
  } catch (err) {
    console.error('Error in fetchWeeklyMetrics:', err);
    throw err;
  }
}

async function generateMetricAnalysis(metricName, metricData, assetName, assetSymbol) {
  const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `You are a professional cryptocurrency analyst. Analyze the following ${metricName} data for ${assetName} (${assetSymbol}):

Current Value: ${metricData.currentValue.toLocaleString()}
24h Change: ${metricData.percentChange24h.toFixed(2)}%

Consider this metric in terms of its historic relationship to price. Please explain how changes in this metric may have determined future price movement. Be sure to include an explanation of this metric and why it is important.

Please provide a detailed analysis including:
1. Current value interpretation
2. 24h change significance
3. Market implications
4. Key takeaways

Format the analysis with clear sections and bullet points. Focus on actionable insights and data-backed conclusions. Respond in a professional report style.

Keep the analysis concise but informative (150-200 words). Do not use asterisks (*) or hashtags (#) in the text.`;

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

async function generateEnhancedChart(data, title, color) {
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
  const valueRange = maxValue - minValue || 1;
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
      ctx.fillText(point.date, x, height - padding + 20);
    }
  });

  return canvas.toDataURL('image/png');
}

async function generateWelcomePDF(allAssetAnalyses, userProfile) {
  console.log('Generating welcome PDF for multiple assets...');
  
  // Generate charts for each analysis across all assets
  const allChartImages = [];
  for (const assetAnalyses of allAssetAnalyses) {
    const assetCharts = [];
    for (const analysis of assetAnalyses.analyses) {
      if (analysis.data.data && analysis.data.data.length > 0) {
        try {
          const chartImage = await generateEnhancedChart(
            analysis.data.data, 
            `${assetAnalyses.assetName} - ${analysis.title}`, 
            '#222'
          );
          assetCharts.push({ title: analysis.title, image: chartImage, assetName: assetAnalyses.assetName });
        } catch (error) {
          console.error(`Failed to generate chart for ${assetAnalyses.assetName} ${analysis.title}:`, error);
        }
      }
    }
    allChartImages.push(...assetCharts);
  }
  
  // Pre-compute chart mappings to avoid nested template literal recursion
  console.log('Pre-computing chart mappings from', allChartImages.length, 'chart images...');
  const chartMap = new Map();
  allChartImages.forEach(chart => {
    // Create key from asset name and metric type (first word of title)
    const metricType = chart.title.split(' - ')[1]?.split(' ')[0] || chart.title.split(' ')[0];
    const key = `${chart.assetName}-${metricType}`;
    chartMap.set(key, chart.image);
    console.log(`Chart mapped: ${key} -> ${chart.image.substring(0, 50)}...`);
  });
  console.log('Chart mapping completed:', chartMap.size, 'charts mapped');
  
  // Generate combined HTML for all assets using pre-computed chart map
  const assetSections = allAssetAnalyses.map(({ assetName, assetSymbol, analyses }) => {
    const analysisHTML = analyses.map((analysis, index) => {
      // Get chart image using pre-computed map
      const metricType = analysis.title.split(' ')[0];
      const chartKey = `${assetName}-${metricType}`;
      const chartImage = chartMap.get(chartKey);
      
      const changeClass = analysis.data.percentChange24h >= 0 ? 'positive' : 'negative';
      const changePrefix = analysis.data.percentChange24h >= 0 ? '+' : '';
      
      return `
        <div class="metric">
          <h3>${analysis.title}</h3>
          <div class="metric-value">
            ${analysis.data.currentValue.toLocaleString()}
          </div>
          <div class="metric-change ${changeClass}">
            24h Change: ${changePrefix}${analysis.data.percentChange24h.toFixed(2)}%
          </div>
          ${chartImage ? `
            <div class="chart">
              <img src="${chartImage}" alt="${analysis.title} Chart">
            </div>
          ` : ''}
          <div class="analysis">${analysis.content}</div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="asset-section">
        <div class="asset-header">
          ${assetName} (${assetSymbol}) Analysis
        </div>
        ${analysisHTML}
      </div>
    `;
  }).join('');

  // Professional HTML template matching production format
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to FutureCast AI - Your First Crypto Analysis Report</title>
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
        
        /* Top bar for cover */
        .top-bar {
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
        
        .cover-title-row {
          margin: 40px 0 0 0;
          padding: 0 40px;
          text-align: center;
        }
        
        .cover-title-bg {
          background: #f3f4f2;
          display: inline-block;
          padding: 32px 40px;
          border-radius: 4px;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -1px;
          line-height: 1.8;
        }
        
        .welcome-message {
          margin: 60px 40px;
          padding: 32px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          text-align: center;
        }
        
        .welcome-message h2 {
          font-size: 24px;
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 16px;
        }
        
        .welcome-message p {
          font-size: 16px;
          color: #555;
          margin: 12px 0;
        }
        
        /* Section layout */
        .section {
          padding: 40px;
          margin: 0;
        }
        
        .section-header {
          font-size: 32px;
          font-weight: 900;
          color: #181818;
          margin-bottom: 16px;
          border-bottom: 2px solid #e5e5e5;
          padding-bottom: 16px;
        }
        
        /* Asset sections */
        .asset-section {
          margin: 40px 0;
          page-break-before: always;
          break-before: page;
        }
        
        .asset-header {
          font-size: 28px;
          font-weight: 900;
          color: #1e40af;
          margin-bottom: 24px;
          text-align: center;
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
        }
        
        /* Metric analysis */
        .metric {
          margin: 32px 0;
          padding: 24px;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .metric h3 {
          font-size: 20px;
          font-weight: 700;
          color: #333;
          margin-bottom: 16px;
        }
        
        .metric-value {
          font-size: 28px;
          font-weight: 900;
          margin-bottom: 8px;
        }
        
        .metric-change {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        
        .metric-change.positive {
          color: #059669;
        }
        
        .metric-change.negative {
          color: #dc2626;
        }
        
        .analysis {
          font-size: 15px;
          line-height: 1.8;
          color: #444;
          margin: 20px 0;
        }
        
        .chart {
          margin: 24px 0;
          text-align: center;
        }
        
        .chart img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        /* Onboarding section */
        .onboarding {
          background: #f0f9ff;
          padding: 40px;
          border-radius: 12px;
          margin-top: 60px;
          page-break-before: always;
          break-before: page;
        }
        
        .onboarding h3 {
          font-size: 20px;
          font-weight: 700;
          color: #1e40af;
          margin-top: 0;
          margin-bottom: 16px;
        }
        
        .onboarding ul {
          margin: 16px 0;
          padding-left: 24px;
        }
        
        .onboarding li {
          margin: 10px 0;
          font-size: 15px;
        }
        
        .footer {
          text-align: center;
          font-size: 12px;
          color: #888;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        
        /* Print-specific fixes */
        @media print {
          .cover {
            page-break-after: always !important;
            break-after: page !important;
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
          <span>WELCOME REPORT</span>
          <span>FUTURECAST AI</span>
        </div>
        
        <div class="cover-logo-row">
          <svg class="cover-logo-svg" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="35" font-family="'Inter', sans-serif" font-size="40" font-weight="900" fill="#181818">FUTURECAST</text>
            <text x="0" y="70" font-family="'Inter', sans-serif" font-size="40" font-weight="900" fill="#cecab9">AI</text>
            <g transform="translate(280,10)">
              <path d="M0 24 L24 0 M12 0 L24 0 L24 12" stroke="#181818" stroke-width="4"/>
            </g>
          </svg>
        </div>
        
        <div class="cover-title-row">
          <div class="cover-title-bg">
            WELCOME TO<br>FUTURECAST AI<br><br>
            <span style="font-size: 22px;">YOUR FIRST CRYPTO ANALYSIS REPORT</span>
          </div>
        </div>
        
        <div class="welcome-message">
          <h2>🎉 Welcome ${userProfile.first_name || 'to FutureCast'}!</h2>
          <p><strong>Thanks for joining us!</strong> This is your first personalized crypto analysis report.</p>
          <p>You'll receive reports like this daily at <strong>${userProfile.global_report_time || '9:00 AM'}</strong>.</p>
          <p style="font-size: 14px; color: #888; margin-top: 20px;">This report includes 30 days of market data and ${KEY_METRICS.length} key metrics.</p>
        </div>
      </div>
      
      ${assetSections}
      
      <div class="onboarding">
        <h3>📚 How to Read Your Reports</h3>
        <ul>
          <li><strong>Current Values:</strong> Latest market data for each metric</li>
          <li><strong>24h Change:</strong> Percentage change over the last 24 hours</li>
          <li><strong>Charts:</strong> 30-day trend visualization showing market movements</li>
          <li><strong>AI Analysis:</strong> Professional insights on market conditions and implications</li>
        </ul>
        
        <h3>⚙️ Customize Your Experience</h3>
        <ul>
          <li><strong>Change Report Time:</strong> Visit your dashboard settings to adjust delivery time</li>
          <li><strong>Add More Assets:</strong> Track additional cryptocurrencies in your portfolio</li>
          <li><strong>Upgrade Your Plan:</strong> Access more assets and additional daily reports</li>
          <li><strong>Dashboard Access:</strong> View real-time data and chat with AI anytime</li>
        </ul>
        
        <h3>📧 Email Delivery</h3>
        <p>Your next report will arrive tomorrow at your scheduled time. Make sure to check your spam folder if you don't see it in your inbox.</p>
        
        <p style="text-align: center; margin-top: 40px; font-size: 20px; font-weight: 700; color: #1e40af;">
          Welcome to smarter crypto investing with FutureCast AI!
        </p>
      </div>
      
      <div class="footer">
        <p>This report was automatically generated based on current market data. Not financial advice.</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <p>&copy; ${new Date().getFullYear()} FutureCast AI. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
  
  // Convert to PDF using PDFShift
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
  console.log('Welcome PDF generation successful! Size:', pdfBuffer.length);
  return pdfBuffer;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const startTime = Date.now();
    console.log(`⏱️ [${new Date().toISOString()}] Function started`);
    
    const { user_id, asset_slugs } = await req.json();
    
    console.log('🎉 WELCOME REPORT REQUESTED! User:', user_id, 'Assets:', asset_slugs);
    console.log(`⏱️ [${Date.now() - startTime}ms] Request parsed`);
    
    if (!user_id || !asset_slugs || asset_slugs.length === 0) {
      throw new Error('Missing required fields: user_id and asset_slugs');
    }
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log(`⏱️ [${Date.now() - startTime}ms] Supabase client created`);
    
    // Fetch user profile
    console.log(`⏱️ [${Date.now() - startTime}ms] Fetching user profile...`);
    const { data: userProfile, error: userError } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name, global_report_time, welcome_report_sent')
      .eq('id', user_id)
      .single();
    console.log(`⏱️ [${Date.now() - startTime}ms] User profile fetched:`, !!userProfile);
    
    if (userError || !userProfile) {
      throw new Error(`Failed to fetch user profile: ${userError?.message}`);
    }
    
    // Check if welcome report was already sent
    if (userProfile.welcome_report_sent === true) {
      console.log(`⚠️ Welcome report already sent for user ${user_id}, skipping to prevent duplicate`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Welcome report already sent',
          skipped: true 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    // Fetch asset subscription details
    console.log(`⏱️ [${Date.now() - startTime}ms] Fetching asset subscriptions for:`, asset_slugs);
    const { data: assetSubscriptions, error: assetsError } = await supabaseClient
      .from('asset_subscriptions')
      .select('asset_slug, asset_name, asset_symbol')
      .eq('user_id', user_id)
      .in('asset_slug', asset_slugs);
    
    console.log(`⏱️ [${Date.now() - startTime}ms] Asset subscriptions fetched:`, assetSubscriptions?.length || 0);
    
    if (assetsError) {
      console.error(`❌ Asset fetch error:`, assetsError);
      throw new Error(`Failed to fetch asset subscriptions: ${assetsError.message}`);
    }
    
    if (!assetSubscriptions || assetSubscriptions.length === 0) {
      console.error(`❌ No asset subscriptions found for user ${user_id} with slugs:`, asset_slugs);
      throw new Error('No matching asset subscriptions found');
    }
    
    console.log('🚀 Processing welcome report for assets:', assetSubscriptions.map(a => a.asset_name));
    
    // Generate analyses for all assets
    console.log(`⏱️ [${Date.now() - startTime}ms] Starting analysis for ${assetSubscriptions.length} assets`);
    const allAssetAnalyses = [];
    for (const asset of assetSubscriptions) {
      try {
        console.log(`📊 [${Date.now() - startTime}ms] Processing asset: ${asset.asset_name}`);
        
        // Fetch 30 days of metrics for this asset
        const metricsStartTime = Date.now();
        const metrics = await fetchMonthlyMetrics(supabaseClient, asset.asset_slug);
        console.log(`⏱️ [${Date.now() - startTime}ms] Metrics fetched for ${asset.asset_name} (took ${Date.now() - metricsStartTime}ms)`);
        
        // Generate analyses for all key metrics
        const analyses = [];
        let aiCallCount = 0;
        for (const metricName of KEY_METRICS) {
          if (metrics[metricName] && metrics[metricName].currentValue > 0) {
            try {
              console.log(`🧠 [${Date.now() - startTime}ms] AI analysis ${++aiCallCount}/${KEY_METRICS.length} for ${asset.asset_name} - ${metricName}...`);
              const aiStartTime = Date.now();
              const analysis = await generateMetricAnalysis(
                metricName, 
                metrics[metricName], 
                asset.asset_name, 
                asset.asset_symbol
              );
              console.log(`✅ [${Date.now() - startTime}ms] AI analysis completed (took ${Date.now() - aiStartTime}ms)`);
              analyses.push(analysis);
            } catch (error) {
              console.error(`❌ [${Date.now() - startTime}ms] Error analyzing ${metricName} for ${asset.asset_name}:`, error);
            }
          } else {
            console.log(`⚠️ [${Date.now() - startTime}ms] No data for ${asset.asset_name} - ${metricName}`);
          }
        }
        
        if (analyses.length > 0) {
          allAssetAnalyses.push({
            assetSlug: asset.asset_slug,
            assetName: asset.asset_name,
            assetSymbol: asset.asset_symbol,
            analyses
          });
          console.log(`✅ [${Date.now() - startTime}ms] Completed ${asset.asset_name} with ${analyses.length} analyses`);
        } else {
          console.log(`⚠️ [${Date.now() - startTime}ms] No analyses generated for ${asset.asset_name}`);
        }
      } catch (error) {
        console.error(`❌ [${Date.now() - startTime}ms] Error processing asset ${asset.asset_name}:`, error);
      }
    }
    
    if (allAssetAnalyses.length === 0) {
      throw new Error('No successful analyses generated for any assets');
    }
    
    console.log(`✅ [${Date.now() - startTime}ms] Generated analyses for ${allAssetAnalyses.length} assets`);
    
    // Generate combined welcome PDF
    console.log(`📄 [${Date.now() - startTime}ms] Generating welcome PDF with charts...`);
    const pdfStartTime = Date.now();
    const pdfBuffer = await generateWelcomePDF(allAssetAnalyses, {
      reportTime: userProfile.global_report_time
    });
    console.log(`✅ [${Date.now() - startTime}ms] PDF generated (took ${Date.now() - pdfStartTime}ms, size: ${pdfBuffer.length})`);
    
    // Send welcome email
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const resend = new Resend(apiKey);
    let result; // Declare result in broader scope
    
    try {
      console.log(`📧 [${Date.now() - startTime}ms] Sending welcome email to:`, userProfile.email);
      const emailStartTime = Date.now();
      
      const userName = userProfile.first_name || userProfile.email.split('@')[0];
      const assetNames = allAssetAnalyses.map(a => a.assetName).join(', ');
      const reportLink = '#'; // TODO: Replace with actual dashboard link
      const unsubscribeLink = '#'; // TODO: Replace with actual unsubscribe link
      
      console.log(`📧 [${Date.now() - startTime}ms] Email variables - User: ${userName}, Assets: ${assetNames}`);
      
      // Convert PDF to base64 safely without stack overflow
      console.log(`📧 [${Date.now() - startTime}ms] Converting PDF to base64 safely (${pdfBuffer.length} bytes)...`);
      const binaryString = Array.from(pdfBuffer, byte => String.fromCharCode(byte)).join('');
      const base64Content = btoa(binaryString);
      console.log(`📧 [${Date.now() - startTime}ms] Base64 conversion completed (${base64Content.length} chars)`);
      
      // Create simpler HTML to avoid template recursion issues
      const htmlContent = [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<title>Welcome to FutureCast - Your First Crypto Analysis Report</title>',
        '</head>',
        '<body style="margin:0; padding:0; background:#f0f0f0; font-family: Arial, sans-serif;">',
        '<div style="max-width:600px; margin:40px auto; background:#fff; padding:40px; border-radius:8px;">',
        '<h1 style="color:#1e40af; text-align:center; margin-bottom:30px;">🎉 Welcome to FutureCast AI! 🎉</h1>',
        '<h2 style="color:#333;">Hi ' + userName + ',</h2>',
        '<p style="line-height:1.6; color:#666;">Welcome to FutureCast AI! Your first personalized crypto analysis report is attached.</p>',
        '<p style="line-height:1.6; color:#666;">This report covers <strong>' + assetNames + '</strong> with AI-powered insights and market trends.</p>',
        '<div style="background:#f0f9ff; padding:20px; border-radius:6px; margin:20px 0;">',
        '<h3 style="color:#1e40af; margin-top:0;">📚 How to Read Your Reports:</h3>',
        '<ul>',
        '<li>Current Values: Latest market data for each metric</li>',
        '<li>24h Change: Percentage change over last 24 hours</li>',
        '<li>AI Analysis: Smart insights on market conditions</li>',
        '</ul>',
        '</div>',
        '<p style="margin-top:30px; color:#666;">Your next report will arrive tomorrow at your scheduled time.</p>',
        '<p style="color:#666;">Welcome to smarter crypto investing!</p>',
        '<p style="color:#666;">- The FutureCast AI Team</p>',
        '</div>',
        '</body>',
        '</html>'
      ].join('\n');
      
      result = await resend.emails.send({
        from: 'Future Cast <onboarding@resend.dev>',
        to: [userProfile.email],
        subject: '🎉 Welcome to FutureCast - Your First Crypto Analysis Report',
        html: htmlContent,
        attachments: [{
          filename: `Welcome_Report_${assetNames.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.pdf`,
          content: base64Content
        }]
      });
      
      console.log(`🎊 [${Date.now() - startTime}ms] Welcome email sent successfully! (took ${Date.now() - emailStartTime}ms) Email ID:`, result.data?.id);
      
      // Mark welcome report as sent to prevent duplicates
      console.log(`⏱️ [${Date.now() - startTime}ms] Marking welcome report as sent...`);
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ welcome_report_sent: true })
        .eq('id', user_id);
      
      if (updateError) {
        console.error('❌ Failed to update welcome_report_sent:', updateError);
      } else {
        console.log(`✅ [${Date.now() - startTime}ms] Marked welcome report as sent`);
      }
      
      // Update last_report_sent timestamps for all assets
      console.log(`⏱️ [${Date.now() - startTime}ms] Updating last_report_sent timestamps...`);
      for (const asset of assetSubscriptions) {
        await supabaseClient
          .from('asset_subscriptions')
          .update({ last_report_sent: new Date().toISOString() })
          .eq('user_id', user_id)
          .eq('asset_slug', asset.asset_slug);
      }
      
      console.log(`✅ [${Date.now() - startTime}ms] Updated last_report_sent timestamps`);
      
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw error;
    }
    
    const finalResponse = {
      success: true,
      message: '🎉 Welcome report sent successfully!',
      assets_processed: allAssetAnalyses.length,
      total_analyses: allAssetAnalyses.reduce((sum, asset) => sum + asset.analyses.length, 0),
      pdf_size: pdfBuffer.length,
      email_sent_to: userProfile.email,
      email_id: result?.data?.id || null,
      processing_time_ms: Date.now() - startTime
    };
    
    console.log(`🎉 [${Date.now() - startTime}ms] WELCOME REPORT COMPLETED SUCCESSFULLY!`, finalResponse);
    
    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('💥 Welcome report error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});