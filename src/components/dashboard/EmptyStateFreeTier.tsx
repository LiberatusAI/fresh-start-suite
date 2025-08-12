import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrendingUp, BarChart3, BellRing } from 'lucide-react';

export function EmptyStateFreeTier() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Empty portfolio illustration */}
      <div className="relative mb-8">
        <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-amber-500" />
        </div>
        <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
          <BellRing className="w-4 h-4 text-blue-500" />
        </div>
      </div>

      {/* Empty state message */}
      <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        No assets tracked
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
        Subscribe to start tracking your favorite crypto assets and receive personalized daily reports
      </p>

      {/* CTA Button */}
      <Button 
        size="lg"
        onClick={() => navigate('/plan-selection')}
        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg"
      >
        Choose a Plan
      </Button>

      {/* Feature highlights */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
        <div className="text-center">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Track Assets</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">Monitor up to 20 cryptocurrencies</p>
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <BellRing className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Daily Reports</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">Get insights delivered to your inbox</p>
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">AI Analysis</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">Powered by advanced AI models</p>
        </div>
      </div>
    </div>
  );
}