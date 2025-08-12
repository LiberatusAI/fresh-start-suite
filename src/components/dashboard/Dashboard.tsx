import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardHeader } from './DashboardHeader';
import { AssetGrid } from './asset-display/AssetGrid';
import { DashboardLoading } from './asset-display/DashboardLoading';
import { EmptyStateFreeTier } from './EmptyStateFreeTier';
import { useDashboardState } from './hooks/useDashboardState';
import { useAuth } from '@/context/AuthContext';
import { triggerWelcomeReport } from '@/utils/welcomeReport';
import { FloatingChatButton } from '../chat/FloatingChatButton';
import { useWelcomeReportStatus } from '@/hooks/useWelcomeReportStatus';
import { ChatModal } from '../chat/ChatModal';
import { sendChatMessage, getChatUsageStats } from '@/services/chatService';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function Dashboard() {
  const location = useLocation();
  const { user } = useAuth();
  
  // Chat state management - Dashboard owns the chat modal state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userTier, setUserTier] = useState<string | null>(null);
  const [isLoadingTier, setIsLoadingTier] = useState(true);
  
  // Chat usage tracking state
  const [chatUsage, setChatUsage] = useState({
    requestsUsedThisMonth: 0,
    requestsRemaining: 0, // Will be loaded from database
    monthlyLimit: 0,
    monthlyRemaining: 0,
    purchasedRequests: 0,
    nextResetDate: undefined as string | undefined
  });

  // Fetch user tier
  useEffect(() => {
    const fetchUserTier = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_tier_id, tiers!inner(name)')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        setUserTier(data?.tiers?.name || null);
      } catch (error) {
        console.error('Error fetching user tier:', error);
        setUserTier(null);
      } finally {
        setIsLoadingTier(false);
      }
    };
    
    fetchUserTier();
  }, [user]);

  // Fetch current usage statistics on component mount
  useEffect(() => {
    const fetchUsageStats = async () => {
      if (!user) return;
      
      try {
        console.log('🔄 Loading chat usage stats for user...');
        const stats = await getChatUsageStats();
        
        setChatUsage({
          requestsUsedThisMonth: stats.used,
          requestsRemaining: stats.remaining,
          monthlyLimit: stats.limit || 90,
          monthlyRemaining: stats.monthlyRemaining || stats.remaining,
          purchasedRequests: stats.purchasedRequests || 0,
          nextResetDate: stats.nextResetDate
        });
        
        console.log('✅ Chat usage stats loaded:', stats);
      } catch (error) {
        console.error('❌ Failed to load usage stats:', error);
        // Fallback to safe defaults if fetch fails
        setChatUsage({
          requestsUsedThisMonth: 0,
          requestsRemaining: 90,
          monthlyLimit: 90,
          monthlyRemaining: 90,
          purchasedRequests: 0,
          nextResetDate: undefined
        });
      }
    };

    fetchUsageStats();
  }, [user]); // Re-fetch when user changes
  
  const {
    assetSubscriptions,
    isLoadingAssets,
    isLoadingSubscription,
    aggregateScores,
    isLoadingScores,
    scoresError,
    getScoreForAsset,
    refetchScores,
    editingAssetId,
    editingTimes,
    isUpdating,
    handleAddAsset,
    handleEditSchedule,
    handleCancelEdit,
    handleSaveSchedule,
    handleRemoveAsset,
    handleAddTime,
    handleRemoveTime,
    handleTimeChange,
    canAddMoreTimes
  } = useDashboardState();

  // Trigger welcome report for users who haven't received it yet
  const [welcomeReportTriggered, setWelcomeReportTriggered] = useState(false);
  const { welcomeReportSent, isLoading: isLoadingWelcomeStatus } = useWelcomeReportStatus();
  
  // Hide Tidio chat on dashboard
  useEffect(() => {
    // Hide Tidio chat when dashboard mounts
    const tidioChat = (window as any).tidioChatApi;
    if (tidioChat) {
      tidioChat.hide();
    }
    
    // Show Tidio chat when dashboard unmounts
    return () => {
      if (tidioChat) {
        tidioChat.show();
      }
    };
  }, []);
  
  // Trigger welcome report for users who haven't received it yet
  useEffect(() => {
    // Check if we should trigger welcome report
    const shouldTriggerWelcomeReport = 
      user && 
      assetSubscriptions.length > 0 && 
      !welcomeReportTriggered && 
      !isLoadingWelcomeStatus &&
      welcomeReportSent === false && // Only trigger if not sent
      userTier && userTier !== 'free'; // Only for paid/trial tiers
    
    if (shouldTriggerWelcomeReport) {
      console.log('User eligible for welcome report, triggering...');
      setWelcomeReportTriggered(true); // Set flag immediately to prevent multiple triggers
      
      // Add a delay to ensure database transactions are committed
      const timeoutId = setTimeout(() => {
        console.log('Triggering welcome report for user:', user.id, 'tier:', userTier);
        triggerWelcomeReport(user.id);
      }, 3000); // 3 second delay to ensure everything is ready
      
      // Cleanup timeout if component unmounts
      return () => clearTimeout(timeoutId);
    }
  }, [user, assetSubscriptions.length, welcomeReportTriggered, isLoadingWelcomeStatus, welcomeReportSent, userTier]);

  if (isLoadingAssets || isLoadingSubscription || isLoadingTier) {
    return <DashboardLoading />;
  }
  
  // Show empty state for free tier users
  if (userTier === 'free' || !userTier) {
    return (
      <div className="w-full">
        <DashboardHeader onAddAsset={() => {}} />
        <EmptyStateFreeTier />
      </div>
    );
  }

  // Real API chat handler using our Edge Function
  const handleChatMessage = async (message: string): Promise<string> => {
    try {
      console.log('🔄 Processing chat message through API service...');
      
      // Call the real API service
      const response = await sendChatMessage(message);
      
      // Update usage statistics from API response
      setChatUsage({
        requestsUsedThisMonth: response.requestsUsedThisMonth,
        requestsRemaining: response.requestsRemaining,
        monthlyLimit: response.monthlyLimit,
        monthlyRemaining: response.monthlyRemaining,
        purchasedRequests: response.purchasedRequests,
        nextResetDate: response.nextResetDate
      });
      
      console.log('✅ Chat response received from AI');
      return response.response;
      
    } catch (error) {
      console.error('❌ Chat error:', error);
      
      // Show user-friendly error toast
      toast({
        title: "Chat Error",
        description: error instanceof Error ? error.message : "Failed to get AI response",
        variant: "destructive",
      });
      
      // Return error message for the chat interface
      throw error;
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
        <div className="w-full space-y-6">
          <DashboardHeader onAddAsset={handleAddAsset} />
          
          <AssetGrid
            assetSubscriptions={assetSubscriptions}
            editingAssetId={editingAssetId}
            editingTimes={editingTimes}
            isUpdating={isUpdating}
            onAddAsset={handleAddAsset}
            onEditSchedule={handleEditSchedule}
            onCancelEdit={handleCancelEdit}
            onSaveSchedule={handleSaveSchedule}
            onRemoveAsset={handleRemoveAsset}
            onAddTime={handleAddTime}
            onRemoveTime={handleRemoveTime}
            onTimeChange={handleTimeChange}
            canAddMoreTimes={canAddMoreTimes}
            getScoreForAsset={getScoreForAsset}
            isLoadingScores={isLoadingScores}
          />
        </div>
      </div>

      {/* Chat Components - Fixed positioning, bottom left */}
      <FloatingChatButton 
        onClick={() => setIsChatOpen(true)}
        disabled={!user} // Disable if user not authenticated
      />
      
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onSendMessage={handleChatMessage}
        requestsUsedThisMonth={chatUsage.requestsUsedThisMonth}
        requestsRemaining={chatUsage.requestsRemaining}
        monthlyLimit={chatUsage.monthlyLimit}
        nextResetDate={chatUsage.nextResetDate}
      />
    </div>
  );
}
