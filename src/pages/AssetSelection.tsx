
import React from 'react';
import { useLocation } from 'react-router-dom';
import { AssetSelection as AssetSelectionComponent } from '@/components/assets/AssetSelection';
import { Layout } from '@/components/Layout';

const AssetSelection = () => {
  const location = useLocation();
  const fromDashboard = location.state?.fromDashboard || false;

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] py-12">
        <AssetSelectionComponent fromDashboard={fromDashboard} />
      </div>
    </Layout>
  );
};

export default AssetSelection;
