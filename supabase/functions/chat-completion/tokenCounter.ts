// Token counting and cost calculation for Gemini API
// Since Gemini doesn't return token counts, we estimate them

/**
 * Estimate token count for text
 * Gemini uses a similar tokenization to other LLMs
 * Rule of thumb: ~4 characters = 1 token for English text
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  // More accurate estimation considering:
  // - Whitespace and punctuation typically combine with words
  // - Numbers and special characters may be separate tokens
  // - Average English word is ~5 characters
  
  // Simple but reasonable estimation
  return Math.ceil(text.length / 4);
}

/**
 * Current Gemini 1.5 Flash pricing as of August 2025
 * Prices are per 1,000 tokens in USD
 */
export const GEMINI_PRICING = {
  'gemini-1.5-flash': {
    prompt: 0.000075,      // $0.075 per 1M tokens
    completion: 0.0003,    // $0.30 per 1M tokens
  },
  'gemini-1.5-pro': {
    prompt: 0.00125,       // $1.25 per 1M tokens (if we upgrade)
    completion: 0.005,     // $5.00 per 1M tokens
  }
};

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptCost: number;
  completionCost: number;
  totalCost: number;
}

/**
 * Calculate token usage and cost for a request
 */
export function calculateCost(
  promptText: string,
  completionText: string,
  model: string = 'gemini-1.5-flash'
): TokenUsage {
  const promptTokens = estimateTokens(promptText);
  const completionTokens = estimateTokens(completionText);
  const totalTokens = promptTokens + completionTokens;
  
  const pricing = GEMINI_PRICING[model as keyof typeof GEMINI_PRICING] || GEMINI_PRICING['gemini-1.5-flash'];
  
  // Calculate costs (price is per 1,000 tokens)
  const promptCost = (promptTokens / 1000) * pricing.prompt;
  const completionCost = (completionTokens / 1000) * pricing.completion;
  const totalCost = promptCost + completionCost;
  
  return {
    promptTokens,
    completionTokens,
    totalTokens,
    promptCost,
    completionCost,
    totalCost
  };
}

/**
 * Log cost data to database for analytics
 */
export async function logCostAnalytics(
  supabase: any,
  userId: string,
  featureType: 'chat' | 'welcome_report' | 'asset_report' | 'test_report',
  prompt: string,
  completion: string,
  contextSize: number,
  responseTimeMs: number,
  userTier?: string,
  requestId?: string
): Promise<void> {
  try {
    const tokenUsage = calculateCost(prompt, completion);
    const model = 'gemini-1.5-flash';
    
    const { error } = await supabase
      .from('ai_cost_analytics')
      .insert({
        user_id: userId,
        feature_type: featureType,
        request_id: requestId,
        prompt_tokens: tokenUsage.promptTokens,
        completion_tokens: tokenUsage.completionTokens,
        total_tokens: tokenUsage.totalTokens,
        prompt_cost: tokenUsage.promptCost,
        completion_cost: tokenUsage.completionCost,
        total_cost: tokenUsage.totalCost,
        model_name: model,
        model_pricing: GEMINI_PRICING[model],
        context_size: contextSize,
        response_time_ms: responseTimeMs,
        user_tier: userTier
      });
      
    if (error) {
      console.error('Failed to log cost analytics:', error);
    } else {
      console.log(`💰 Cost logged: $${tokenUsage.totalCost.toFixed(8)} for ${tokenUsage.totalTokens} tokens (${featureType})`);
    }
  } catch (error) {
    console.error('Exception logging cost:', error);
  }
}

/**
 * Format cost for display (rounds to reasonable precision)
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(6)}`;
  } else if (cost < 1) {
    return `$${cost.toFixed(4)}`;
  } else {
    return `$${cost.toFixed(2)}`;
  }
}