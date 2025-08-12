import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export function useWelcomeReportStatus() {
  const { user } = useAuth();
  const [welcomeReportSent, setWelcomeReportSent] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWelcomeReportStatus() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('welcome_report_sent')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching welcome report status:', error);
          setWelcomeReportSent(false); // Default to false on error
        } else {
          setWelcomeReportSent(data?.welcome_report_sent || false);
        }
      } catch (error) {
        console.error('Error in fetchWelcomeReportStatus:', error);
        setWelcomeReportSent(false);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWelcomeReportStatus();
  }, [user?.id]);

  return { welcomeReportSent, isLoading };
}