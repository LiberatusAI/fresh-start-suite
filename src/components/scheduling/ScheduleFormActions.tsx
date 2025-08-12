
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";

interface ScheduleFormActionsProps {
  isLoading: boolean;
  fromDashboard: boolean;
  onSubmit: () => void;
}

export function ScheduleFormActions({
  isLoading,
  fromDashboard,
  onSubmit
}: ScheduleFormActionsProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <Button 
        variant="outline" 
        onClick={() => navigate("/assets", { state: { fromDashboard }})}
        className="border-gold/20 text-charcoal dark:text-white dark:border-gold/30 hover:bg-gold/5 dark:hover:bg-gold/10"
      >
        Back
      </Button>
      
      <Button 
        onClick={onSubmit}
        className="bg-gold hover:bg-gold-dark text-white"
        disabled={isLoading}
      >
        {isLoading ? "Saving..." : "Complete Setup"}
      </Button>
    </div>
  );
}
