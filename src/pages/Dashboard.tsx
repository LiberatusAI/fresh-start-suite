
import React from 'react';
import { Dashboard as DashboardComponent } from '@/components/dashboard/Dashboard';
import { Layout } from '@/components/Layout';

const Dashboard = () => {
  return (
    <Layout>
      <div className="py-12">
        <DashboardComponent />
      </div>
    </Layout>
  );
};

export default Dashboard;
