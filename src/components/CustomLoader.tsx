'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowRight, Music } from 'lucide-react';

interface CustomLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onRetry?: () => void;
  onContinue?: () => void;
}

export default function CustomLoader({
  message,
  size = 'lg',
  className = '',
  onRetry,
  onContinue,
}: CustomLoaderProps) {
  const [showStuckRescue, setShowStuckRescue] = useState(false);

  // Apple-style safety rescue: if stuck for > 4.5 seconds on slow/offline network,
  // reveal subtle recovery actions so the user is never trapped
  useEffect(() => {
    if (size !== 'lg') return;
    const timer = setTimeout(() => {
      setShowStuckRescue(true);
    }, 4500);
    return () => clearTimeout(timer);
  }, [size]);

  // Small inline loader (for buttons, input fields, etc.)
  if (size === 'sm') {
    return (
      <div className={`relative flex items-center justify-center w-4 h-4 ${className}`}>
        <svg className="w-full h-full animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="opacity-20"
          />
          <path
            d="M12 3a9 9 0 0 1 9 9"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  // Medium loader (for cards, dropdowns, modals)
  if (size === 'md') {
    return (
      <div className={`relative flex flex-col items-center justify-center p-4 ${className}`}>
        <div className="relative w-8 h-8">
          <svg className="w-full h-full" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="2.5"
            />
            <motion.circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="88"
              initial={{ strokeDashoffset: 88, rotate: 0 }}
              animate={{
                strokeDashoffset: [88, 20, 88],
                rotate: [0, 360, 720],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: [0.4, 0.0, 0.2, 1],
              }}
              style={{ transformOrigin: 'center' }}
            />
          </svg>
        </div>
        {message && (
          <p className="mt-2 text-xs font-medium text-slate-500 tracking-wide">
            {message}
          </p>
        )}
      </div>
    );
  }

  // Large Apple/iOS Classy Drawing Loader
  return (
    <div className={`flex flex-col items-center justify-center min-h-[40vh] w-full p-6 select-none ${className}`}>
      <div className="relative flex items-center justify-center w-12 h-12 mb-3.5">
        {/* Subtle Apple-style background track */}
        <svg className="w-full h-full" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            stroke="rgba(147, 51, 234, 0.12)"
            strokeWidth="3"
          />
          {/* Main Drawing Arc (Apple SF style) */}
          <motion.circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            stroke="#9333ea"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="119"
            initial={{ strokeDashoffset: 119, rotate: -90 }}
            animate={{
              strokeDashoffset: [119, 25, 119],
              rotate: [-90, 270, 630],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: [0.4, 0.0, 0.2, 1],
            }}
            style={{ transformOrigin: 'center' }}
          />
        </svg>
      </div>

      {/* Elegant, Understated SF-Style Label */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center text-center max-w-xs"
        >
          <p className="text-[13px] font-medium text-slate-600 tracking-wide">
            {message}
          </p>
        </motion.div>
      )}

      {/* iOS-Style "Stuck Rescue" Action Card (Appears gracefully after 4.5s) */}
      <AnimatePresence>
        {showStuckRescue && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex flex-col items-center mt-6 p-3.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/70 shadow-lg shadow-slate-900/5 max-w-[280px] text-center"
          >
            <p className="text-[11px] font-medium text-slate-500 mb-2.5">
              Taking longer than usual to connect.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onRetry) {
                    onRetry();
                  } else {
                    window.location.reload();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                Retry
              </button>

              {onContinue ? (
                <button
                  type="button"
                  onClick={onContinue}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 rounded-xl shadow-sm transition-all"
                >
                  Continue
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const fallbackUrl = '/home';
                    window.location.href = fallbackUrl;
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Home
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
