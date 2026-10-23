// Performance optimization utilities

// Dynamic imports
export const dynamicImport = {
  MediaManager: () => import('@/components/MediaManager'),
  // AdminPanel: () => import('@/components/AdminPanel'), // Component doesn't exist
  SongDetailModal: () => import('@/components/SongDetailModal'),
  
  AdminPage: () => import('@/app/admin/page'),
  CalendarPage: () => import('@/app/pages/calendar/page'),
};

// Image optimization
export const imageOptimization = {
  // Cloudinary helpers
  getOptimizedImageUrl: (url: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
  } = {}) => {
    if (!url.includes('cloudinary.com')) return url;
    
    const { width, height, quality = 75, format = 'webp' } = options;
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const versionIndex = pathParts.findIndex(part => part.startsWith('v'));
    
    if (versionIndex !== -1) {
      const transformations = [];
      if (format) transformations.push(`f_${format}`);
      if (quality) transformations.push(`q_${quality}`);
      if (width) transformations.push(`w_${width}`);
      if (height) transformations.push(`h_${height}`);
      transformations.push('c_fill,g_auto');
      
      pathParts.splice(versionIndex + 1, 0, transformations.join(','));
      urlObj.pathname = pathParts.join('/');
    }
    
    return urlObj.toString();
  },

  // Responsive sizing
  getResponsiveSizes: (breakpoints: number[] = [640, 768, 1024, 1280]) => {
    return breakpoints.map(bp => `(max-width: ${bp}px) ${bp}px`).join(', ') + ', 100vw';
  }
};

// Bundle optimization
export const bundleOptimization = {
  // Preloading
  preloadCriticalResources: () => {
    if (typeof window === 'undefined') return;
    
    const criticalResources = [
      '/logo.png',
      '/lmm.png',
      // Add other critical images
    ];
    
    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = resource;
      document.head.appendChild(link);
    });
  },

  // Prefetching
  prefetchNextResources: (resources: string[]) => {
    if (typeof window === 'undefined') return;
    
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  }
};

// Caching
export const caching = {
  // Cache strategies
  cacheStrategies: {
    // Cache first
    cacheFirst: (request: Request) => {
      return caches.match(request).then(response => {
        return response || fetch(request).then(fetchResponse => {
          const responseClone = fetchResponse.clone();
          caches.open('static-cache').then(cache => {
            cache.put(request, responseClone);
          });
          return fetchResponse;
        });
      });
    },

    // Network first
    networkFirst: (request: Request) => {
      return fetch(request).then(response => {
        const responseClone = response.clone();
        caches.open('api-cache').then(cache => {
          cache.put(request, responseClone);
        });
        return response;
      }).catch(() => {
        return caches.match(request);
      });
    },

    // Revalidation
    staleWhileRevalidate: (request: Request) => {
      return caches.match(request).then(response => {
        const fetchPromise = fetch(request).then(fetchResponse => {
          const responseClone = fetchResponse.clone();
          caches.open('dynamic-cache').then(cache => {
            cache.put(request, responseClone);
          });
          return fetchResponse;
        });
        return response || fetchPromise;
      });
    }
  }
};

// Monitoring
export const performanceMonitoring = {
  // Web vitals
  measureWebVitals: () => {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });
    }).observe({ entryTypes: ['layout-shift'] });
  },

  // Custom metrics
  measureCustomMetric: (name: string, startTime: number) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    return duration;
  }
};

// Memory management
export const memoryOptimization = {
  // Cleanup
  cleanup: () => {
    if (typeof window === 'undefined') return;
    
        caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        if (cacheName.includes('old-')) {
          caches.delete(cacheName);
        }
      });
    });
  },

  // Image optimization
  optimizeImages: () => {
    if (typeof window === 'undefined') return;
    
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // Remove images that are far from viewport
      const rect = img.getBoundingClientRect();
      if (rect.top > window.innerHeight * 2) {
        img.style.display = 'none';
      }
    });
  }
};
