// Test version of report generation with reduced scope for local development
// Uses only 7 days of data and 6 key metrics to fit within local resource limits

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.0";
import { Resend } from "https://esm.sh/resend@4.0.1";
import { createCanvas } from 'https://deno.land/x/canvas@v1.4.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Reduced to 6 key metrics for testing
const KEY_METRICS = ['price', 'volume', 'marketcap', 'socialVolume', 'rsi', 'priceVolatility'];

async function fetchWeeklyMetrics(supabaseClient, assetSlug) {
  try {
    console.log('Starting fetchWeeklyMetrics for asset:', assetSlug);
    // Only fetch 7 days of data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    console.log('Fetching data from:', sevenDaysAgo, 'to present');
    
    // Fetch all metrics data
    const { data: metricsData, error: metricsError } = await supabaseClient
      .from('asset_metrics')
      .select('*')
      .eq('asset_slug', assetSlug)
      .gte('datetime', sevenDaysAgo)
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
    
    // Process only key metrics with fallback names
    const result = {
      price: processMetric('price_usd', 'value') || processMetric('price_usd_5m', 'value') || processMetric('daily_closing_price_usd', 'value'),
      volume: processMetric('volume_usd', 'value') || processMetric('volume_usd_5m', 'value'),
      marketcap: processMetric('marketcap_usd', 'value'),
      socialVolume: processMetric('social_volume_total', 'value'),
      rsi: processMetric('rsi_1d', 'value'),
      priceVolatility: processMetric('price_volatility_1d', 'value')
    };
    
    console.log('Processed metrics summary:', {
      price: result.price.currentValue,
      volume: result.volume.currentValue,
      marketcap: result.marketcap.currentValue,
      socialVolume: result.socialVolume.currentValue,
      rsi: result.rsi.currentValue,
      priceVolatility: result.priceVolatility.currentValue
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
  
  const prompt = `You are a cryptocurrency analyst. Provide a brief analysis of ${metricName} for ${assetName} (${assetSymbol}):

Current Value: ${metricData.currentValue.toLocaleString()}
24h Change: ${metricData.percentChange24h.toFixed(2)}%

Provide a concise 2-3 sentence analysis focusing on:
1. What the current value and change indicate
2. Brief market implication

Keep it under 50 words. No asterisks or special formatting.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text().replace(/[*#]/g, '');
  
  return {
    title: `${metricName} Analysis`,
    content: text,
    data: metricData
  };
}

async function generateSimpleChart(data, title, color) {
  const width = 600;
  const height = 300;
  const padding = 40;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // Title
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 25);
  
  if (data.length === 0) {
    ctx.fillText('No data available', width / 2, height / 2);
    return canvas.toDataURL('image/png');
  }
  
  // Calculate scales
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding - 20;
  const scaleY = chartHeight / valueRange;
  
  // Draw line
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  data.forEach((point, i) => {
    const x = padding + (i * chartWidth / (data.length - 1));
    const y = height - padding - ((point.value - minValue) * scaleY);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // Draw points
  data.forEach((point, i) => {
    const x = padding + (i * chartWidth / (data.length - 1));
    const y = height - padding - ((point.value - minValue) * scaleY);
    
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
  
  return canvas.toDataURL('image/png');
}

async function generateTestPDF(analyses, assetName, assetSymbol) {
  console.log('Generating simplified PDF...');
  
  // Generate charts for each analysis
  const chartImages = [];
  for (const analysis of analyses) {
    if (analysis.data.data && analysis.data.data.length > 0) {
      try {
        const chartImage = await generateSimpleChart(
          analysis.data.data, 
          analysis.title, 
          '#1e40af'
        );
        chartImages.push({ title: analysis.title, image: chartImage });
      } catch (error) {
        console.error(`Failed to generate chart for ${analysis.title}:`, error);
      }
    }
  }
  
  // Simple HTML template
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${assetName} Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .metric { margin: 30px 0; page-break-inside: avoid; }
        .metric h2 { color: #555; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .metric-change { font-size: 18px; color: ${analyses[0]?.data.percentChange24h >= 0 ? 'green' : 'red'}; }
        .analysis { margin: 15px 0; line-height: 1.6; }
        .chart { margin: 20px 0; }
        .chart img { max-width: 100%; height: auto; }
      </style>
    </head>
    <body>
      <h1>${assetName} (${assetSymbol}) - Test Report</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <p><em>This is a reduced test report with 7 days of data and 6 key metrics.</em></p>
      
      ${analyses.map((analysis, index) => `
        <div class="metric">
          <h2>${analysis.title}</h2>
          <div class="metric-value">
            Current: ${analysis.data.currentValue.toLocaleString()}
          </div>
          <div class="metric-change">
            24h Change: ${analysis.data.percentChange24h >= 0 ? '+' : ''}${analysis.data.percentChange24h.toFixed(2)}%
          </div>
          <div class="analysis">${analysis.content}</div>
          ${chartImages[index] ? `
            <div class="chart">
              <img src="${chartImages[index].image}" alt="${analysis.title} Chart">
            </div>
          ` : ''}
        </div>
      `).join('')}
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
  console.log('PDF generation successful! Size:', pdfBuffer.length);
  return pdfBuffer;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { asset_slug, assetName, assetSymbol, userEmails } = await req.json();
    
    console.log('Test report requested for:', { asset_slug, assetName, assetSymbol });
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Fetch 7 days of metrics
    const metrics = await fetchWeeklyMetrics(supabaseClient, asset_slug);
    
    // Generate analyses for only 6 key metrics
    const analyses = [];
    for (const metricName of KEY_METRICS) {
      if (metrics[metricName] && metrics[metricName].currentValue > 0) {
        try {
          console.log(`Generating analysis for ${metricName}...`);
          const analysis = await generateMetricAnalysis(
            metricName, 
            metrics[metricName], 
            assetName, 
            assetSymbol
          );
          analyses.push(analysis);
        } catch (error) {
          console.error(`Error analyzing ${metricName}:`, error);
        }
      }
    }
    
    console.log(`Generated ${analyses.length} analyses`);
    
    // Generate simplified PDF
    const pdfBuffer = await generateTestPDF(analyses, assetName, assetSymbol);
    
    // Send simple email
    if (userEmails && userEmails.length > 0) {
      const apiKey = Deno.env.get('RESEND_API_KEY');
      console.log('RESEND_API_KEY loaded:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
      
      const resend = new Resend(apiKey);
      
      try {
        console.log('Attempting to send email to:', userEmails);
        
        // Use identical email template from the main report function
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
        
        const result = await resend.emails.send({
          from: 'Future Cast <onboarding@resend.dev>',
          to: userEmails,
          subject: `${assetName} (${assetSymbol}) Analysis Report`,
          html: htmlContent,
          attachments: [{
            filename: `${assetName}_${assetSymbol}_Analysis_Report.pdf`,
            content: btoa(String.fromCharCode(...pdfBuffer))
          }]
        });
        console.log('Resend API response:', result);
        console.log('Email sent successfully');
      } catch (error) {
        console.error('Email sending failed:', error);
        console.error('Error details:', error.message);
        throw error; // Re-throw so the function reports failure
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Test report generated successfully',
      metrics_analyzed: analyses.length,
      pdf_size: pdfBuffer.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});