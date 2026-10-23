'use client';

import { useEffect, useRef } from 'react';
import { BackendAPI } from '@/lib/api-client';

/**
 * Hook to track feature engagement when a page/feature is used
 * @param featureName - Name of the feature being tracked
 * @param enabled - Whether tracking is enabled (default: true)
 */
export function useFeatureTracking(featureName: string, enabled: boolean = true) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!enabled || hasTracked.current) return;
    
    const trackFeature = async () => {
      try {
        await BackendAPI.activityLogs.create({
          action: 'feature_engagement',
          feature: featureName,
          timestamp: new Date().toISOString()
        });
        hasTracked.current = true;
      } catch (error) {
        // Non-blocking telemetry
      }
    };

    const timer = setTimeout(trackFeature, 2000);
    return () => clearTimeout(timer);
  }, [featureName, enabled]);
}

/**
 * Track a one-time feature engagement manually
 */
export async function trackFeatureEngagement(featureName: string) {
  try {
    await BackendAPI.activityLogs.create({
      action: 'feature_engagement',
      feature: featureName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Non-blocking telemetry
  }
}
