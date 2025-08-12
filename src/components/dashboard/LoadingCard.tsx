import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingCardProps {
  title?: string;
}

export function LoadingCard({ title = "Loading..." }: LoadingCardProps) {
  return (
    <Card className="p-5 border-gold/20 bg-white/70 dark:bg-charcoal-light/70 dark:border-gold/30">
      <CardContent className="pt-5 space-y-4">
        <div className="text-center text-muted-foreground dark:text-gray-400">{title}</div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}
