import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, access-control-request-headers, access-control-request-method',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();

    // Find all trial users whose trial has expired
    const { data: expiredTrials, error: fetchError } = await supabaseClient
      .from('profiles')
      .select('id, email, first_name, last_name, trial_end_date')
      .eq('is_trial_user', true)
      .lt('trial_end_date', now.toISOString());

    if (fetchError) {
      console.error('Error fetching expired trials:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch expired trials' }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const expiredCount = expiredTrials?.length || 0;
    console.log(`Found ${expiredCount} expired trial users`);

    // Update expired trial users to remove trial status
    if (expiredTrials && expiredTrials.length > 0) {
      const userIds = expiredTrials.map(user => user.id);
      
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          is_trial_user: false,
          subscription_tier_id: null,
          updated_at: now.toISOString()
        })
        .in('id', userIds);

      if (updateError) {
        console.error('Error updating expired trial users:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update expired trial users' }), {
          status: 500,
          headers: corsHeaders
        });
      }

      // Log expired users for admin notification
      expiredTrials.forEach(user => {
        console.log(`Trial expired for user: ${user.email} (${user.first_name} ${user.last_name})`);
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      expiredCount,
      message: `Processed ${expiredCount} expired trial users`
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error checking trial expiration:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to check trial expiration'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}); 