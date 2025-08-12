
import React from 'react';
import { SubscriptionSelection as SubscriptionSelectionComponent } from '@/components/subscription/SubscriptionSelection';
import { Layout } from '@/components/Layout';

const SubscriptionSelection = () => {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] py-12">
        <SubscriptionSelectionComponent />
      </div>
    </Layout>
  );
};

export default SubscriptionSelection;
