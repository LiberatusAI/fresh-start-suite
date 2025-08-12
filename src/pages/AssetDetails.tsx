import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SelectableMetricChart } from '@/components/dashboard/metrics/SelectableMetricChart';
import { useAssetDetails } from '@/hooks/useAssetDetails';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function AssetDetails() {
  const { assetId } = useParams<{ assetId: string }>();
  const { asset, isLoading, error } = useAssetDetails(assetId);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
            <div className="h-[600px] bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !asset) {
    return (
      <Layout>
        <div className="container py-12 max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="text-red-500 dark:text-red-400 text-lg">
              {error ? error.message : 'Asset not found'}
            </div>
            <Button asChild variant="outline">
              <Link to="/dashboard">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Button
              variant="ghost"
              asChild
              className="mb-4 text-muted-foreground hover:text-primary"
            >
              <Link to="/dashboard">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              {asset.name} ({asset.symbol}) Metrics
            </h1>
            <p className="text-muted-foreground">
              View and analyze various metrics for {asset.name}
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <SelectableMetricChart
            assetName={asset.name}
            assetSymbol={asset.symbol}
            assetSlug={asset.slug}
            className="border-gold/20 bg-white/90 dark:bg-charcoal-light/60 dark:border-gold/10"
          />
        </div>
      </div>
    </Layout>
  );
} 