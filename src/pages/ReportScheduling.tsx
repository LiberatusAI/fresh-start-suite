import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ReportScheduling as ReportSchedulingComponent } from '@/components/scheduling/ReportScheduling';
import { Layout } from '@/components/Layout';
import { useAssets } from '@/context/AssetContext';

const ReportScheduling = () => {
  const { selectedAssets, setSelectedAssets } = useAssets();
  const navigate = useNavigate();
  const location = useLocation();
  const fromDashboard = location.state?.fromDashboard || false;
  const navigationAssets = location.state?.selectedAssets || [];

  // Set selected assets from navigation state if available
  useEffect(() => {
    if (navigationAssets.length > 0) {
      setSelectedAssets(navigationAssets);
    }
  }, [navigationAssets, setSelectedAssets]);

  // Redirect to asset selection if no assets are selected
  useEffect(() => {
    if (selectedAssets.length === 0 && navigationAssets.length === 0) {
      navigate("/assets", { state: { fromDashboard } });
    }
  }, [selectedAssets, navigationAssets, navigate, fromDashboard]);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] py-12">
        <ReportSchedulingComponent fromDashboard={fromDashboard} />
      </div>
    </Layout>
  );
};

export default ReportScheduling;
