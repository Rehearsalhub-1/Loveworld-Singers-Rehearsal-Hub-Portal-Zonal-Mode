"use client";

import { useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { versionManager } from '@/utils/versionManager';
import { smartCache } from '@/utils/smartCache';

interface CacheRefreshButtonProps {
  className?: string;
  showInProduction?: boolean;
}

export default function CacheRefreshButton({ 
  className = "", 
  showInProduction = false 
}: CacheRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Only show in development or if explicitly enabled in production
  const shouldShow = process.env.NODE_ENV === 'development' || showInProduction;

  if (!shouldShow) {
    return null;
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      
            smartCache.clearAllCache();
      
      // Force version refresh
      await versionManager.forceRefresh();
      
    } catch (error) {
 console.error(' Cache refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all caches? This will reload the app.')) {
      handleRefresh();
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearCache}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Clear all caches and refresh"
          >
            <Trash2 className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Clearing...' : 'Clear Cache'}
          </button>
          
          <div className="text-xs text-gray-500 px-2">
            v{versionManager.getCurrentVersion().slice(-6)}
          </div>
        </div>
      </div>
    </div>
  );
}
