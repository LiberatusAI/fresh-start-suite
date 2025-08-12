// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
async function captureChartImage(metrics, chartType, format) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  // Set viewport size for high-quality chart
  await page.setViewport({
    width: 1200,
    height: 800
  });
  // Load the chart page with data
  const chartUrl = new URL('http://localhost:54321/functions/v1/chart');
  chartUrl.searchParams.set('type', chartType);
  chartUrl.searchParams.set('format', format);
  chartUrl.searchParams.set('data', JSON.stringify(metrics.data));
  await page.goto(chartUrl.toString());
  await page.waitForSelector('#chart');
  // Wait for chart animation to complete
  await new Promise((resolve)=>setTimeout(resolve, 1000));
  const element = await page.$('#chart');
  const screenshot = await element?.screenshot({
    type: 'jpeg',
    quality: 90
  });
  await browser.close();
  return screenshot;
}
async function generatePDFReport(report, metrics, assetName, assetSymbol) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([
    595,
    842
  ]); // A4 size
  // Add title
  const title = `${assetName} (${assetSymbol}) Analysis Report`;
  const titleFont = await pdfDoc.embedFont('Helvetica-Bold');
  page.drawText(title, {
    x: 50,
    y: 800,
    size: 24,
    font: titleFont
  });
  // Add report content
  const contentFont = await pdfDoc.embedFont('Helvetica');
  let y = 750;
  const sections = report.split('\n\n');
  // Capture chart images
  const chartImages = {};
  const chartConfigs = [
    {
      key: 'price',
      type: 'area',
      format: 'price'
    },
    {
      key: 'volume',
      type: 'bar',
      format: 'large'
    },
    {
      key: 'marketcap',
      type: 'bar',
      format: 'large'
    },
    {
      key: 'socialVolume',
      type: 'line',
      format: 'large'
    },
    {
      key: 'rsi',
      type: 'line',
      format: 'percent'
    }
  ];
  for (const config of chartConfigs){
    try {
      chartImages[config.key] = await captureChartImage(metrics[config.key], config.type, config.format);
    } catch (error) {
      console.error(`Failed to capture chart for ${config.key}:`, error);
    }
  }
  for (const section of sections){
    if (section.startsWith('1.') || section.startsWith('2.') || section.startsWith('3.')) {
      // This is a section header
      page.drawText(section, {
        x: 50,
        y,
        size: 16,
        font: titleFont
      });
      y -= 30;
    } else {
      // This is regular content
      const lines = section.split('\n');
      for (const line of lines){
        page.drawText(line, {
          x: 50,
          y,
          size: 12,
          font: contentFont
        });
        y -= 20;
      }
    }
    // Add chart if available for this section
    const chartKey = section.split('\n')[0].toLowerCase().replace(/[^a-z]/g, '');
    if (chartImages[chartKey]) {
      const chartImage = await pdfDoc.embedJpg(chartImages[chartKey]);
      const chartDims = chartImage.scale(0.5);
      page.drawImage(chartImage, {
        x: 50,
        y: y - chartDims.height,
        width: chartDims.width,
        height: chartDims.height
      });
      y -= chartDims.height + 20;
    }
    // Add page break if needed
    if (y < 100) {
      page = pdfDoc.addPage([
        595,
        842
      ]);
      y = 800;
    }
  }
  return await pdfDoc.save();
}
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Get the request body
    const { assetSlug, assetName, assetSymbol, userEmail } = await req.json();
    // Validate required fields
    if (!assetSlug || !assetName || !assetSymbol || !userEmail) {
      throw new Error('Missing required fields');
    }
    // Create Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    // Get the AI report from the generate-asset-report function
    const { data: reportData, error: reportError } = await supabaseClient.functions.invoke('generate-asset-report', {
      body: {
        assetSlug,
        assetName,
        assetSymbol,
        userEmail
      }
    });
    if (reportError) throw reportError;
    // Fetch metrics data
    const { data: metricsData, error: metricsError } = await supabaseClient.from('asset_metrics').select('*').eq('asset_slug', assetSlug).gte('datetime', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).order('datetime', {
      ascending: true
    });
    if (metricsError) throw metricsError;
    // Process metrics data
    const metrics = {
      price: {
        data: []
      },
      volume: {
        data: []
      },
      marketcap: {
        data: []
      },
      socialVolume: {
        data: []
      },
      rsi: {
        data: []
      }
    };
    // Group metrics by type
    const metricsByType = metricsData.reduce((acc, metric)=>{
      if (!acc[metric.metric_type]) {
        acc[metric.metric_type] = [];
      }
      acc[metric.metric_type].push({
        date: new Date(metric.datetime).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        value: Number(metric.value) || 0
      });
      return acc;
    }, {});
    // Map metric types to our chart keys
    const metricTypeMap = {
      'price_usd': 'price',
      'volume_usd': 'volume',
      'marketcap_usd': 'marketcap',
      'social_volume_total': 'socialVolume',
      'rsi_1d': 'rsi'
    };
    // Populate metrics data
    for (const [type, key] of Object.entries(metricTypeMap)){
      if (metricsByType[type]) {
        metrics[key].data = metricsByType[type];
      }
    }
    // Generate PDF
    const pdfBytes = await generatePDFReport(reportData.report, metrics, assetName, assetSymbol);
    // Return the PDF
    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${assetSymbol}-report.pdf"`
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
