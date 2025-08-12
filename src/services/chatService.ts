import { supabase } from '@/integrations/supabase/client';

// Types for API communication matching our Edge Function response
export interface ChatResponse {
  response: string;
  requestsUsedThisMonth: number;
  requestsRemaining: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  purchasedRequests: number;
  nextResetDate?: string;
  success: true;
}

export interface ChatError {
  error: string;
  success: false;
}

export type ChatApiResponse = ChatResponse | ChatError;

/**
 * Send a message to the FutureCast AI chatbot
 * 
 * Educational: This service handles:
 * 1. Authentication via JWT token from Supabase
 * 2. API communication with our Edge Function
 * 3. Error handling and user-friendly error messages
 * 4. Type safety with TypeScript interfaces
 * 
 * @param message - User's question about their crypto assets
 * @returns Promise<ChatResponse> - AI response with usage statistics
 */
export async function sendChatMessage(message: string): Promise<ChatResponse> {
  try {
    console.log('🚀 Sending chat message:', message.substring(0, 50) + '...');
    
    // Get the current user's JWT token for authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.access_token) {
      throw new Error('Authentication required. Please log in to use the chat feature.');
    }

    console.log('✅ User authenticated, calling Edge Function...');

    // Call our Edge Function with the user's message
    // Note: Local Supabase Edge Functions require full URL (different port)
    // In production, this would use a relative path or env variable
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "" || 'http://127.0.0.1:54321';
    const response = await fetch(`${supabaseUrl}/functions/v1/chat-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}` // JWT for user identification
      },
      body: JSON.stringify({ message })
    });

    console.log('📡 Edge Function response status:', response.status);

    // Parse the response
    const data: ChatApiResponse = await response.json();
    console.log('📦 Edge Function response data:', data);

    // Handle API errors (rate limits, feature disabled, etc.)
    if (!data.success) {
      console.error('❌ Edge Function error:', data.error);
      throw new Error(data.error);
    }

    console.log('✅ Chat message successful!');
    console.log('📊 Usage stats:', {
      used: data.requestsUsedThisMonth,
      remaining: data.requestsRemaining,
      limit: data.monthlyLimit,
      resetDate: data.nextResetDate
    });

    // Return the successful response
    return data;

  } catch (error) {
    console.error('💥 Chat service error:', error);
    
    // Provide user-friendly error messages based on error type
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to the chat service. Please check your internet connection and try again.');
      }
      if (error.message.includes('Daily limit')) {
        throw new Error('You\'ve reached your daily chat limit. Your requests will reset tomorrow.');
      }
      if (error.message.includes('Feature not enabled')) {
        throw new Error('The AI chat feature is not enabled for your account. Please contact support.');
      }
      
      // Pass through our custom error messages
      throw error;
    }
    
    // Generic fallback for unexpected errors
    throw new Error('Unable to send message. Please try again in a moment.');
  }
}

/**
 * Get current usage statistics for the user
 * 
 * Educational: This function fetches current chat usage from the database
 * to show accurate counts on page load, preventing the "3 remaining" bug
 * when users reload the page after using some requests.
 */
export async function getChatUsageStats(): Promise<{ 
  used: number; 
  remaining: number; 
  limit: number; 
  monthlyRemaining: number;
  purchasedRequests: number;
  nextResetDate?: string 
}> {
  try {
    console.log('📊 Fetching current usage stats from database...');
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.access_token) {
      console.warn('No session available for usage stats');
      return { used: 0, remaining: 0, limit: 0, monthlyRemaining: 0, purchasedRequests: 0 };
    }

    // Get user's current usage and tier information
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        monthly_chat_requests,
        purchased_requests,
        last_monthly_reset_date,
        tiers(name)
      `)
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching usage stats:', error);
      return { used: 0, remaining: 0, limit: 0, monthlyRemaining: 0, purchasedRequests: 0 };
    }

    // Calculate monthly limits based on tier (same logic as Edge Function)
    const tierName = profile?.tiers?.name?.toUpperCase() || 'TRIAL';
    const MONTHLY_LIMITS = {
      TRIAL: 90,    // 90 requests per month for trial users
      BASIC: 300,
      PRO: 1500,
      ELITE: 3000
    };
    const limit = MONTHLY_LIMITS[tierName as keyof typeof MONTHLY_LIMITS] || 90;

    // Check if we need a monthly reset
    const { data: resetData } = await supabase
      .rpc('needs_monthly_reset', { user_id: session.user.id });
    
    let used = 0;
    let purchasedRequests = profile?.purchased_requests || 0;
    
    if (!resetData) {
      // No reset needed, use current counts
      used = profile?.monthly_chat_requests || 0;
    } else {
      // If reset is needed, purchased requests will be cleared on next request
      purchasedRequests = 0;
    }
    
    const monthlyRemaining = Math.max(0, limit - used);
    const remaining = monthlyRemaining + purchasedRequests;
    
    // Get next reset date
    const { data: nextResetDateData } = await supabase
      .rpc('get_next_reset_date', { user_id: session.user.id });

    console.log('✅ Usage stats fetched:', { 
      used, 
      remaining, 
      limit, 
      monthlyRemaining,
      purchasedRequests,
      tier: tierName, 
      nextResetDate: nextResetDateData 
    });
    
    return { 
      used, 
      remaining, 
      limit, 
      monthlyRemaining,
      purchasedRequests,
      nextResetDate: nextResetDateData 
    };

  } catch (error) {
    console.error('Usage stats error:', error);
    return { used: 0, remaining: 0, limit: 0, monthlyRemaining: 0, purchasedRequests: 0 };
  }
}