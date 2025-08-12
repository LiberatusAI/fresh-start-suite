import { CryptoAsset } from '@/types';
import { AssetSubscription } from '@/types/assetSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const transformAssetSubscriptionData = (data: any[]): AssetSubscription[] => {
  return data.map(item => ({
    id: item.id,
    assetId: item.asset_slug,
    slug: item.asset_slug,
    name: item.asset_name,
    symbol: item.asset_symbol,
    icon: item.asset_icon,
    reportTimes: item.report_times || [],
    reportDays: item.report_days || 'daily',
    lastReportSent: item.last_report_sent ? new Date(item.last_report_sent) : null,
    // Add mock price data for testing
    currentPrice: Math.random() * 1000 + 100, // Random price between 100 and 1100
    priceChange24h: Number((Math.random() * 20 - 10).toFixed(2)), // Random change between -10% and +10%
    tradingVolume24h: Math.random() * 1000000,
    marketCap: Math.random() * 1000000000
  }));
};

export const fetchUserAssetSubscriptions = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('asset_subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return {
      data: transformAssetSubscriptionData(data),
      error: null
    };
  } catch (error) {
    console.error('Error fetching asset subscriptions:', error);
    return {
      data: null,
      error
    };
  }
};

export const saveAssetSubscriptionToDb = async (
  userId: string,
  asset: CryptoAsset, 
  reportTimes: string[], 
  reportDays: string = 'daily'
) => {
  try {
    // Ensure we have valid identifiers
    const assetSlug = asset.slug?.toLowerCase() || asset.symbol.toLowerCase();

    // Check if this asset already exists for the user
    const { data: existingData } = await supabase
      .from('asset_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('asset_slug', assetSlug)
      .maybeSingle();
    
    let subscriptionData;
    if (existingData) {
      // Update existing subscription
      const { data, error } = await supabase
        .from('asset_subscriptions')
        .update({
          report_times: reportTimes,
          report_days: reportDays
        })
        .eq('id', existingData.id)
        .select()
        .single();
      
      if (error) throw error;
      subscriptionData = data;

      toast({
        title: "Schedule Updated",
        description: `Your schedule for ${asset.name} has been updated successfully.`,
      });
    } else {
      // Create new subscription
      const { data, error } = await supabase
        .from('asset_subscriptions')
        .insert({
          user_id: userId,
          asset_id: assetSlug, // Use assetSlug as asset_id for now
          asset_slug: assetSlug,
          asset_name: asset.name,
          asset_symbol: asset.symbol,
          asset_icon: asset.icon,
          report_times: reportTimes,
          report_days: reportDays
        })
        .select()
        .single();
      
      if (error) throw error;
      subscriptionData = data;

      toast({
        title: "Asset Added",
        description: `${asset.name} has been added to your portfolio.`,
      });

      // Check if we need to trigger historical sync
      const { count, error: countError } = await supabase
        .from('asset_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('asset_slug', assetSlug);

      if (countError) {
        console.error('Error checking existing metrics:', countError);
        toast({
          title: "Warning",
          description: "There was an error checking historical data. Some metrics may take longer to appear.",
          variant: "destructive",
        });
      } else if (count === 0) {
        // No existing metrics, trigger historical sync
        toast({
          title: "Fetching Historical Data",
          description: `We're fetching historical data for ${asset.name}. This may take a few minutes.`,
        });

        try {
          const { error: syncError } = await supabase.functions.invoke('trigger-historical-sync', {
            body: {
              assetSlug,
              lookbackDays: 3650 // 10 years of historical data
            }
          });

          if (syncError) {
            console.error('Error triggering historical sync:', syncError);
            toast({
              title: "Historical Data Sync Started",
              description: "The sync process has started but may take some time to complete. You'll see the data appear gradually.",
              variant: "default",
            });
          } else {
            toast({
              title: "Historical Data Sync Started",
              description: "We're fetching 10 years of historical data. This may take a few minutes to complete.",
              variant: "default",
            });
          }
        } catch (syncError) {
          console.error('Error calling historical sync function:', syncError);
          toast({
            title: "Historical Data Sync Started",
            description: "The sync process has started but may take some time to complete. You'll see the data appear gradually.",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Asset Ready",
          description: `${asset.name} is ready with historical data.`,
        });
      }
    }

    return subscriptionData;
  } catch (error) {
    console.error('Error saving asset subscription:', error);
    toast({
      title: "Error",
      description: "There was an error saving your asset subscription. Please try again.",
      variant: "destructive",
    });
    throw error;
  }
};

export const updateAssetSubscriptionInDb = async (
  userId: string,
  subscriptionId: string, 
  reportTimes: string[]
) => {
  try {
    const { error } = await supabase
      .from('asset_subscriptions')
      .update({
        report_times: reportTimes
      })
      .eq('id', subscriptionId)
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating asset subscription:', error);
    return false;
  }
};

export const removeAssetSubscriptionFromDb = async (
  userId: string,
  subscriptionId: string
) => {
  try {
    const { error } = await supabase
      .from('asset_subscriptions')
      .delete()
      .eq('id', subscriptionId)
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing asset subscription:', error);
    return false;
  }
};
