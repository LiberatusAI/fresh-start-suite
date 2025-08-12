import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { useAuth } from '@/context/AuthContext';
import { enforceAssetLimits } from '@/utils/assetLimitEnforcement';

const SubscriptionCanceledPage = () => {
  const [isEnforcing, setIsEnforcing] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleContinueWithTrial = async () => {
    if (!user) return;
    
    setIsEnforcing(true);
    try {
      // Enforce asset limits before going to dashboard
      await enforceAssetLimits(user.id);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error enforcing asset limits:', error);
      // Still navigate to dashboard - user can contact support
      navigate('/dashboard');
    } finally {
      setIsEnforcing(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Payment Canceled
            </CardTitle>
            <CardDescription className="pt-2">
              No worries! Your selected assets and settings have been saved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>You can try a different payment method or return later to complete your subscription.</p>
            
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/plan-selection">Try Payment Again</Link>
              </Button>
              
              <Button 
                onClick={handleContinueWithTrial} 
                variant="outline" 
                className="w-full"
                disabled={isEnforcing}
              >
                {isEnforcing ? 'Setting up trial...' : 'Continue with Trial'}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Your trial account includes 1 asset with daily reports.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SubscriptionCanceledPage;