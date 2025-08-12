import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from 'lucide-react';
import { SubscriptionTier, SUBSCRIPTION_TIERS } from '@/types';

interface PlanSelectionCardsProps {
  selectedPlan?: SubscriptionTier;
  onPlanSelect: (plan: SubscriptionTier) => void;
  recommendedTier?: SubscriptionTier;
  assetCount?: number;
}

export function PlanSelectionCards({ 
  selectedPlan, 
  onPlanSelect, 
  recommendedTier,
  assetCount = 0 
}: PlanSelectionCardsProps) {
  
  const plans = [
    {
      tier: 'trial' as SubscriptionTier,
      name: 'Free Trial',
      price: 0,
      color: 'bg-green-500',
      features: [
        'Track 1 asset',
        'Receive 1 report per day',
        'No credit card required',
        '7 days free access'
      ],
      buttonText: 'Start Free Trial',
      buttonClass: 'bg-green-500 hover:bg-green-600'
    },
    {
      tier: 'basic' as SubscriptionTier,
      name: 'Basic',
      price: SUBSCRIPTION_TIERS.basic.price,
      color: 'bg-blue-500',
      features: [
        'Track up to 5 assets',
        'Receive 1 report per day',
        `Additional assets at $${SUBSCRIPTION_TIERS.basic.additionalAssetPrice} each`,
        'Choose your preferred report time'
      ],
      buttonText: 'Select Basic',
      buttonClass: 'bg-blue-500 hover:bg-blue-600',
      recommended: assetCount > 1 && assetCount <= 5
    },
    {
      tier: 'pro' as SubscriptionTier,
      name: 'Pro',
      price: SUBSCRIPTION_TIERS.pro.price,
      color: 'bg-gold',
      isPopular: true,
      features: [
        'Track up to 20 assets',
        'Receive 3 reports per day',
        `Additional assets at $${SUBSCRIPTION_TIERS.pro.additionalAssetPrice} each`,
        'Advanced analytics & insights',
        'Priority support'
      ],
      buttonText: 'Select Pro',
      buttonClass: 'bg-gold hover:bg-gold-dark',
      recommended: assetCount > 5 && assetCount <= 20
    },
    {
      tier: 'elite' as SubscriptionTier,
      name: 'Elite',
      price: SUBSCRIPTION_TIERS.elite.price,
      color: 'bg-purple-600',
      features: [
        'Unlimited assets',
        '24 hourly reports',
        `Additional reports at $${SUBSCRIPTION_TIERS.elite.additionalReportPrice} each`,
        'API access',
        'Dedicated account manager'
      ],
      buttonText: 'Select Elite',
      buttonClass: 'bg-purple-600 hover:bg-purple-700',
      recommended: assetCount > 20
    }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {plans.map((plan) => {
          const isRecommended = plan.tier === recommendedTier || plan.recommended;
          const isSelected = selectedPlan === plan.tier;
          
          return (
            <Card 
              key={plan.name}
              className={`relative overflow-hidden border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl ${
                isRecommended ? 'lg:transform lg:scale-105 ring-2 ring-gold' : ''
              } ${isSelected ? 'ring-2 ring-gold shadow-lg' : ''}`}
            >
              {/* Colored top bar */}
              <div className={`absolute top-0 left-0 w-full h-2 ${plan.color}`}></div>
              
              {/* Popular badge */}
              {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-gold text-white px-3 py-1 text-xs sm:text-sm font-semibold">
                  POPULAR
                </div>
              )}
              
              {/* Recommended badge */}
              {isRecommended && !plan.isPopular && (
                <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-xs sm:text-sm font-semibold">
                  RECOMMENDED
                </div>
              )}
              
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-4 left-4">
                  <div className="bg-gold text-white rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              )}
              
              <div className="p-6 space-y-6">
                {/* Plan name and price */}
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground ml-1">/ month</span>
                    )}
                  </div>
                </div>
                
                {/* Features list */}
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="text-green-500 mr-3 mt-0.5 flex-shrink-0 h-5 w-5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Action button */}
                <Button 
                  onClick={() => onPlanSelect(plan.tier)}
                  className={`w-full text-white ${plan.buttonClass} py-3`}
                  variant="default"
                >
                  {plan.buttonText}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      
      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>All plans include email delivery and mobile access.</p>
      </div>
    </div>
  );
}