import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { PlanCard } from './PlanCard';
import { SUBSCRIPTION_TIERS } from '@/types';

export const PricingPlan = () => {
  return (
    <div className="w-full bg-background py-24">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black mb-3 text-foreground font-sans">Select Your Investment Plan</h2>
          <p className="text-muted-foreground text-lg font-normal max-w-2xl mx-auto">
            Choose the perfect solution for your investment strategy and portfolio requirements
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <PlanCard 
            title="Basic"
            price={SUBSCRIPTION_TIERS.basic.price}
            description="For focused investors"
            features={[
              `Monitor ${SUBSCRIPTION_TIERS.basic.maxAssets} key assets`,
              "Daily insights report",
              `Additional assets: $${SUBSCRIPTION_TIERS.basic.additionalAssetPrice} each`
            ]}
            isPopular={false}
            planKey="basic"
          />
          <PlanCard 
            title="Pro"
            price={SUBSCRIPTION_TIERS.pro.price}
            description="For portfolio builders"
            features={[
              `Track up to ${SUBSCRIPTION_TIERS.pro.maxAssets} diverse assets`,
              `${SUBSCRIPTION_TIERS.pro.maxReportsPerDay} strategic reports daily`,
              `Additional assets: $${SUBSCRIPTION_TIERS.pro.additionalAssetPrice} each`
            ]}
            isPopular={true}
            planKey="pro"
          />
          <PlanCard 
            title="Elite"
            price={SUBSCRIPTION_TIERS.elite.price}
            description="For serious traders"
            features={[
              "Unlimited assets",
              `${SUBSCRIPTION_TIERS.elite.maxReportsPerDay} hourly reports`,
              `Additional reports: $${SUBSCRIPTION_TIERS.elite.additionalReportPrice} each`
            ]}
            isPopular={false}
            planKey="elite"
          />
        </div>
      </div>
    </div>
  );
};
