import { supabase } from '@/integrations/supabase/client';

// Welcome report trigger function for first-time users only
export const triggerWelcomeReport = async (userId: string, assetSlugs?: string[]) => {
  try {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      console.error('Invalid userId for welcome report:', userId);
      return;
    }
    
    console.log('Triggering welcome report for first-time user:', userId);
    
    // Use the new trigger function that handles CORS properly
    // The backend function will fetch asset slugs if not provided
    const { data, error } = await supabase.functions.invoke('trigger-welcome-report', {
      body: { 
        user_id: userId
        // Note: asset_slugs not needed - backend will fetch them
      }
    });
    
    if (error) {
      console.error('Welcome report failed:', error);
      // Log but don't throw - this should not break the user flow
    } else {
      console.log('Welcome report triggered successfully:', data);
    }
  } catch (error) {
    console.error('Welcome report error:', error);
    // Silent failure to prevent blocking user flow
  }
};