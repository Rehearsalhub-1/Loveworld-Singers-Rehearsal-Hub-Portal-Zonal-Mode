'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { sanitizeImageUrl } from '@/utils/image-utils';

interface UltraFastImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  onError?: (e: any) => void;
  onLoad?: () => void;
}

export default function UltraFastImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 60, // Lower quality for speed
  onError,
  onLoad,
  ...props
}: UltraFastImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Ultra-optimized Cloudinary URL
  const getUltraOptimizedSrc = (originalSrc: string) => {
    if (originalSrc.includes('cloudinary.com')) {
      const url = new URL(originalSrc);
      const pathParts = url.pathname.split('/');
      const versionIndex = pathParts.findIndex(part => part.startsWith('v'));
      
      if (versionIndex !== -1) {
        // Ultra aggressive optimization
        const transformations = [
          'f_webp',           // WebP format
          'q_auto:low',       // Auto quality, low
          'w_auto',           // Auto width
          'h_auto',           // Auto height
          'c_fill,g_auto',    // Fill crop with auto gravity
          'dpr_auto'          // Auto device pixel ratio
        ];
        
        pathParts.splice(versionIndex + 1, 0, transformations.join(','));
        url.pathname = pathParts.join('/');
        return url.toString();
      }
    }
    
    return originalSrc;
  };

  const { sanitizeImageUrl } = require('@/utils/image-utils');
  const optimizedSrc = sanitizeImageUrl(getUltraOptimizedSrc(src), 'banner');

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = (e: any) => {
    setHasError(true);
    onError?.(e);
  };

  // Preload image for instant display
  useEffect(() => {
    if (priority) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = optimizedSrc;
      document.head.appendChild(link);
    }
  }, [optimizedSrc, priority]);

  if (hasError) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-400 text-xs">Image failed</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        ref={imgRef}
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        quality={quality}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        sizes={width ? `${width}px` : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        {...props}
      />
      
      {/* Ultra-fast loading placeholder */}
      {!isLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-gray-100 animate-pulse"
          style={{ width, height }}
        />
      )}
    </div>
  );
}
