import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanChange } from './usePlanChange';
import { PlanChangeDetails } from './PlanChangeDetails';
import { PlanChangeDisclaimer } from './PlanChangeDisclaimer';

export function PlanChangePage() {
  const navigate = useNavigate();
  const { isProcessing, newTierDetails, handleConfirm } = usePlanChange();
  
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Confirm Your New Subscription
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Review your new plan details and confirm
        </p>
      </div>
      
      {newTierDetails ? (
        <PlanChangeDetails 
          newTierDetails={newTierDetails}
          isProcessing={isProcessing}
          onCancel={() => navigate('/settings')}
          onConfirm={handleConfirm}
        />
      ) : (
        <div className="text-center p-6 sm:p-8">
          <p className="text-sm sm:text-base">Loading plan details...</p>
        </div>
      )}
      
      <PlanChangeDisclaimer />
    </div>
  );
}
