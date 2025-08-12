
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { SubscriptionTier, SubscriptionTierDetails } from '@/types';

export function useSubscription(
  userId: string,
  currentTier: SubscriptionTier,
  tierId: string | null | undefined,
  onSubscriptionUpdated?: () => void
) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(currentTier);
  const [allTiers, setAllTiers] = useState<SubscriptionTierDetails[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(tierId || null);

  // Fetch all tiers on component mount
  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const { data, error } = await supabase
          .from('tiers')
          .select('*')
          .order('price', { ascending: true });
        
        if (error) throw error;
        
        if (data) {
          const formattedTiers = data.map(tier => ({
            id: tier.id,
            name: tier.name as SubscriptionTier,
            price: tier.price,
            maxAssets: tier.max_assets,
            maxReportsPerDay: tier.max_reports_per_day,
            additionalAssetPrice: tier.additional_asset_price,
            additionalReportPrice: tier.additional_report_price
          }));
          
          setAllTiers(formattedTiers);
        }
      } catch (error) {
        console.error('Error fetching tiers:', error);
      }
    };
    
    fetchTiers();
  }, []);

  const handleChangePlan = async () => {
    if (!userId || selectedTier === currentTier) {
      setIsDialogOpen(false);
      return;
    }

    setLoading(true);
    try {
      // Find the selected tier ID from allTiers
      const tierToUse = allTiers.find(tier => tier.name === selectedTier);
      if (!tierToUse) {
        throw new Error("Selected tier not found");
      }
      
      // Instead of updating the subscription directly, redirect to payment page
      setIsDialogOpen(false);
      
      // Navigate to the plan change page with just the new tier ID
      navigate(`/plan-change?newTierId=${tierToUse.id}`);
      
    } catch (error) {
      console.error('Error preparing subscription change:', error);
      toast({
        title: "Failed to prepare subscription change",
        description: "Please try again later.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return {
    loading,
    isDialogOpen,
    setIsDialogOpen,
    selectedTier,
    setSelectedTier,
    allTiers,
    selectedTierId,
    handleChangePlan
  };
}
