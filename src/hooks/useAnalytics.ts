import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

import { trackFeatureEngagement } from '@/utils/analytics'

export const useAnalytics = () => {
  const pathname = usePathname()

  useEffect(() => {
    // Track feature engagement when navigating to different pages
    trackFeatureEngagement('page_navigation', pathname || '');
  }, [pathname])

  return {
    trackFeatureEngagement,
    trackEvent: (type: 'signup' | 'login' | 'feature_engagement', featureName?: string, page?: string) => {
      if (type === 'feature_engagement' && featureName) {
        trackFeatureEngagement(featureName, page);
      }
    }
  }
}
