import React from 'react';
import { Check } from 'lucide-react';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/types';

interface PricingDisplayProps {
  selectedPlan?: SubscriptionTier;
  onPlanSelect?: (plan: SubscriptionTier) => void;
  interactive?: boolean;
}

export function PricingDisplay({ selectedPlan, onPlanSelect, interactive = false }: PricingDisplayProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  const plans = [
    {
      name: 'Free Trial',
      tier: 'trial' as SubscriptionTier,
      price: SUBSCRIPTION_TIERS.trial.price,
      description: 'Try AssetMelody for 7 days',
      features: [
        `${SUBSCRIPTION_TIERS.trial.maxAssets} asset • ${SUBSCRIPTION_TIERS.trial.maxReportsPerDay} report daily • No credit card`
      ],
      color: 'green',
      isPopular: false,
      isTrial: true
    },
    {
      name: 'Basic',
      tier: 'basic' as SubscriptionTier,
      price: SUBSCRIPTION_TIERS.basic.price,
      description: 'Perfect for focused investors',
      features: [
        `${SUBSCRIPTION_TIERS.basic.maxAssets} key assets`,
        `${SUBSCRIPTION_TIERS.basic.maxReportsPerDay} daily report`,
        `Additional: ${formatPrice(SUBSCRIPTION_TIERS.basic.additionalAssetPrice)} each`
      ],
      color: 'blue',
      isPopular: false
    },
    {
      name: 'Pro',
      tier: 'pro' as SubscriptionTier,
      price: SUBSCRIPTION_TIERS.pro.price,
      description: 'For portfolio builders',
      features: [
        `Up to ${SUBSCRIPTION_TIERS.pro.maxAssets} assets`,
        `${SUBSCRIPTION_TIERS.pro.maxReportsPerDay} reports daily`,
        `Additional: ${formatPrice(SUBSCRIPTION_TIERS.pro.additionalAssetPrice)} each`,
        'Advanced analytics'
      ],
      color: 'gold',
      isPopular: true
    },
    {
      name: 'Elite',
      tier: 'elite' as SubscriptionTier,
      price: SUBSCRIPTION_TIERS.elite.price,
      description: 'For serious traders',
      features: [
        `Unlimited assets`,
        `${SUBSCRIPTION_TIERS.elite.maxReportsPerDay} hourly reports`,
        `Additional: ${formatPrice(SUBSCRIPTION_TIERS.elite.additionalReportPrice || 0)} each`,
        'API access'
      ],
      color: 'purple',
      isPopular: false
    }
  ];

  const handlePlanClick = (plan: SubscriptionTier) => {
    if (interactive && onPlanSelect) {
      onPlanSelect(plan);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-foreground">Choose Your Plan</h2>
        <p className="text-muted-foreground text-xs">
          Tailored analytics for your crypto portfolio
        </p>
      </div>

      <div className="space-y-2">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.tier;
          const isClickable = interactive && onPlanSelect;
          
          return (
            <div
              key={plan.name}
              className={`relative rounded-lg border transition-all duration-200 ${
                plan.isTrial ? 'p-2' : 'p-3'
              } ${
                isSelected
                  ? 'border-gold bg-gold/10 ring-2 ring-gold/40 shadow-lg'
                  : plan.isTrial
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-200 dark:ring-green-800'
                    : plan.isPopular 
                      ? 'border-gold bg-gold/5 ring-1 ring-gold/20' 
                      : 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-charcoal-light/30'
              } ${
                isClickable 
                  ? 'cursor-pointer hover:border-gold/40 hover:bg-gold/5 hover:ring-1 hover:ring-gold/20' 
                  : ''
              }`}
              onClick={() => handlePlanClick(plan.tier)}
            >
              {plan.isPopular && (
                <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gold text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                </div>
              )}
              
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5">
                  <div className="bg-gold text-white rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                </div>
              )}
              
              <div className={`text-center ${plan.isTrial ? 'mb-0.5' : 'mb-2'}`}>
                <h3 className={`font-semibold text-foreground ${plan.isTrial ? 'text-sm' : 'text-base'}`}>{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  {plan.isTrial ? (
                    <>
                      <span className="text-sm font-bold text-green-600">Free</span>
                      <span className="text-xs text-muted-foreground">for 7 days</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-bold text-foreground">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-xs text-muted-foreground">/month</span>
                    </>
                  )}
                </div>
                <p className={`text-muted-foreground ${plan.isTrial ? 'text-xs' : 'text-xs'}`}>{plan.description}</p>
              </div>

              <ul className={`${plan.isTrial ? 'space-y-0.5' : 'space-y-1'} flex flex-col items-center`}>
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className={`text-green-500 flex-shrink-0 ${plan.isTrial ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
                    <span className={`text-foreground ${plan.isTrial ? 'text-xs' : 'text-xs'}`}>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <p>All plans include email delivery and mobile access.</p>
      </div>
    </div>
  );
} 