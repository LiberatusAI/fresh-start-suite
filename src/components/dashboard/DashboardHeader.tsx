
import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface DashboardHeaderProps {
  onAddAsset: () => void;
}

export function DashboardHeader({ onAddAsset }: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold">Your Portfolio</h1>
        <p className="text-muted-foreground">Monitor and analyze your crypto assets</p>
      </div>
      
      <Button onClick={onAddAsset} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Add Asset
      </Button>
    </div>
  );
}
