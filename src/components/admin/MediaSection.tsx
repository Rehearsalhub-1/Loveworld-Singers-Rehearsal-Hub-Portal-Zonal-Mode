"use client";

import React from 'react';
import MediaManager from '../MediaManager';
import { useAdminTheme } from './AdminThemeProvider';

interface MediaSectionProps {
  // Add any props that MediaManager needs
}

export default function MediaSection(props: MediaSectionProps) {
  const { theme } = useAdminTheme();
  
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <MediaManager />
    </div>
  );
}
