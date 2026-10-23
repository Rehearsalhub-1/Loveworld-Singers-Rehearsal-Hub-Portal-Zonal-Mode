'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { sanitizeImageUrl } from '@/utils/image-utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  onError?: (e: any) => void;
  onLoad?: () => void;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  quality = 75,
  onError,
  onLoad,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate WebP src if possible
  const getOptimizedSrc = (originalSrc: string) => {
    // If it's already a Cloudinary URL, optimize it
    if (originalSrc.includes('cloudinary.com')) {
      const url = new URL(originalSrc);
      const pathParts = url.pathname.split('/');
      const versionIndex = pathParts.findIndex(part => part.startsWith('v'));
      
      if (versionIndex !== -1) {
        // Insert WebP format and quality optimization
        pathParts.splice(versionIndex + 1, 0, 'f_webp,q_auto,w_auto');
        url.pathname = pathParts.join('/');
        return url.toString();
      }
    }
    
    // For local images, return as is (Next.js will handle optimization)
    return originalSrc;
  };

  const { sanitizeImageUrl } = require('@/utils/image-utils');
  const optimizedSrc = sanitizeImageUrl(getOptimizedSrc(src), 'banner');

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = (e: any) => {
    setHasError(true);
    onError?.(e);
  };

  // Generate a simple blur placeholder
  const generateBlurDataURL = (w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, w, h);
    }
    return canvas.toDataURL();
  };

  const defaultBlurDataURL = width && height ? generateBlurDataURL(width, height) : undefined;

  if (hasError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-400 text-xs">Failed to load</span>
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
        placeholder={placeholder}
        blurDataURL={blurDataURL || defaultBlurDataURL}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        quality={quality}
        unoptimized={true}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
      
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{ width, height }}
        >
          <div className="w-8 h-8 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}
