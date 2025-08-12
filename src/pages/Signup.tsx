import React, { useState } from 'react';
import { SignupForm } from '@/components/auth/SignupForm';
import { PricingDisplay } from '@/components/auth/PricingDisplay';
import { Layout } from '@/components/Layout';
import { SubscriptionTier } from '@/types';
import { getSignupFlow } from '@/utils/featureFlags';

const Signup = () => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier | undefined>();
  const signupFlow = getSignupFlow();
  const isValueFirst = signupFlow === 'value-first';

  // For value-first flow, auto-select trial (not shown to user)
  React.useEffect(() => {
    if (isValueFirst && !selectedPlan) {
      setSelectedPlan('trial');
    }
  }, [isValueFirst, selectedPlan]);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-8">
        <div className={`w-full ${isValueFirst ? 'max-w-md' : 'max-w-6xl'} mx-auto grid grid-cols-1 ${!isValueFirst && 'lg:grid-cols-2'} gap-8 lg:gap-12`}>
          {/* Left side - Signup Form */}
          <div className="flex items-center justify-center">
            <SignupForm selectedPlan={selectedPlan} onPlanSelect={setSelectedPlan} />
          </div>
          
          {/* Right side - Pricing Display (only for plan-first flow) */}
          {!isValueFirst && (
            <div className="flex items-center justify-center bg-white/30 dark:bg-charcoal-light/20 rounded-2xl p-6">
              <PricingDisplay 
                selectedPlan={selectedPlan}
                onPlanSelect={setSelectedPlan}
                interactive={true}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Signup;
