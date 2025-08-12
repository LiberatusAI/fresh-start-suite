import React, { useState, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  isLoading = false,
  placeholder = "Ask about your crypto assets..."
}: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled && !isLoading) {
      onSendMessage(trimmedMessage);
      setMessage(''); // Clear input after sending
    }
  };

  // Handle Enter key behavior - Enter sends, Shift+Enter adds new line
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default Enter behavior (new line)
      handleSend();
    }
  };

  // Validation: can only send if message has content and not disabled/loading
  const canSend = message.trim().length > 0 && !disabled && !isLoading;

  return (
    <div className="border-t border-border bg-card/50 p-4">
      <div className="flex gap-3 items-end">
        {/* Auto-resizing textarea */}
        <div className="flex-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={cn(
              "min-h-[44px] max-h-32 resize-none rounded-xl",
              "border-border bg-background",
              "focus-visible:ring-accent focus-visible:ring-2",
              "disabled:opacity-50"
            )}
            rows={1}
            style={{
              height: 'auto',
              minHeight: '44px'
            }}
            // Auto-resize logic: grows with content up to maxHeight
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto'; // Reset to calculate new height
              target.style.height = Math.min(target.scrollHeight, 128) + 'px'; // Max 128px
            }}
          />
        </div>
        
        {/* Send button with loading state */}
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="default"
          className={cn(
            "rounded-xl px-4 h-11 flex-shrink-0",
            "bg-primary hover:bg-accent/40 text-primary-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Helper text for keyboard shortcuts */}
      <div className="text-xs text-muted-foreground mt-2 px-1">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}