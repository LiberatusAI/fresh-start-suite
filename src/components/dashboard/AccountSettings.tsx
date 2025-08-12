import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionTier, SubscriptionTierDetails } from '@/types';
import { ProfileForm } from './ProfileForm';
import { SubscriptionManager } from './SubscriptionManager';
import { LoadingCard } from './LoadingCard';
import { toast } from '@/components/ui/use-toast';
import { convertUTCTimeToLocal } from '@/utils/timezoneUtils';

export function AccountSettings() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ 
    first_name: string, 
    last_name: string, 
    email: string, 
    subscription_tier: SubscriptionTier | null,
    subscription_tier_id: string | null,
    texture_preference: boolean,
    global_report_time: string
  }>({
    first_name: '',
    last_name: '',
    email: '',
    subscription_tier: null,
    subscription_tier_id: null,
    texture_preference: false,
    global_report_time: '09:00'
  });
  const [tierDetails, setTierDetails] = useState<SubscriptionTierDetails | null>(null);

  // Handle URL parameters for subscription update feedback
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const subscriptionUpdated = searchParams.get('subscription_updated');
    const subscriptionCancelled = searchParams.get('subscription_cancelled');

    if (subscriptionUpdated === 'true') {
      toast({
        title: "Subscription Updated",
        description: "Your subscription has been successfully updated!",
      });
      // Clear the URL parameter
      window.history.replaceState({}, '', '/settings');
    } else if (subscriptionCancelled === 'true') {
      toast({
        title: "Subscription Update Cancelled",
        description: "Your subscription update was cancelled. No changes were made.",
        variant: "destructive",
      });
      // Clear the URL parameter
      window.history.replaceState({}, '', '/settings');
    }
  }, [location.search]);

  // Fetch user profile data
  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          tiers:subscription_tier_id (
            id,
            name,
            price,
            max_assets,
            max_reports_per_day,
            additional_asset_price,
            additional_report_price
          )
        `)
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        // Check if user has a subscription tier
        if (!data.subscription_tier_id) {
          // User doesn't have a subscription, redirect to subscription selection
          toast({
            title: "Subscription Required",
            description: "Please select a subscription plan to continue.",
            variant: "destructive",
          });
          navigate('/subscription');
          return;
        }

        const tierName = data.tiers?.name || null;
        setProfile({
          ...data,
          subscription_tier: tierName as SubscriptionTier,
          texture_preference: data.texture_preference ?? false,
          global_report_time: data.global_report_time 
            ? convertUTCTimeToLocal(data.global_report_time) 
            : '09:00'
        });

        if (data.tiers) {
          setTierDetails({
            id: data.tiers.id,
            name: data.tiers.name as SubscriptionTier,
            price: data.tiers.price,
            maxAssets: data.tiers.max_assets,
            maxReportsPerDay: data.tiers.max_reports_per_day,
            additionalAssetPrice: data.tiers.additional_asset_price,
            additionalReportPrice: data.tiers.additional_report_price
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleSubscriptionUpdated = () => {
    // Refetch profile data when subscription is updated
    fetchProfile();
  };

  if (loading || !user) {
    return <LoadingCard />;
  }

  // Don't render settings if user doesn't have a subscription tier
  if (!profile.subscription_tier || !profile.subscription_tier_id) {
    return <LoadingCard />;
  }

  return (
    <div className="space-y-6">
      <ProfileForm 
        userId={user.id} 
        initialData={{
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          texture_preference: profile.texture_preference,
          global_report_time: profile.global_report_time
        }} 
      />
      <SubscriptionManager 
        userId={user.id} 
        currentTier={profile.subscription_tier}
        tierId={profile.subscription_tier_id}
        tierDetails={tierDetails}
        onSubscriptionUpdated={handleSubscriptionUpdated}
      />
    </div>
  );
}
