import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CryptoAsset } from '@/types';
import { saveAssetSubscriptionToDb, updateAssetSubscriptionInDb, removeAssetSubscriptionFromDb } from '@/utils/assetSubscriptionUtils';

export interface AssetSubscription {
  id: string;
  assetId: string;
  slug: string;
  name: string;
  symbol: string;
  icon: string;
  reportTimes: string[];
  reportDays: string;
  lastReportSent: Date | null;
  
  // Price & market data
  currentPrice?: number;
  priceChange24h?: number;
  tradingVolume24h?: number;
  marketCap?: number;
}

export const useAssetSubscriptions = () => {
  const { user } = useAuth();
  const [assetSubscriptions, setAssetSubscriptions] = useState<AssetSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssetSubscriptions = async () => {
    if (!user) {
      setAssetSubscriptions([]);
      setIsLoading(false);
      return;
    }

    try {
      // First fetch all subscriptions
      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('asset_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (subscriptionError) {
        throw subscriptionError;
      }

      console.log('Raw subscription data:', subscriptions);

      if (subscriptions) {
        const priceChanges = await Promise.all(
          subscriptions.map(async (subscription) => {
            console.log(`Fetching price data for ${subscription.asset_slug}`);
            
            // Get the most recent price_usd_5m data (updated every 5 minutes)
            const { data: priceData, error: priceError } = await supabase
              .from('asset_metrics')
              .select('value, datetime')
              .eq('asset_slug', subscription.asset_slug)
              .eq('metric_type', 'price_usd_5m')
              .order('datetime', { ascending: false })
              .limit(50); // Get enough entries to calculate 24h change

            if (priceError) {
              console.error(`Error fetching price data for ${subscription.asset_slug}:`, priceError);
            }

            console.log(`Found ${priceData?.length || 0} price_usd_5m records for ${subscription.asset_slug}`);

            let currentPrice = 0;
            let priceChange24h = 0;

            if (priceData && priceData.length > 0) {
              // Current price is the most recent entry
              currentPrice = Number(priceData[0].value) || 0;
              console.log(`Current price for ${subscription.asset_slug}: $${currentPrice} (from price_usd_5m)`);
              
              // For 24h change calculation, find an entry from ~24 hours ago
              const now = new Date();
              const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              const targetTime = twentyFourHoursAgo.getTime();
              
              // Find the closest price entry to 24 hours ago
              let closestEntry = null;
              let minTimeDiff = Infinity;
              
              for (const entry of priceData) {
                const entryTime = new Date(entry.datetime).getTime();
                const timeDiff = Math.abs(entryTime - targetTime);
                
                if (timeDiff < minTimeDiff) {
                  minTimeDiff = timeDiff;
                  closestEntry = entry;
                }
              }
              
              if (closestEntry) {
                const previousPrice = Number(closestEntry.value) || 0;
                if (previousPrice > 0) {
                  priceChange24h = Number(((currentPrice - previousPrice) / previousPrice * 100).toFixed(2));
                }
                console.log(`24h change for ${subscription.asset_slug}: ${priceChange24h}% (from $${previousPrice})`);
              }
              
              // If we still don't have good 24h data, try simple comparison with second most recent
              if (priceChange24h === 0 && priceData.length > 1) {
                const previousPrice = Number(priceData[1].value) || 0;
                if (previousPrice > 0) {
                  priceChange24h = Number(((currentPrice - previousPrice) / previousPrice * 100).toFixed(2));
                }
                console.log(`24h change for ${subscription.asset_slug}: ${priceChange24h}% (simple comparison)`);
              }
            } else {
              console.log(`No price data found for ${subscription.asset_slug}`);
            }

            return {
              id: subscription.id,
              assetId: subscription.asset_id,
              slug: subscription.asset_slug,
              name: subscription.asset_name,
              symbol: subscription.asset_symbol,
              icon: subscription.asset_icon,
              reportTimes: subscription.report_times,
              reportDays: subscription.report_days,
              lastReportSent: subscription.last_report_sent ? new Date(subscription.last_report_sent) : null,
              currentPrice,
              priceChange24h
            };
          })
        );

        console.log('Final asset subscriptions:', priceChanges);
        setAssetSubscriptions(priceChanges);
      }
    } catch (error) {
      console.error('Error fetching asset subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetSubscriptions();

    // Set up polling every minute
    const pollInterval = setInterval(fetchAssetSubscriptions, 60000);

    // Clean up interval on unmount
    return () => clearInterval(pollInterval);
  }, [user]);

  const saveAssetSubscription = async (asset: CryptoAsset, reportTimes: string[], reportDays: string = 'daily') => {
    if (!user) return null;
    
    try {
      // Ensure the asset has required fields
      if (!asset.id || !asset.name || !asset.symbol) {
        throw new Error('Asset must have id, name, and symbol');
      }

      // Ensure the asset has a slug
      if (!asset.slug) {
        asset.slug = asset.symbol.toLowerCase();
      }

      const result = await saveAssetSubscriptionToDb(user.id, asset, reportTimes, reportDays);
      if (result) {
        // After saving, refresh the list
        await fetchAssetSubscriptions();
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error saving asset subscription:', error);
      throw error;
    }
  };

  const updateAssetSubscription = async (id: string, reportTimes: string[]) => {
    if (!user) return false;
    
    try {
      const success = await updateAssetSubscriptionInDb(user.id, id, reportTimes);
      if (success) {
        // After updating, refresh the list
        await fetchAssetSubscriptions();
      }
      return success;
    } catch (error) {
      console.error('Error updating asset subscription:', error);
      return false;
    }
  };

  const removeAssetSubscription = async (id: string) => {
    if (!user) return false;
    
    try {
      const success = await removeAssetSubscriptionFromDb(user.id, id);
      if (success) {
        // After removing, refresh the list
        await fetchAssetSubscriptions();
      }
      return success;
    } catch (error) {
      console.error('Error removing asset subscription:', error);
      return false;
    }
  };

  return { 
    assetSubscriptions, 
    isLoading,
    fetchAssetSubscriptions,
    saveAssetSubscription,
    updateAssetSubscription,
    removeAssetSubscription
  };
};
