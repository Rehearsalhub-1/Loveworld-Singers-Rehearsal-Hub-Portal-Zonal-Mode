import { useEffect, useCallback, useRef } from 'react'

import { performanceMonitoring, bundleOptimization } from '@/utils/performance'

export const usePerformance = () => {
  const startTimeRef = useRef<number>(0)

  const startMeasurement = useCallback((name: string) => {
    startTimeRef.current = performance.now()
  }, [])

  const endMeasurement = useCallback((name: string) => {
    if (startTimeRef.current > 0) {
      const duration = performanceMonitoring.measureCustomMetric(name, startTimeRef.current)
      startTimeRef.current = 0
      return duration
    }
    return 0
  }, [])

  const preloadCriticalResources = useCallback(() => {
    bundleOptimization.preloadCriticalResources()
  }, [])

  const prefetchResources = useCallback((resources: string[]) => {
    bundleOptimization.prefetchNextResources(resources)
  }, [])

  const optimizeImages = useCallback(() => {
    const images = document.querySelectorAll('img')
    images.forEach(img => {
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy')
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async')
    })
  }, [])

  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }, [])

  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }, [])

  useEffect(() => {
    preloadCriticalResources()
    optimizeImages()
    prefetchResources(['/pages/rehearsals', '/pages/profile', '/pages/praise-night'])

    if (process.env.NODE_ENV === 'production') {
      performanceMonitoring.measureWebVitals()
    }
  }, [preloadCriticalResources, optimizeImages, prefetchResources])

  return {
    startMeasurement,
    endMeasurement,
    preloadCriticalResources,
    prefetchResources,
    optimizeImages,
    debounce,
    throttle
  }
}
