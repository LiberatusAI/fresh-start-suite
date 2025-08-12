// ============================================================================
// CHAT COMPLETION EDGE FUNCTION - MVP SIMPLIFIED VERSION
// ============================================================================
// Purpose: Simple chat interface with basic rate limiting and LLM integration
// Architecture: Frontend → Edge Function → Gemini API → Response
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.2.1'
import { logCostAnalytics } from './tokenCounter.ts'

// ============================================================================
// MVP TYPES - SIMPLIFIED
// ============================================================================
// Keeping only essential types for MVP

interface ChatRequest {
  message: string;
}

interface ChatResponse {
  response: string;
  requestsUsedThisMonth: number;
  requestsRemaining: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  purchasedRequests: number;
  nextResetDate?: string;
  success: true;
}

interface ErrorResponse {
  error: string;
  success: false;
}

// ============================================================================
// MVP CONSTANTS - SIMPLE DAILY LIMITS
// ============================================================================
// Simplified to daily request limits instead of token management

const DAILY_LIMITS = {
  TRIAL: 3,     // 3 requests per day for trial users
  BASIC: 10,    // 10 requests per day for basic users  
  PRO: 50,      // 50 requests per day for pro users
  ELITE: 100    // 100 requests per day for elite users
} as const;

const MONTHLY_LIMITS = {
  TRIAL: 90,    // 90 requests per month for trial users
  BASIC: 300,   // 300 requests per month for basic users  
  PRO: 1500,    // 1500 requests per month for pro users
  ELITE: 3000   // 3000 requests per month for elite users
} as const;

// ============================================================================
// MAIN FUNCTION: SIMPLIFIED MVP REQUEST HANDLER
// ============================================================================
serve(async (req: Request): Promise<Response> => {
  try {
    // ========================================================================
    // STEP 1: CORS HANDLING
    // ========================================================================
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }


    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed');
    }

    // ========================================================================
    // STEP 2: EXTRACT USER FROM JWT (Already verified by Edge Runtime)
    // ========================================================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return createErrorResponse('Missing authorization header');
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT to get user info (no verification needed - Edge Runtime already did it)
    let user;
    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      user = {
        id: payload.sub,
        email: payload.email
      };
      console.log('User extracted from JWT:', user);
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      return createErrorResponse('Invalid token format');
    }

    // Create Supabase client with service role for database access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // ========================================================================
    // STEP 3: FEATURE FLAG CHECK
    // ========================================================================
    const hasFeature = await checkFeatureFlag(supabase, user.id, 'chat_enabled');
    if (!hasFeature) {
      return createErrorResponse('Chat feature not enabled for your account');
    }

    // ========================================================================
    // STEP 4: BASIC INPUT VALIDATION
    // ========================================================================
    let body: ChatRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse('Invalid JSON in request body');
    }

    if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return createErrorResponse('Message is required and must be a non-empty string');
    }

    if (body.message.length > 1000) {
      return createErrorResponse('Message too long (max 1000 characters)');
    }

    // ========================================================================
    // STEP 5: MONTHLY RATE LIMITING
    // ========================================================================
    const requestCheck = await checkMonthlyRequests(supabase, user.id);
    if (!requestCheck.allowed) {
      const resetDate = requestCheck.resetDate ? new Date(requestCheck.resetDate).toLocaleDateString() : 'next billing cycle';
      return createErrorResponse(
        `No requests remaining. You've used all ${requestCheck.limit} monthly requests. Resets on ${resetDate}. Purchase more requests to continue.`
      );
    }

    // ========================================================================
    // STEP 6: GET USER'S TRACKED ASSETS
    // ========================================================================
    const userAssets = await getUserTrackedAssets(supabase, user.id);
    if (userAssets.length === 0) {
      return createErrorResponse('No tracked assets found. Please add assets to your account to generate personalized crypto insights.');
    }

    // ========================================================================
    // STEP 7: DETECT TIME RANGE FROM USER QUERY
    // ========================================================================
    const timeRangeDays = detectTimeRangeFromQuery(body.message);
    console.log(`Detected time range: ${timeRangeDays} days from user query`);
    
    // ========================================================================
    // STEP 8: GET MARKET DATA FOR TRACKED ASSETS
    // ========================================================================
    console.log('Fetching market data for assets:', userAssets.map(a => a.asset_slug));
    const assetsWithData = await getAssetMarketData(supabase, userAssets, timeRangeDays);
    console.log('Assets with market data:', JSON.stringify(assetsWithData, null, 2));

    // ========================================================================
    // STEP 9: BUILD PROMPT AND CALL GEMINI API
    // ========================================================================
    const startTime = Date.now();
    const fullPrompt = buildFullPrompt(body.message, assetsWithData, timeRangeDays);
    const aiResponse = await callGeminiAPI(fullPrompt);
    const responseTime = Date.now() - startTime;
    
    // ========================================================================
    // STEP 9.5: LOG COST ANALYTICS
    // ========================================================================
    // Get user tier for analytics
    const { data: profile } = await supabase
      .from('profiles')
      .select('tiers(name)')
      .eq('id', user.id)
      .single();
    
    await logCostAnalytics(
      supabase,
      user.id,
      'chat',
      fullPrompt,
      aiResponse,
      assetsWithData.length,
      responseTime,
      profile?.tiers?.name || 'trial'
    );
    
    // ========================================================================
    // STEP 10: INCREMENT REQUEST COUNT (monthly first, then purchased)
    // ========================================================================
    await incrementRequestCount(supabase, user.id, requestCheck);

    // ========================================================================
    // STEP 11: SUCCESS RESPONSE
    // ========================================================================
    // Get next reset date for user
    const { data: nextResetDate } = await supabase.rpc('get_next_reset_date', {
      user_id: user.id
    });

    // Calculate updated counts after deduction
    let newMonthlyRemaining = requestCheck.monthlyRemaining;
    let newPurchasedRequests = requestCheck.purchasedRequests;
    
    if (requestCheck.monthlyRemaining > 0) {
      newMonthlyRemaining -= 1;
    } else if (requestCheck.purchasedRequests > 0) {
      newPurchasedRequests -= 1;
    }
    
    const response: ChatResponse = {
      response: aiResponse,
      requestsUsedThisMonth: requestCheck.used + (requestCheck.monthlyRemaining > 0 ? 1 : 0),
      requestsRemaining: newMonthlyRemaining + newPurchasedRequests,
      monthlyLimit: requestCheck.limit,
      monthlyRemaining: newMonthlyRemaining,
      purchasedRequests: newPurchasedRequests,
      nextResetDate: nextResetDate || undefined,
      success: true
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Chat completion error:', error);
    return createErrorResponse('Internal server error occurred');
  }
});

