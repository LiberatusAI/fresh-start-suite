
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";

interface NoAssetsSelectedProps {
  fromDashboard: boolean;
}

export function NoAssetsSelected({ fromDashboard }: NoAssetsSelectedProps) {
  const navigate = useNavigate();
  
  return (
    <div className="w-full max-w-4xl mx-auto text-center py-10">
      <h2 className="text-lg font-medium mb-2">Portfolio Selection Required</h2>
      <p className="text-muted-foreground text-sm font-light mb-5">Please select the assets you wish to monitor in your portfolio</p>
      <Button 
        onClick={() => navigate("/assets", { state: { fromDashboard } })}
        variant="gold"
        size="sm"
      >
        Browse Assets
      </Button>
    </div>
  );
}
