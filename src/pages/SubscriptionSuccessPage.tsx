import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const SubscriptionSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, fetchUserProfile } = useAuth(); // Assuming fetchUserProfile can refresh user context
  const sessionId = searchParams.get('session_id');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId && user) {
      const verifySessionAndUpdate = async () => {
        setIsLoading(true);
        setError(null);
        try {
          console.log("Invoking Supabase function 'verify-stripe-session' with session ID:", sessionId);
          const { data, error: functionError } = await supabase.functions.invoke(
            'verify-stripe-session', 
            {
              body: { sessionId }, 
              // Supabase client automatically includes Authorization header with user's JWT
            }
          );

          if (functionError) {
            console.error('Supabase function returned an error:', functionError);
            throw new Error(functionError.message || 'Verification failed. Please contact support.');
          }

          if (data && data.success) {
            toast({
              title: "Subscription Confirmed!",
              description: data.message || "Your subscription has been successfully activated.",
            });
            // Optionally, refresh user profile to get updated subscription status in context
            if (fetchUserProfile) {
              await fetchUserProfile(); 
            }
            // Redirect to dashboard or a more specific page after a short delay
            setTimeout(() => navigate('/dashboard'), 3000);
          } else {
            console.error('Verification function did not return success:', data);
            throw new Error(data?.error || 'Verification failed. Unknown error.');
          }
        } catch (e: any) {
          console.error("Error verifying session:", e);
          setError(e.message || "An unexpected error occurred during verification.");
          toast({
            title: "Verification Error",
            description: e.message || "Could not confirm your subscription status. Please contact support.",
            variant: "destructive",
          });
        }
        setIsLoading(false);
      };

      verifySessionAndUpdate();
    } else if (!sessionId) {
        setError("No session ID found in URL. Cannot verify subscription.");
        setIsLoading(false);
    } else if (!user) {
        // User might not be loaded yet, or this page was accessed without auth
        // Handled by ProtectedRoute, but good to be aware
        setError("User not authenticated. Please log in.");
        setIsLoading(false);
    }
  }, [sessionId, user, navigate, fetchUserProfile]);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {isLoading ? "Verifying Your Subscription..." : error ? "Verification Failed" : "Subscription Successful!"}
            </CardTitle>
            {error && <CardDescription className="text-red-500 pt-2">{error}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
                <p>Please wait while we confirm your payment.</p>
              </div>
            )}
            {!isLoading && !error && (
              <>
                <p>Thank you for subscribing. Your access has been updated.</p>
                <p>You will be redirected to the dashboard shortly.</p>
                <Button asChild className="w-full">
                  <Link to="/dashboard">Go to Dashboard Now</Link>
                </Button>
              </>
            )}
            {!isLoading && error && (
                 <Button asChild className="w-full" variant="outline">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SubscriptionSuccessPage; 