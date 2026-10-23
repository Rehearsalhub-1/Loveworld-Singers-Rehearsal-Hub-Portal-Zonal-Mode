"use client";

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { versionManager } from '@/utils/versionManager';

export default function ForceUpdateButton() {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    try {
      await versionManager.forceRefresh();
    } catch (error) {
 console.error(' Force update failed:', error);
      setIsUpdating(false);
    }
  };

  // Only show in development or when there are cache issues
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <button
      onClick={handleForceUpdate}
      disabled={isUpdating}
      className="fixed bottom-4 left-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white p-3 rounded-full shadow-lg transition-colors z-50"
      title="Force Update (Clear All Caches)"
    >
      {isUpdating ? (
        <RefreshCw className="w-5 h-5 animate-spin" />
      ) : (
        <RefreshCw className="w-5 h-5" />
      )}
    </button>
  );
}
