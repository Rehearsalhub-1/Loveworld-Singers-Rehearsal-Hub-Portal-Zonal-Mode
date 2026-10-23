'use client';

import React from 'react';

/**
 * PageLoader — Pass-through component.
 * Legacy loading gates and spinners removed for instant, zero-cost API response.
 */
interface PageLoaderProps {
  children: React.ReactNode;
}

export function PageLoader({ children }: PageLoaderProps) {
  return <>{children}</>;
}

export default PageLoader;
