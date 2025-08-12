import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAssetSubscriptions } from '@/hooks/useAssetSubscriptions';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function SubscriptionSuccess() {
  const [isProcessing, setIsProcessing] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { saveAssetSubscription } = useAssetSubscriptions();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const handleSuccess = async () => {
      if (!sessionId) {
        toast({
          title: "Error",
          description: "No session ID found. Please contact support.",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      try {
        // Verify the session with our backend
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
          'verify-stripe-session',
          {
            body: { sessionId }
          }
        );

        if (sessionError) throw sessionError;

        // Get pending asset subscriptions from localStorage
        const pendingData = localStorage.getItem('pendingAssetSubscriptions');
        if (pendingData) {
          const { assets, scheduleItems } = JSON.parse(pendingData);
          
          // Create asset subscriptions
          for (const asset of assets) {
            const scheduleItem = scheduleItems.find((item: any) => item.assetId === asset.id);
            if (scheduleItem) {
              await saveAssetSubscription(asset, scheduleItem.times, scheduleItem.days);
            } else {
              await saveAssetSubscription(asset, [], ['daily']);
            }
          }

          // Update the paid additional assets count in localStorage
          const currentPaidAdditionalAssets = Number(localStorage.getItem('paidAdditionalAssets') || "0");
          const newPaidAdditionalAssets = currentPaidAdditionalAssets + assets.length;
          localStorage.setItem('paidAdditionalAssets', newPaidAdditionalAssets.toString());

          // Clear the pending data
          localStorage.removeItem('pendingAssetSubscriptions');

          toast({
            title: "Success!",
            description: "Your subscription and asset selections have been updated.",
          });
        }

        // Navigate to dashboard
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Error processing subscription:', error);
        toast({
          title: "Error",
          description: error.message || "There was an error processing your subscription. Please contact support.",
          variant: "destructive",
        });
        navigate('/dashboard');
      } finally {
        setIsProcessing(false);
      }
    };

    handleSuccess();
  }, [sessionId, navigate, saveAssetSubscription]);

  if (isProcessing) {
    return (
      <div className="w-full max-w-3xl mx-auto text-center py-12">
        <h1 className="text-2xl font-semibold mb-4">Processing your subscription...</h1>
        <p className="text-muted-foreground">Please wait while we set up your account.</p>
      </div>
    );
  }

  return null;
}

export default SubscriptionSuccess; 