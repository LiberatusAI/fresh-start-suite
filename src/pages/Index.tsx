
import React from 'react';
import { Layout } from "@/components/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { PricingPlan } from "@/components/home/PricingPlan";
import { FeaturesSection } from "@/components/home/FeaturesSection";

const Index = () => {
  return (
    <Layout className="pt-16">
      <div className="flex flex-col items-center">
        <HeroSection />
        <PricingPlan />
        <FeaturesSection />
      </div>
    </Layout>
  );
};

export default Index;
