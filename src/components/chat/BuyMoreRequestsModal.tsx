import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BuyMoreRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Request packages matching the Edge Function
const REQUEST_PACKAGES = [
  { requests: 50, price: 499, stripePriceId: 'price_1RtGWQJk8bLGmbLe6jjeEuOH' },
  { requests: 100, price: 899, stripePriceId: 'price_1RtGVXJk8bLGmbLeKQsoxxc0' },
  { requests: 250, price: 1999, stripePriceId: 'price_1RtGTOJk8bLGmbLefPzR1Fen' },
];

export function BuyMoreRequestsModal({ isOpen, onClose }: BuyMoreRequestsModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<typeof REQUEST_PACKAGES[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);


  if (!isOpen) return null;

  const handlePurchase = async () => {
    console.log('handlePurchase called, selectedPackage:', selectedPackage);
    if (!selectedPackage) return;

    setIsLoading(true);
    try {
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Got session:', !!session);
      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to purchase requests',
          variant: 'destructive'
        });
        return;
      }

      // Call our Edge Function to create checkout session
      console.log('Calling edge function with packageId:', selectedPackage.stripePriceId);
      const { data, error } = await supabase.functions.invoke('create-request-purchase', {
        body: { packageId: selectedPackage.stripePriceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) throw error;

      if (data?.sessionUrl) {
        console.log('Redirecting to:', data.sessionUrl);
        // Redirect to Stripe checkout
        window.location.href = data.sessionUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase Failed',
        description: 'Failed to start purchase. Please try again.',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Buy More Requests</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Select a package to continue using FutureCast AI Assistant
          </p>

          {/* Package Options */}
          <div className="space-y-3 mb-6">{REQUEST_PACKAGES.length === 0 && <p>No packages available</p>}
            {REQUEST_PACKAGES.map((pkg) => {
              return (
                <label
                key={pkg.stripePriceId}
                className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedPackage?.stripePriceId === pkg.stripePriceId
                    ? 'border-amber-500 bg-amber-50 shadow-md'
                    : 'border-gray-300 bg-gray-50 hover:border-amber-400 hover:bg-white hover:shadow-sm'
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  checked={selectedPackage?.stripePriceId === pkg.stripePriceId}
                  onChange={() => setSelectedPackage(pkg)}
                />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg text-gray-800">{pkg.requests} requests</span>
                    {selectedPackage?.stripePriceId === pkg.stripePriceId && (
                      <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded">Selected</span>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-amber-600">
                    ${(pkg.price / 100).toFixed(2)}
                  </span>
                </div>
              </label>
              );
            })}
          </div>

          {/* Purchase Button */}
          <button
            onClick={handlePurchase}
            disabled={!selectedPackage || isLoading}
            className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all transform ${
              !selectedPackage || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </span>
            ) : selectedPackage ? (
              `Continue to Payment - $${(selectedPackage.price / 100).toFixed(2)}`
            ) : (
              'Select a Package'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}