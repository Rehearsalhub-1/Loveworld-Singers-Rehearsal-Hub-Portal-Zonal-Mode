'use client'

import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { WifiOff, AlertCircle, RefreshCw } from 'lucide-react'

export function BackendOfflineIndicator() {
  const { backendOffline } = useAuth()

  if (!backendOffline) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all animate-in fade-in duration-300">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-red-100 transform animate-in zoom-in duration-300">
        {/* Header/Icon Section */}
        <div className="bg-red-50 p-8 flex justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,red_0%,transparent_70%)] animate-pulse" />
          </div>
          <div className="relative z-10 w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-red-100">
            <WifiOff className="w-10 h-10 text-red-600 animate-bounce" />
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2 text-indigo-600">
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            <span className="text-[10px] font-black uppercase tracking-widest">Update Required</span>
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">
            Something went wrong
          </h3>
          <p className="text-gray-500 font-medium mb-8 leading-relaxed">
            We've encountered a connection hiccup. Please refresh the page to continue your session.
          </p>

          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh Page
          </button>
          
        
        </div>
      </div>
    </div>
  )
}