// ============================================================================
// HELPER FUNCTIONS - MVP SIMPLIFIED
// ============================================================================

function createErrorResponse(message: string): Response {
  const errorResponse: ErrorResponse = {
    error: message,
    success: false
  };
  
  return new Response(JSON.stringify(errorResponse), {
    status: 400,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function checkFeatureFlag(
  supabase: any, 
  userId: string, 
  featureName: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_feature', {
      user_id: userId,
      feature_name: featureName
    });
    
    if (error) {
      console.error('Feature flag check error:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Feature flag check exception:', error);
    return false;
  }
}

async function checkDailyRequests(supabase: any, userId: string) {
  try {
    // Get user profile with tier information
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        daily_chat_requests,
        last_chat_date,
        tiers(name)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return { allowed: false, used: 0, limit: 0 };
    }

    const tierName = profile?.tiers?.name?.toUpperCase() || 'TRIAL';
    const limit = DAILY_LIMITS[tierName as keyof typeof DAILY_LIMITS] || DAILY_LIMITS.TRIAL;
    
    // Check if it's a new day (reset counter)
    const today = new Date().toISOString().split('T')[0];
    const lastChatDate = profile?.last_chat_date?.split('T')[0];
    
    let currentUsage = 0;
    if (lastChatDate === today) {
      currentUsage = profile?.daily_chat_requests || 0;
    }
    
    return {
      allowed: currentUsage < limit,
      used: currentUsage,
      limit: limit
    };
  } catch (error) {
    console.error('Error checking daily requests:', error);
    return { allowed: false, used: 0, limit: 0 };
  }
}

