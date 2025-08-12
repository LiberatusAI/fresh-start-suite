import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubscriptionTierDetails } from '@/types';

interface PlanChangeDetailsProps {
  newTierDetails: SubscriptionTierDetails;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PlanChangeDetails({ 
  newTierDetails, 
  isProcessing, 
  onCancel, 
  onConfirm 
}: PlanChangeDetailsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };
  
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>New Subscription</CardTitle>
        <CardDescription>
          You are about to change your subscription to:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">            
        <div className="flex justify-between items-center pb-4 border-b">
          <div>
            <p className="font-medium">
              {newTierDetails.name.charAt(0).toUpperCase() + newTierDetails.name.slice(1)} Plan
            </p>
            <p className="text-sm text-muted-foreground">
              {newTierDetails.name === 'institutional' ? 'All assets' : `${newTierDetails.maxAssets} assets`}, 
              {newTierDetails.maxReportsPerDay} reports/day
            </p>
          </div>
          <p className="font-medium">{formatPrice(newTierDetails.price)}/month</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="border-gold/20 text-charcoal hover:bg-gold/5"
        >
          Cancel
        </Button>
        <Button 
          onClick={onConfirm}
          className="bg-gold hover:bg-gold-dark text-white"
          disabled={isProcessing}
        >
          {isProcessing ? 
            "Processing..." : 
            `Confirm Subscription (${formatPrice(newTierDetails.price)}/month)`
          }
        </Button>
      </CardFooter>
    </Card>
  );
}
