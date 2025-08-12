import React from 'react';
import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: Date;
}

export function ChatMessage({ message, isUser, timestamp }: ChatMessageProps) {
  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      {/* AI Avatar - Left side */}
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-accent-foreground" />
          </div>
        </div>
      )}
      
      {/* Message Bubble */}
      <div className={cn(
        "max-w-[80%] px-4 py-3 rounded-2xl text-sm",
        "break-words whitespace-pre-wrap",
        isUser 
          ? "bg-primary text-primary-foreground rounded-br-md" // User bubble - right aligned, gold theme
          : "bg-card border border-border text-card-foreground rounded-bl-md" // AI bubble - left aligned, card theme
      )}>
        <p className="leading-relaxed">{message}</p>
        {timestamp && (
          <div className={cn(
            "text-xs mt-2 opacity-70",
            isUser ? "text-right" : "text-left"
          )}>
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* User Avatar - Right side */}
      {isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        </div>
      )}
    </div>
  );
}