async function checkMonthlyRequests(supabase: any, userId: string) {
  try {
    // Get user profile with tier and monthly usage information, INCLUDING purchased requests
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        monthly_chat_requests,
        purchased_requests,
        last_monthly_reset_date,
        trial_started_at,
        created_at,
        tiers(name)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile for monthly check:', error);
      return { allowed: false, used: 0, limit: 0 };
    }

    const tierName = profile?.tiers?.name?.toUpperCase() || 'TRIAL';
    const limit = MONTHLY_LIMITS[tierName as keyof typeof MONTHLY_LIMITS] || MONTHLY_LIMITS.TRIAL;
    
    // Check if user needs a monthly reset using database function
    const { data: needsReset, error: resetError } = await supabase.rpc('needs_monthly_reset', {
      user_id: userId
    });

    if (resetError) {
      console.error('Error checking monthly reset:', resetError);
      return { allowed: false, used: 0, limit: 0 };
    }

    let currentUsage = profile?.monthly_chat_requests || 0;
    let purchasedRequests = profile?.purchased_requests || 0;
    
    // If user needs reset, their effective usage is 0 and purchased requests are cleared
    if (needsReset) {
      currentUsage = 0;
      purchasedRequests = 0;
    }

    // Calculate what's remaining
    const monthlyRemaining = Math.max(0, limit - currentUsage);
    const totalAvailable = monthlyRemaining + purchasedRequests;

    console.log(`User ${userId} - Tier: ${tierName}, Monthly: ${currentUsage}/${limit}, Purchased: ${purchasedRequests}, Total available: ${totalAvailable}`);

    if (totalAvailable <= 0) {
      // Get next reset date for user messaging
      const { data: nextResetDate } = await supabase.rpc('get_next_reset_date', {
        user_id: userId
      });

      return {
        allowed: false,
        used: currentUsage,
        limit: limit,
        monthlyRemaining: 0,
        purchasedRequests: 0,
        totalAvailable: 0,
        showPurchaseOption: true,
        resetDate: nextResetDate
      };
    }

    return {
      allowed: true,
      used: currentUsage,
      limit: limit,
      monthlyRemaining: monthlyRemaining,
      purchasedRequests: purchasedRequests,
      totalAvailable: totalAvailable,
      resetDate: null
    };
  } catch (error) {
    console.error('Exception checking monthly requests:', error);
    return { allowed: false, used: 0, limit: 0 };
  }
}

async function getUserTrackedAssets(supabase: any, userId: string) {
  try {
    const { data: assets, error } = await supabase
      .from('asset_subscriptions')
      .select('asset_slug, asset_name, asset_symbol')
      .eq('user_id', userId)
      .limit(10); // Keep context simple for MVP

    if (error) {
      console.error('Error fetching user assets:', error);
      return [];
    }

    return assets || [];
  } catch (error) {
    console.error('Error fetching user assets:', error);
    return [];
  }
}

// Detect time range from user query with safeguards
function detectTimeRangeFromQuery(message: string): number {
  const lowerMessage = message.toLowerCase();
  
  // Define time patterns and their corresponding days
  const timePatterns = [
    // Specific day counts
    { pattern: /last\s+(\d+)\s+days?/, extractor: (match: RegExpMatchArray) => Math.min(parseInt(match[1]), 90) },
    { pattern: /past\s+(\d+)\s+days?/, extractor: (match: RegExpMatchArray) => Math.min(parseInt(match[1]), 90) },
    { pattern: /(\d+)\s+days?\s+ago/, extractor: (match: RegExpMatchArray) => Math.min(parseInt(match[1]), 90) },
    
    // Named periods
    { pattern: /last\s+week|past\s+week|this\s+week|weekly/, days: 7 },
    { pattern: /last\s+month|past\s+month|this\s+month|monthly/, days: 30 },
    { pattern: /last\s+quarter|past\s+quarter|quarterly/, days: 90 },
    { pattern: /last\s+year|past\s+year|yearly|annual/, days: 90 }, // Cap at 90 days
    
    // Relative time
    { pattern: /yesterday/, days: 1 },
    { pattern: /today/, days: 1 },
    { pattern: /24\s*hours?/, days: 1 },
    { pattern: /48\s*hours?/, days: 2 },
    
    // Specific months (approximate)
    { pattern: /january|february|march|april|may|june|july|august|september|october|november|december/, days: 30 },
  ];
  
  // Check each pattern
  for (const timePattern of timePatterns) {
    if ('extractor' in timePattern) {
      const match = lowerMessage.match(timePattern.pattern);
      if (match) {
        return timePattern.extractor(match);
      }
    } else {
      if (timePattern.pattern.test(lowerMessage)) {
        return timePattern.days;
      }
    }
  }
  
  // Default to 7 days if no time range detected
  return 7;
}

