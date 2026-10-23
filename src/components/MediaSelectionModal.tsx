"use client";

import React from 'react';
import { X } from 'lucide-react';
import MediaManager from './MediaManager';
import { useAdminTheme } from './admin/AdminThemeProvider';

interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'audio' | 'video' | 'document';
  size: number;
  uploadedAt: string;
  folder?: string;
}

interface MediaSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: MediaFile) => void;
  allowedTypes?: ('image' | 'audio' | 'video' | 'document')[];
  title?: string;
}

export default function MediaSelectionModal({ 
  isOpen, 
  onClose, 
  onFileSelect, 
  allowedTypes = ['audio'],
  title = "Select Media File"
}: MediaSelectionModalProps) {
  const { theme } = useAdminTheme();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-[400] overflow-y-auto w-screen h-screen">
      <div className="bg-white w-full min-h-screen">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>
        <div className="p-4">
          <MediaManager
            onSelectFile={(file) => {
              onFileSelect(file);
            }}
            onClose={() => {
              onClose();
            }}
            selectionMode={true}
            allowedTypes={allowedTypes}
            filterType={allowedTypes.length === 1 ? allowedTypes[0] : 'all'}
          />
        </div>
      </div>
    </div>
  );
}

