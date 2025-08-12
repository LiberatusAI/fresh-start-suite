import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubscriptionTier, SubscriptionTierDetails } from '@/types';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionSummaryProps {
  currentSubscription: SubscriptionTier;
  tierId?: string | null;
}

export function SubscriptionSummary({
  currentSubscription,
  tierId
}: SubscriptionSummaryProps) {
  const [tierDetails, setTierDetails] = useState<SubscriptionTierDetails | null>(null);
  
  useEffect(() => {
    const fetchTierDetails = async () => {
      if (!tierId) return;
      
      try {
        const { data, error } = await supabase
          .from('tiers')
          .select('*')
          .eq('id', tierId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setTierDetails({
            id: data.id,
            name: data.name as SubscriptionTier,
            price: data.price,
            maxAssets: data.max_assets,
            maxReportsPerDay: data.max_reports_per_day,
            additionalAssetPrice: data.additional_asset_price,
            additionalReportPrice: data.additional_report_price
          });
        }
      } catch (error) {
        console.error('Error fetching tier details:', error);
      }
    };
    
    fetchTierDetails();
  }, [tierId]);

  const getSubscriptionDetails = (tier: SubscriptionTier) => {
    // If we have tierDetails from the database, use those
    if (tierDetails && tierDetails.name === tier) {
      return {
        name: tierDetails.name === 'trial' ? 'Free Trial' : tierDetails.name.charAt(0).toUpperCase() + tierDetails.name.slice(1),
        price: tierDetails.name === 'trial' ? 'Free for 7 days' : `$${tierDetails.price}/month`,
        assets: tierDetails.name === 'trial' 
          ? `1 asset for 7 days`
          : tierDetails.name === 'elite' 
            ? 'All assets' 
            : `Up to ${tierDetails.maxAssets} asset${tierDetails.maxAssets > 1 ? 's' : ''}`,
        reports: `Up to ${tierDetails.maxReportsPerDay} report${tierDetails.maxReportsPerDay > 1 ? 's' : ''} per day`,
        additionalAssets: tierDetails.name !== 'elite' && tierDetails.name !== 'trial' ? `$${tierDetails.additionalAssetPrice} each` : undefined,
        additionalReports: tierDetails.name === 'elite' && tierDetails.additionalReportPrice 
          ? `$${tierDetails.additionalReportPrice} each` 
          : undefined
      };
    }
    
    // Otherwise fall back to hardcoded values
    switch (tier) {
      case 'trial':
        return {
          name: 'Free Trial',
          price: 'Free for 7 days',
          assets: '1 asset for 7 days',
          reports: '1 report per day',
          additionalAssets: undefined
        };
      case 'basic':
        return {
          name: 'Basic',
          price: '$19.99/month',
          assets: '5 assets included',
          reports: 'Daily reports',
          additionalAssets: '$1.99 each'
        };
      case 'pro':
        return {
          name: 'Pro',
          price: '$49.99/month',
          assets: 'Up to 20 assets',
          reports: 'Up to 3 reports per day',
          additionalAssets: '$1.99 each'
        };
      case 'elite':
        return {
          name: 'Elite',
          price: '$99.99/month',
          assets: 'Unlimited assets',
          reports: 'Up to 24 reports per day',
          additionalReports: '$0.99 each'
        };
      default:
        return {
          name: 'Basic',
          price: '$19.99/month',
          assets: '5 assets included',
          reports: 'Daily reports',
          additionalAssets: '$1.99 each'
        };
    }
  };

  const subscriptionDetails = getSubscriptionDetails(currentSubscription);

  return (
    <Card className="p-4 sm:p-5 border-gold/20 bg-white/70 dark:bg-charcoal-light/80 dark:border-gold/30">
      <div className="space-y-4">
        <h3 className="text-lg sm:text-xl font-semibold dark:text-white">Your Subscription</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base text-muted-foreground dark:text-gray-300">Plan</span>
            <span className="text-sm sm:text-base font-medium dark:text-white">{subscriptionDetails.name}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base text-muted-foreground dark:text-gray-300">Price</span>
            <span className="text-sm sm:text-base font-medium dark:text-white">{subscriptionDetails.price}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base text-muted-foreground dark:text-gray-300">Assets</span>
            <span className="text-sm sm:text-base font-medium dark:text-white text-right">{subscriptionDetails.assets}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base text-muted-foreground dark:text-gray-300">Reports</span>
            <span className="text-sm sm:text-base font-medium dark:text-white text-right">{subscriptionDetails.reports}</span>
          </div>
        </div>
        
        <div className="pt-4 border-t border-gold/10 dark:border-gold/30">
          <Link to="/settings">
            <Button
              variant="outline"
              className="w-full border-gold text-gold hover:bg-gold/5 dark:hover:bg-gold/10 dark:text-gold-light text-sm sm:text-base py-2 sm:py-3"
            >
              Manage Subscription
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
