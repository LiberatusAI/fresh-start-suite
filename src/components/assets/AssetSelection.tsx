import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssetSelectionState } from './hooks/useAssetSelectionState';
import { useAssetSelectionSubmit } from './handlers/useAssetSelectionSubmit';
import { useAvailableAssets } from '@/hooks/useAvailableAssets';
import { AssetSelectionHeader } from './AssetSelectionHeader';
import { AssetGrid } from './AssetGrid';
import { AssetSelectionSummary } from './AssetSelectionSummary';
import { CryptoAsset } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Search, Coins, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/context/AuthContext';

interface AssetSelectionProps {
  fromDashboard?: boolean;
}

const CryptoIcon = ({ symbol, name, className }: { symbol: string; name: string; className?: string }) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={cn("w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center", className)}>
        <Coins className="w-4 h-4 text-primary" />
      </div>
    );
  }

  return (
    <img
      src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/${symbol.toLowerCase()}.svg`}
      alt={name}
      className={cn("w-8 h-8", className)}
      onError={() => setError(true)}
    />
  );
};

export function AssetSelection({ fromDashboard = false }: AssetSelectionProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  
  const assetState = useAssetSelectionState(fromDashboard);
  const {
    assets: availableAssets,
    isLoading: isLoadingAssets,
    error: assetsError,
    pagination
  } = useAvailableAssets(searchQuery, { page: currentPage, itemsPerPage: 12 });
  
  const { 
    assetsToRemove,
    userTier,
    isLoadingUserData,
    existingAssetCount,
    navigationFromDashboard,
    assetSubscriptions,
    isLoadingSubscriptions,
    removeAssetSubscription,
    isAssetAlreadyTracked,
    toggleAssetSelection,
    calculateNewBilling,
    navigate: internalNavigate,
    setContextSelectedAssets,
    assetToConfirmDelete,
    handleConfirmDelete,
    handleCancelDelete,
    isFirstTimeUser,
    selectedReportTime,
    setSelectedReportTime,
    hasExistingGlobalTime
  } = assetState;

  // Get the full asset objects for selected assets
  const selectedAssets = availableAssets
    .filter(asset => selectedAssetIds.includes(asset.id))
    .map(asset => ({
      id: asset.id,
      slug: asset.slug,
      name: asset.name,
      symbol: asset.symbol,
      icon: asset.icon,
      currentPrice: asset.currentPrice,
      priceChange24h: asset.priceChange24h
    }));

  const { isLoading: isSubmitting, handleSubmit } = useAssetSelectionSubmit({
    selectedAssets,
    assetsToRemove,
    existingAssetCount,
    userTier,
    assetSubscriptions,
    removeAssetSubscription,
    calculateNewBilling,
    navigate: internalNavigate,
    setSelectedAssetIds: (ids: string[]) => {
      setSelectedAssetIds(ids);
      setContextSelectedAssets(availableAssets.filter(asset => ids.includes(asset.id)));
    },
    setContextSelectedAssets,
    navigationFromDashboard,
    isFirstTimeUser,
    selectedReportTime
  });

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (pagination.hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleToggleAsset = (assetId: string) => {
    if (!user) {
      navigate('/signup');
      return;
    }
    toggleAssetSelection(assetId);
    setSelectedAssetIds(prev => {
      if (prev.includes(assetId)) {
        return prev.filter(id => id !== assetId);
      } else {
        return [...prev, assetId];
      }
    });
  };

  // Handle back navigation
  const handleBackNavigation = () => {
    if (navigationFromDashboard) {
      internalNavigate("/dashboard");
    } else {
      internalNavigate("/subscription");
    }
  };

  const handleSubmitClick = () => {
    if (!user) {
      navigate('/signup');
      return;
    }
    handleSubmit();
  };

  // Only wait for user data and subscriptions if user is authenticated
  if (user && (isLoadingUserData || isLoadingSubscriptions)) {
    return <div className="w-full max-w-4xl mx-auto text-center py-12">Loading...</div>;
  }

  // Always wait for assets to load
  if (isLoadingAssets) {
    return <div className="w-full max-w-4xl mx-auto text-center py-12">Loading...</div>;
  }

  if (assetsError) {
    return <div className="w-full max-w-4xl mx-auto text-center py-12 text-red-600">
      Error loading assets. Please try again later.
    </div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        {user ? (
          <Button
            variant="ghost"
            onClick={handleBackNavigation}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        ) : (
          <div className="text-sm text-muted-foreground">
            Sign up to start tracking assets
          </div>
        )}
      </div>

      <AssetSelectionHeader
        userTier={userTier}
        existingAssetCount={user ? existingAssetCount : 0}
      />

      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {availableAssets.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No assets found
            </div>
          ) : (
            availableAssets.map(asset => {
              const isSelected = selectedAssetIds.includes(asset.id);
              const isTracked = isAssetAlreadyTracked(asset.id);
              const isRemovable = isTracked && fromDashboard;
              const isMarkedForRemoval = assetsToRemove.includes(asset.id);

              return (
                <div
                  key={asset.id}
                  className={cn(
                    "relative p-4 rounded-lg border transition-all",
                    isSelected || isTracked
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                    isMarkedForRemoval && "opacity-50"
                  )}
                >
                  <button
                    onClick={() => handleToggleAsset(asset.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <CryptoIcon symbol={asset.symbol} name={asset.name} />
                      <div>
                        <h3 className="font-medium">{asset.name}</h3>
                        <p className="text-sm text-gray-500">{asset.symbol}</p>
                      </div>
                      {(isSelected || isTracked) && !isMarkedForRemoval && (
                        <div className="absolute right-2 top-2">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      {isMarkedForRemoval && (
                        <div className="absolute right-2 top-2">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {availableAssets.length > 0 && (
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePreviousPage}
              disabled={!pagination.hasPreviousPage}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={handleNextPage}
              disabled={!pagination.hasNextPage}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {user && (
        <div className="mt-8">
          <AssetSelectionSummary
            selectedCount={selectedAssets.length}
            removedCount={assetsToRemove.length}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmitClick}
            isFirstTimeUser={isFirstTimeUser}
            selectedReportTime={selectedReportTime}
            onTimeChange={setSelectedReportTime}
          />
        </div>
      )}

      <AlertDialog open={!!assetToConfirmDelete} onOpenChange={() => handleCancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to stop tracking {assetToConfirmDelete?.name}? 
              This will remove it from your tracking list and you will no longer receive reports for this asset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

