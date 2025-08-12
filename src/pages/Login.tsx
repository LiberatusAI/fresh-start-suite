import React from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { PricingDisplay } from '@/components/auth/PricingDisplay';
import { Layout } from '@/components/Layout';
import { getSignupFlow } from '@/utils/featureFlags';

const Login = () => {
  const signupFlow = getSignupFlow();
  const showPricing = signupFlow === 'plan-first';

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
        <div className={`w-full ${showPricing ? 'max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16' : 'max-w-md mx-auto'}`}>
          {/* Login Form - centered when no pricing */}
          <div className="flex items-center justify-center">
            <LoginForm />
          </div>
          
          {/* Right side - Pricing Display (only in plan-first flow) */}
          {showPricing && (
            <div className="hidden lg:flex items-center justify-center bg-white/30 dark:bg-charcoal-light/20 rounded-2xl p-8">
              <PricingDisplay />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Login;
