
import React from 'react';
import { useSchedulingState } from './hooks/useSchedulingState';
import { SchedulingContent } from './SchedulingContent';

interface ReportSchedulingProps {
  fromDashboard?: boolean;
}

export function ReportScheduling({ fromDashboard = false }: ReportSchedulingProps) {
  const {
    selectedAssets,
    scheduleItems,
    globalReportTime,
    isLoading,
    userTier,
    isLoadingUserData,
    getAssetById,
    handleGlobalTimeChange,
    handleSubmit
  } = useSchedulingState(fromDashboard);

  if (isLoadingUserData) {
    return <div className="w-full max-w-4xl mx-auto text-center py-12">Loading subscription data...</div>;
  }

  return (
    <SchedulingContent
      selectedAssets={selectedAssets}
      scheduleItems={scheduleItems}
      globalReportTime={globalReportTime}
      userTier={userTier}
      isLoading={isLoading}
      fromDashboard={fromDashboard}
      getAssetById={getAssetById}
      onGlobalTimeChange={handleGlobalTimeChange}
      onSubmit={handleSubmit}
    />
  );
}
