
import React from 'react';
import { Layout } from '@/components/Layout';
import { PlanChangePage } from '@/components/dashboard/subscription/PlanChangePage';

const PlanChange = () => {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] py-12">
        <PlanChangePage />
      </div>
    </Layout>
  );
};

export default PlanChange;
