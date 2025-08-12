import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
console.log(`Function "delete-user-fully" up and running!`);
serve(async (req)=>{
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Ensure the request method is POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method Not Allowed'
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Parse the request body
    const payload = await req.json();
    const { teamMemberId, email } = payload;
    // Validate input
    if (!teamMemberId || !email) {
      return new Response(JSON.stringify({
        error: 'Missing teamMemberId or email'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Create Supabase Admin Client using environment variables
    // Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your function's environment settings
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    console.log(`Processing deletion for email: ${email}, teamMemberId: ${teamMemberId}`);
    // 1. Find the user_id from the email using the Admin API
    //    Note: listUsers is used here for broader compatibility, adjust if needed.
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      email: email
    });
    if (listErr) {
      console.error('Error listing users:', listErr);
      throw new Error(`Failed to lookup user by email: ${listErr.message}`);
    }
    if (!users || users.length === 0) {
      console.warn(`No auth user found for email: ${email}. Only deleting team member record.`);
      // Proceed to delete team_member only, as profile/auth user don't exist or match.
      const { error: tmDeleteError } = await supabaseAdmin.from('team_members').delete().eq('id', teamMemberId);
      if (tmDeleteError) {
        console.error(`Error deleting team_member (ID: ${teamMemberId}) when auth user not found:`, tmDeleteError);
        throw new Error(`Failed to delete team member record: ${tmDeleteError.message}`);
      }
      return new Response(JSON.stringify({
        message: `Team member record deleted, but no matching auth user found for email ${email}.`
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (users.length > 1) {
      console.error(`Multiple auth users found for email: ${email}. Aborting deletion. Details of users found:`, JSON.stringify(users, null, 2));
      throw new Error(`Multiple users found for email ${email}. Cannot proceed with deletion. See function logs for details of users found.`);
    }
    const userId = users[0].id;
    console.log(`Found user ID: ${userId} for email: ${email}`);
    // --- Perform Deletions ---
    // It's generally safer to delete dependent records first.
    // Order: team_members -> profiles -> auth.users
    // 2. Delete from team_members table
    console.log(`Deleting from team_members with ID: ${teamMemberId}`);
    const { error: tmError } = await supabaseAdmin.from('team_members').delete().eq('id', teamMemberId); // Use the specific team_member ID
    if (tmError) {
      console.error(`Error deleting team_member (ID: ${teamMemberId}):`, tmError);
      // Decide if you want to proceed or stop. Stopping might be safer.
      throw new Error(`Failed to delete team member record: ${tmError.message}`);
    }
    console.log(`Successfully deleted team_member record: ${teamMemberId}`);
    // 3. Delete from profiles table
    // Assuming the profile ID matches the auth user ID
    console.log(`Deleting from profiles with ID: ${userId}`);
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId); // Use the auth user ID
    if (profileError) {
      // Log the error but potentially continue to delete the auth user? Or stop?
      // Let's stop for now to ensure data consistency awareness.
      // If the profile might not exist, check error code (e.g., P0001 for "Record not found" if using RLS)
      console.error(`Error deleting profile (ID: ${userId}):`, profileError);
      throw new Error(`Failed to delete profile record: ${profileError.message}`);
    }
    console.log(`Successfully deleted profile record: ${userId}`);
    // 4. Delete the user from auth.users
    console.log(`Deleting user from auth.users with ID: ${userId}`);
    const { data: userDeleteData, error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error(`Error deleting auth user (ID: ${userId}):`, authError);
      // This is critical, maybe the previous deletes should be rolled back if possible (manual compensation needed)
      throw new Error(`Failed to delete authentication user: ${authError.message}`);
    }
    console.log(`Successfully deleted auth user: ${userId}`, userDeleteData);
    // --- Deletion Successful ---
    return new Response(JSON.stringify({
      message: `User ${email} fully deleted successfully.`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Unhandled error in delete-user-fully function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
