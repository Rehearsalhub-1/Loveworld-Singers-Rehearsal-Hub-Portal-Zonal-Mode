"use client";

import { useEffect } from 'react';
import { initializeVersionCheck, versionManager } from '@/utils/versionManager';

export default function VersionChecker() {
  useEffect(() => {
    // DISABLED: Temporarily disabled to debug reload loop issue
    return;

    /* ORIGINAL CODE - DISABLED
    // Initialize version check on app start
    const checkVersion = async () => {
      try {
        await initializeVersionCheck();
      } catch (error) {
 console.error('Version check failed:', error);
      }
    };

    checkVersion();

    // Check for updates every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => clearInterval(interval);
    */
  }, []);

  // This component doesn't render anything
  return null;
}
