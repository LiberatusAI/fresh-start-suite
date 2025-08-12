import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { SubscriptionTier, SubscriptionTierDetails } from '@/types';

type TierSelectionDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedTier: SubscriptionTier;
  setSelectedTier: (tier: SubscriptionTier) => void;
  allTiers: SubscriptionTierDetails[];
  loading: boolean;
  onConfirm: () => Promise<void>;
};

export function TierSelectionDialog({
  isOpen,
  setIsOpen,
  selectedTier,
  setSelectedTier,
  allTiers,
  loading,
  onConfirm
}: TierSelectionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Your Subscription</DialogTitle>
          <DialogDescription>
            Select a new subscription tier below.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup 
            value={selectedTier} 
            onValueChange={(value) => setSelectedTier(value as SubscriptionTier)}
            className="space-y-3"
          >
            {allTiers.map(tier => (
              <div key={tier.id} className="flex items-start space-x-3 border p-4 rounded-md hover:bg-accent/5 transition-colors">
                <RadioGroupItem value={tier.name} id={tier.name} className="mt-1" />
                <Label htmlFor={tier.name} className="flex-1 cursor-pointer">
                  <div className="font-semibold text-sm sm:text-base">{tier.name.charAt(0).toUpperCase() + tier.name.slice(1)}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                    <div>${tier.price}/month</div>
                    <div>{tier.name === 'elite' ? 'All assets' : `${tier.maxAssets} asset${tier.maxAssets !== 1 ? 's' : ''}`}</div>
                    <div>{tier.maxReportsPerDay} report{tier.maxReportsPerDay !== 1 ? 's' : ''}/day</div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="w-full sm:w-auto">
            {loading ? "Updating..." : "Confirm Change"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
