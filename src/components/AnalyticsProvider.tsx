'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackFeatureEngagement } from '@/utils/analytics';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  const pathname = usePathname();

  useEffect(() => {
    // Track feature engagement when pathname changes
    trackFeatureEngagement('page_navigation', pathname || '');
  }, [pathname]);

  return <>{children}</>;
};

