'use client';

import { useEffect, useState } from 'react';
import { featureUpdateManager } from '@/utils/feature-update-manager';

export default function FeatureUpdateChecker() {
  useEffect(() => {
    // DISABLED: Temporarily disabled to debug reload loop issue
    // The version check (3.1.0) might be conflicting with VersionManager (3.0.0)
    // causing constant cache wipes
    return;

    /* ORIGINAL CODE - DISABLED
    const checkForUpdates = async () => {
      try {
        const hasUpdate = await featureUpdateManager.checkForFeatureUpdates();
        if (hasUpdate) {
        }
      } catch (error) {
 console.error('Feature update check failed:', error);
      }
    };

    // Check immediately
    checkForUpdates();

    // Check every 5 minutes (less frequent to avoid spam)
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    // Check when app becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    */
  }, []);

  // This component doesn't render anything visible
  return null;
}

// Hook to check if a feature is enabled
export function useFeatureFlag(featureId: string): boolean {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const checkFeature = () => {
      const enabled = featureUpdateManager.isFeatureEnabled(featureId);
      setIsEnabled(enabled);
    };

    checkFeature();

    // Re-check when features might be updated
    const interval = setInterval(checkFeature, 30 * 1000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [featureId]);

  return isEnabled;
}

// Hook to get all enabled features
export function useEnabledFeatures(): string[] {
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    const updateFeatures = () => {
      const enabledFeatures = featureUpdateManager.getEnabledFeatures();
      setFeatures(enabledFeatures);
    };

    updateFeatures();

    // Re-check when features might be updated
    const interval = setInterval(updateFeatures, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  return features;
}
