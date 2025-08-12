
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EmptyAssetStateProps {
  onAddAsset: () => void;
}

export function EmptyAssetState({ onAddAsset }: EmptyAssetStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center p-10 border-gold/20 bg-white/90 dark:bg-charcoal-light/60 dark:border-gold/10 shadow-sm hover-lift transition-all">
      <div className="w-16 h-16 mb-6 rounded-full bg-gold/10 flex items-center justify-center">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-8 w-8 text-gold shimmer" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
          />
        </svg>
      </div>
      
      <h3 className="text-xl font-medium mb-2">Begin Your Portfolio</h3>
      <p className="text-muted-foreground text-center mb-6">
        Add assets to your watchlist to receive personalized market insights
      </p>
      <Button 
        onClick={onAddAsset}
        variant="gold"
        className="animate-fade-in"
      >
        Add First Asset
      </Button>
    </Card>
  );
}
