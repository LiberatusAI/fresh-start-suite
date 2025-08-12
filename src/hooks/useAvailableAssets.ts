import { useQuery } from '@apollo/client';
import { useState, useMemo } from 'react';
import { GET_AVAILABLE_ASSETS } from '@/integrations/graphql/queries/assets';
import { CryptoAsset } from '@/types';
import { useAssetSubscriptions } from './useAssetSubscriptions';

// Top 20 cryptocurrencies by market cap (as of 2024)
const POPULAR_ASSETS = [
  'bitcoin',
  'ethereum',
  'binancecoin',
  'solana',
  'ripple',
  'cardano',
  'avalanche-2',
  'dogecoin',
  'polkadot',
  'tron',
  'chainlink',
  'polygon',
  'shiba-inu',
  'litecoin',
  'uniswap',
  'stellar',
  'monero',
  'cosmos',
  'bitcoin-cash',
  'maker'
];

interface SantimentProject {
  name: string;
  slug: string;
  ticker: string;
  priceUsd: number;
  percentChange24h: number;
}

interface AvailableAssetsResponse {
  allProjects: SantimentProject[];
}

interface PaginationOptions {
  page: number;
  itemsPerPage: number;
}

export const useAvailableAssets = (searchQuery: string = '', pagination: PaginationOptions = { page: 1, itemsPerPage: 12 }) => {
  const { data, loading, error } = useQuery<AvailableAssetsResponse>(GET_AVAILABLE_ASSETS);
  const { assetSubscriptions } = useAssetSubscriptions();

  // Transform and filter assets based on search query
  const filteredAssets: CryptoAsset[] = useMemo(() => {
    const searchTerm = searchQuery.toLowerCase().trim();

    // First, add tracked assets that might not be in the API response
    const trackedAssets = assetSubscriptions.map(sub => ({
      id: sub.assetId,
      slug: sub.slug,
      name: sub.name,
      symbol: sub.symbol,
      icon: sub.icon,
      currentPrice: sub.currentPrice || 0,
      priceChange24h: sub.priceChange24h || 0,
      isTracked: true
    }));

    // Then add assets from the API
    const apiAssets = (data?.allProjects || [])
      .filter(project => {
        if (!project.priceUsd || !project.ticker) return false;
        if (!searchTerm) return true;
        
        return (
          project.name.toLowerCase().includes(searchTerm) ||
          project.ticker.toLowerCase().includes(searchTerm) ||
          project.slug.toLowerCase().includes(searchTerm)
        );
      })
      .map(project => ({
        id: project.slug,
        slug: project.slug,
        name: project.name,
        symbol: project.ticker,
        icon: project.ticker.toLowerCase(),
        currentPrice: project.priceUsd || 0,
        priceChange24h: project.percentChange24h || 0,
        isTracked: false
      }));

    // Merge the two lists, ensuring no duplicates
    const allAssets = [...trackedAssets];
    apiAssets.forEach(apiAsset => {
      if (!allAssets.some(trackedAsset => trackedAsset.id === apiAsset.id)) {
        allAssets.push(apiAsset);
      }
    });

    // Sort assets by popularity and tracked status
    return allAssets.sort((a, b) => {
      // Tracked assets should always come first
      if (a.isTracked && !b.isTracked) return -1;
      if (!a.isTracked && b.isTracked) return 1;

      const aIndex = POPULAR_ASSETS.indexOf(a.slug);
      const bIndex = POPULAR_ASSETS.indexOf(b.slug);
      
      // If both assets are in the popular list, sort by their order in the list
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one asset is in the popular list, it should come first
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // For non-popular assets, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [data?.allProjects, searchQuery, assetSubscriptions]);

  // Calculate pagination
  const totalItems = filteredAssets.length;
  const totalPages = Math.ceil(totalItems / pagination.itemsPerPage);
  const startIndex = (pagination.page - 1) * pagination.itemsPerPage;
  const endIndex = startIndex + pagination.itemsPerPage;
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex);

  return {
    assets: paginatedAssets,
    isLoading: loading,
    error,
    pagination: {
      currentPage: pagination.page,
      totalPages,
      totalItems,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1
    }
  };
}; 