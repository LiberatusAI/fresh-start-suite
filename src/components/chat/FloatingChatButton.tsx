import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingChatButtonProps {
  onClick: () => void;
  hasUnreadMessage?: boolean;
  disabled?: boolean;
}

export function FloatingChatButton({ 
  onClick, 
  hasUnreadMessage = false, 
  disabled = false 
}: FloatingChatButtonProps) {
  const [showCTA, setShowCTA] = useState(false);
  const [ctaDismissed, setCtaDismissed] = useState(false);

  useEffect(() => {
    // Check if CTA was previously dismissed in this session
    const dismissed = sessionStorage.getItem('chatCTADismissed');
    if (!dismissed && !disabled) {
      // Show CTA after a short delay
      const timer = setTimeout(() => {
        setShowCTA(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [disabled]);

  const handleDismissCTA = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCTA(false);
    setCtaDismissed(true);
    sessionStorage.setItem('chatCTADismissed', 'true');
  };

  return (
    <div className="fixed bottom-8 right-[640px] z-50 flex items-end gap-3">
      {/* CTA Message Bubble */}
      {showCTA && !ctaDismissed && (
        <div className="animate-in slide-in-from-right fade-in duration-300">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs relative">
            <button
              onClick={handleDismissCTA}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              aria-label="Dismiss message"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-sm font-medium text-gray-900 pr-6 whitespace-nowrap">
              👋 Want info on the assets you're tracking?
            </p>
            <p className="text-xs text-gray-600 mt-1 text-center">
              I'm here to answer your questions!
            </p>
            {/* Arrow pointing to chat button */}
            <div className="absolute bottom-3 right-[-8px] w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] border-l-white"></div>
          </div>
        </div>
      )}

      {/* Chat Button */}
      <Button
        onClick={onClick}
        disabled={disabled}
        size="lg"
        className={cn(
          "rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
          "bg-primary hover:bg-accent/40 text-primary-foreground",
          "h-14 w-14 p-0",
          hasUnreadMessage && "animate-pulse",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Open AI Chat Assistant"
      >
        <MessageCircle className="h-6 w-6" />
        {hasUnreadMessage && (
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-gold rounded-full animate-pulse" />
        )}
      </Button>
    </div>
  );
}