async function getAssetMarketData(supabase: any, userAssets: any[], timeRangeDays: number = 7) {
  try {
    // Get asset slugs
    const assetSlugs = userAssets.map(a => a.asset_slug);
    
    // Calculate dynamic limit based on time range and number of assets
    // Estimate ~4 metrics per asset per day (price, volume, volatility, social)
    const dataPointsPerAssetPerDay = 4;
    const estimatedDataPoints = assetSlugs.length * timeRangeDays * dataPointsPerAssetPerDay;
    // Add 20% buffer and cap at reasonable maximum
    const dynamicLimit = Math.min(Math.ceil(estimatedDataPoints * 1.2), 10000);

    // Calculate date threshold using timeRangeDays parameter
    const dateThreshold = new Date(Date.now() - timeRangeDays * 24 * 60 * 60 * 1000).toISOString();
    
    console.log(`Fetching metrics for ${assetSlugs.length} assets over ${timeRangeDays} days (limit: ${dynamicLimit})`);

    // Fetch latest price and volume data from asset_metrics
    const { data: metrics, error } = await supabase
      .from('asset_metrics')
      .select('asset_slug, metric_type, value, datetime')
      .in('asset_slug', assetSlugs)
      .in('metric_type', ['price_usd', 'volume_usd', 'price_volatility_1d', 'social_volume_total'])
      .gte('datetime', dateThreshold) // Use dynamic time range
      .order('datetime', { ascending: false })
      .limit(dynamicLimit); // Use calculated limit based on time range and assets

    if (error) {
      console.error('Error fetching market data:', error);
      return userAssets; // Return without market data on error
    }

    console.log('Market metrics fetched:', metrics?.length || 0, 'records');

    // Group metrics by asset and keep ALL historical values
    const metricsMap = {};
    for (const metric of metrics || []) {
      if (!metricsMap[metric.asset_slug]) {
        metricsMap[metric.asset_slug] = {};
      }
      // Initialize array for each metric type if not exists
      if (!metricsMap[metric.asset_slug][metric.metric_type]) {
        metricsMap[metric.asset_slug][metric.metric_type] = [];
      }
      // Keep ALL values, not just the most recent
      metricsMap[metric.asset_slug][metric.metric_type].push({
        value: metric.value,
        datetime: metric.datetime
      });
    }

    // Calculate trends and merge with user assets
    return userAssets.map(asset => {
      const assetMetrics = metricsMap[asset.asset_slug] || {};
      const priceHistory = assetMetrics.price_usd || [];
      const volumeHistory = assetMetrics.volume_usd || [];
      
      // Get current values (most recent)
      const currentPrice = priceHistory[0]?.value || null;
      const currentVolume = volumeHistory[0]?.value || null;
      
      // Calculate price change over the time period
      let priceChange = null;
      let priceChangePercent = null;
      if (priceHistory.length > 0) {
        const oldestPrice = priceHistory[priceHistory.length - 1]?.value;
        if (oldestPrice && currentPrice) {
          priceChange = currentPrice - oldestPrice;
          priceChangePercent = ((currentPrice - oldestPrice) / oldestPrice) * 100;
        }
      }
      
      // Calculate volume trends
      let avgVolume = null;
      let volumeTrend = 'stable';
      if (volumeHistory.length > 0) {
        const volumes = volumeHistory.map(v => v.value);
        avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        
        // Simple trend: compare first half vs second half average
        if (volumes.length >= 4) {
          const midPoint = Math.floor(volumes.length / 2);
          const recentAvg = volumes.slice(0, midPoint).reduce((a, b) => a + b, 0) / midPoint;
          const olderAvg = volumes.slice(midPoint).reduce((a, b) => a + b, 0) / (volumes.length - midPoint);
          if (recentAvg > olderAvg * 1.1) volumeTrend = 'increasing';
          else if (recentAvg < olderAvg * 0.9) volumeTrend = 'decreasing';
        }
      }
      
      return {
        ...asset,
        // Current values
        price_usd: currentPrice,
        volume_usd: currentVolume,
        volatility: assetMetrics.price_volatility_1d?.[0]?.value || null,
        social_volume: assetMetrics.social_volume_total?.[0]?.value || null,
        // Historical data
        price_history: priceHistory,
        volume_history: volumeHistory,
        // Calculated trends
        price_change: priceChange,
        price_change_percent: priceChangePercent,
        avg_volume: avgVolume,
        volume_trend: volumeTrend,
        time_range_days: timeRangeDays,
        // Metadata
        last_updated: priceHistory[0]?.datetime || null,
        data_points: priceHistory.length
      };
    });
  } catch (error) {
    console.error('Error in getAssetMarketData:', error);
    return userAssets;
  }
}

