'use client';

import Link from 'next/link';
import { ArrowLeft, Mic } from 'lucide-react';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function AudioLabPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-purple-50/20">
      <ScreenHeader
        title="AudioLab"
        showBackButton={true}
        backPath="/home"
      />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-lg shadow-purple-500/5 border border-purple-100/60 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-5 border border-purple-100">
            <Mic className="w-8 h-8" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            AudioLab
          </h1>

          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            AudioLab recording features are available on the mobile app. You can rehearse all songs right here on the portal.
          </p>

          <Link
            href="/home"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
