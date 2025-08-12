import React, { useState, useRef, useEffect } from 'react';
import { X, MessageCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { BuyMoreRequestsModal } from './BuyMoreRequestsModal';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => Promise<string>;
  requestsUsedThisMonth?: number;
  requestsRemaining?: number;
  monthlyLimit?: number;
  nextResetDate?: string;
  isLoading?: boolean;
}

export function ChatModal({ 
  isOpen, 
  onClose, 
  onSendMessage,
  requestsUsedThisMonth = 0,
  requestsRemaining = 90,
  monthlyLimit = 90,
  nextResetDate,
  isLoading = false
}: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBuyMoreModal, setShowBuyMoreModal] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async (messageContent: string) => {
    if (isProcessing || requestsRemaining <= 0) return;

    // Add user message immediately for responsive UI
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: messageContent,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Call the API
      const aiResponse = await onSendMessage(messageContent);
      
      // Add AI response
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        content: aiResponse,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      // Add error message to chat
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle modal close with unsaved message warning
  const handleClose = () => {
    // For now, simply close - could add confirmation if user has typed message
    onClose();
  };

  // Welcome message when no conversation exists
  const showWelcome = messages.length === 0;

  // Render floating window instead of modal when open
  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed z-50",
      // Mobile: full width at bottom
      "bottom-6 left-4 right-4 h-[400px]",
      // Desktop: floating window above the chat button
      "sm:bottom-32 sm:right-[640px] sm:left-auto sm:w-96 sm:h-[500px]",
      "bg-card border border-border rounded-2xl shadow-2xl",
      "flex flex-col overflow-hidden",
      "animate-slide-up" // Smooth entrance animation
    )}>
      {/* Header with title and credit counter */}
      <div className="relative p-4 border-b border-border bg-card/50">
        {/* Close button - absolutely positioned */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute right-4 top-4 h-8 w-8 rounded-lg hover:bg-accent/20"
        >
          <X className="h-4 w-4" />
        </Button>
        
        {/* Centered content */}
        <div className="flex flex-col items-center gap-2">
          {/* Title row */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <span className="font-black text-lg tracking-tight text-foreground">
              FUTURECAST<span className="text-accent font-black">AI</span> CHAT
            </span>
          </div>
          
          {/* Request info row */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span>{requestsRemaining} remaining this month</span>
            {nextResetDate && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span>
                  Resets on {new Date(nextResetDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 p-4"
        >
            {showWelcome ? (
              // Welcome message when conversation is empty
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="p-4 rounded-2xl bg-accent/10 mb-4">
                  <MessageCircle className="h-8 w-8 text-accent-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Ask about your crypto assets</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Get personalized insights about your tracked cryptocurrencies, including prices, trends, and market analysis.
                </p>
              </div>
            ) : (
              // Conversation messages
              <div className="space-y-1">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message.content}
                    isUser={message.isUser}
                    timestamp={message.timestamp}
                  />
                ))}
                
                {/* Loading skeleton when AI is thinking */}
                {isProcessing && (
                  <div className="flex gap-3 mb-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-accent-foreground animate-pulse" />
                      </div>
                    </div>
                    <div className="max-w-[80%] p-4 rounded-2xl rounded-bl-md bg-card border border-border">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Invisible div to scroll to */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Buy More Prompt when out of requests */}
          {requestsRemaining <= 0 && (
            <div className="mx-4 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 font-medium text-sm">You're out of requests!</p>
              <p className="text-amber-700 text-xs mt-1 mb-3">
                Purchase more to continue chatting with FutureCast AI
              </p>
              <Button
                onClick={() => setShowBuyMoreModal(true)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
                size="sm"
              >
                Buy More Requests
              </Button>
            </div>
          )}

          {/* Input Area */}
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={requestsRemaining <= 0 || isProcessing}
            isLoading={isProcessing}
            placeholder={
              requestsRemaining <= 0 
                ? `Limit reached - resets on ${nextResetDate ? new Date(nextResetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'next reset'}`
                : "Ask about your crypto assets..."
            }
          />
      </div>

      {/* Buy More Requests Modal */}
      <BuyMoreRequestsModal 
        isOpen={showBuyMoreModal}
        onClose={() => setShowBuyMoreModal(false)}
      />
    </div>
  );
}