// Build the full prompt for Gemini (extracted for cost tracking)
function buildFullPrompt(message: string, userAssets: any[], timeRangeDays: number): string {
  // Build context with market data including historical trends
  const assetContext = userAssets.map(asset => {
    const parts = [`${asset.asset_name} (${asset.asset_symbol})`];
    
    // Current data
    if (asset.price_usd) {
      parts.push(`Current Price: $${asset.price_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    
    // Price change over time period
    if (asset.price_change_percent !== null) {
      const changeSymbol = asset.price_change_percent >= 0 ? '+' : '';
      const periodLabel = asset.time_range_days === 1 ? '24h' : `${asset.time_range_days}-day`;
      parts.push(`${periodLabel} Change: ${changeSymbol}${asset.price_change_percent.toFixed(2)}%`);
    }
    
    // Volume data
    if (asset.volume_usd) {
      parts.push(`Current Volume: $${(asset.volume_usd / 1000000).toFixed(1)}M`);
    }
    if (asset.avg_volume) {
      const periodLabel = asset.time_range_days === 1 ? '24h' : `${asset.time_range_days}-day`;
      parts.push(`${periodLabel} Avg Volume: $${(asset.avg_volume / 1000000).toFixed(1)}M`);
    }
    if (asset.volume_trend && asset.volume_trend !== 'stable') {
      parts.push(`Volume Trend: ${asset.volume_trend}`);
    }
    
    // Other metrics
    if (asset.volatility) {
      parts.push(`Volatility: ${(asset.volatility * 100).toFixed(1)}%`);
    }
    if (asset.social_volume) {
      parts.push(`Social mentions: ${asset.social_volume}`);
    }
    
    // Data availability
    if (asset.data_points) {
      const periodLabel = asset.time_range_days === 1 ? 'day' : `${asset.time_range_days} days`;
      parts.push(`Data points: ${asset.data_points} over ${periodLabel}`);
    }
    
    return parts.join(', ');
  }).join('\n\n');

  // Add summary of available historical data
  const periodDescription = timeRangeDays === 1 ? '24 hours' : `${timeRangeDays} days`;
  const historicalDataSummary = userAssets.some(a => a.price_history?.length > 1)
    ? `\n\nHistorical data available for the past ${periodDescription}. I can analyze trends, calculate changes, and provide insights based on this data.`
    : '';

  const dataFreshness = userAssets[0]?.last_updated 
    ? `\n\nMarket data as of: ${new Date(userAssets[0].last_updated).toLocaleString()}`
    : '';

  const prompt = `You are an AI assistant for Future Cast, a crypto asset tracking platform.

The user is tracking these crypto assets with current and historical market data:

${assetContext}${historicalDataSummary}${dataFreshness}

User question: ${message}

Provide helpful analysis using the market data. You have access to:
- Current prices and ${timeRangeDays}-day price changes
- Volume data and trends over ${timeRangeDays} days
- Historical data points when available

Be specific with numbers and trends. If asked about timeframes beyond ${timeRangeDays} days or assets not tracked, explain the limitation clearly.`;

  return prompt;
}

// Simplified to just make the API call with a pre-built prompt
async function callGeminiAPI(prompt: string) {
  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    console.log('Gemini API key exists:', !!apiKey);
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const response = result.response;
    
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate AI response');
  }
}

async function incrementDailyRequestCount(supabase: any, userId: string) {
  try {
    console.log('📈 Incrementing daily request count for user:', userId);
    
    // Clean approach: Let the RPC function handle all logic
    // It will automatically handle new day vs same day scenarios
    const { error } = await supabase.rpc('increment_daily_requests', { 
      user_id: userId 
    });
    
    if (error) {
      console.error('❌ Error calling increment RPC:', error);
    } else {
      console.log('✅ Daily request count incremented successfully');
    }
  } catch (error) {
    console.error('💥 Error incrementing request count:', error);
    // Don't fail the request if we can't update counter
  }
}

async function incrementRequestCount(supabase: any, userId: string, requestCheck: any) {
  try {
    // Decide whether to use monthly or purchased requests
    if (requestCheck.monthlyRemaining > 0) {
      // Use monthly allocation
      console.log('📈 Using monthly request for user:', userId);
      
      const { error } = await supabase.rpc('increment_monthly_requests', { 
        user_id: userId 
      });
      
      if (error) {
        console.error('❌ Error incrementing monthly requests:', error);
      } else {
        console.log('✅ Monthly request count incremented');
      }
    } else if (requestCheck.purchasedRequests > 0) {
      // Use purchased request
      console.log('💳 Using purchased request for user:', userId);
      
      const { error } = await supabase
        .from('profiles')
        .update({ purchased_requests: requestCheck.purchasedRequests - 1 })
        .eq('id', userId);
      
      if (error) {
        console.error('❌ Error decrementing purchased requests:', error);
      } else {
        console.log('✅ Purchased request decremented');
      }
    }
  } catch (error) {
    console.error('Exception incrementing request count:', error);
    // Don't fail the request if we can't update counter
  }
}