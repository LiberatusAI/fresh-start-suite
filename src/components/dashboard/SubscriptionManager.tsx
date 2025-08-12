import React from 'react';
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubscriptionTier, SubscriptionTierDetails } from '@/types';
import { SubscriptionDetails } from './subscription/SubscriptionDetails';

type SubscriptionManagerProps = {
  userId: string;
  currentTier: SubscriptionTier;
  tierId?: string | null;
  tierDetails?: SubscriptionTierDetails | null;
  onSubscriptionUpdated?: () => void;
};

export function SubscriptionManager({ 
  userId, 
  currentTier, 
  tierId, 
  tierDetails, 
  onSubscriptionUpdated 
}: SubscriptionManagerProps) {
  const handleOpenCustomerPortal = () => {
    // Open the Stripe billing portal directly in a new tab
    window.open('https://billing.stripe.com/p/login/4gM5kE7Db9k9fStclN7bW00', '_blank');
  };

  return (
    <Card className="p-4 sm:p-5 border-gold/20 bg-white/70 dark:bg-charcoal-light/80 dark:border-gold/30">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-lg sm:text-xl font-semibold dark:text-white">Your Subscription</CardTitle>
      </CardHeader>
      
      <SubscriptionDetails 
        currentTier={currentTier}
        tierDetails={tierDetails}
      />
      
      <CardFooter className="flex justify-center pt-4 border-t border-gold/10 dark:border-gold/30 p-0">
        <Button
          variant="outline"
          className="w-full border-gold text-gold hover:bg-gold/5 dark:hover:bg-gold/10 dark:text-gold-light text-sm sm:text-base py-2 sm:py-3"
          onClick={handleOpenCustomerPortal}
        >
          Manage Subscription
        </Button>
      </CardFooter>
    </Card>
  );
}
