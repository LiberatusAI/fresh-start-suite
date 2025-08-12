import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { SubscriptionTier } from '@/types';

interface PlanCardProps {
  title: string;
  price: number;
  description: string;
  features: string[];
  isPopular: boolean;
  planKey: SubscriptionTier;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  title,
  price,
  description,
  features,
  isPopular,
  planKey
}) => {
  return (
    <div className={cn(
      "bg-card border border-border rounded-2xl p-8 flex flex-col items-center text-center relative transition-all duration-200",
      isPopular ? "border-accent/60 ring-2 ring-accent/40" : "hover:border-accent/30",
    )}>
      {isPopular && (
        <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3">
          <div className="bg-accent text-background text-xs font-bold px-3 py-1 rounded-full shadow-none uppercase tracking-widest">
            Popular
          </div>
        </div>
      )}
      <div className="text-center mb-6">
        <h3 className="text-xl font-black mb-2 text-foreground font-sans">{title}</h3>
        <div className="text-3xl font-black mb-2 text-foreground">${price}<span className="text-base font-normal text-muted-foreground ml-1">/month</span></div>
        <p className="text-base text-muted-foreground font-normal">{description}</p>
      </div>
      <ul className="space-y-3 mb-8 w-full">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-accent">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span className="text-base text-foreground/90">{feature}</span>
          </li>
        ))}
      </ul>
      <Link to="/signup" className="block w-full">
        <Button 
          variant={isPopular ? "default" : "outline"} 
          size="lg"
          className={cn(
            "w-full text-base font-semibold rounded-xl py-3 px-6",
            isPopular ? "bg-accent text-background hover:bg-accent/80" : "hover:border-accent/40"
          )}
        >
          Select {title}
        </Button>
      </Link>
    </div>
  );
};
