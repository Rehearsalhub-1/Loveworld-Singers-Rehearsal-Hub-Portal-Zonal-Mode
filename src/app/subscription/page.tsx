'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Sparkles, ArrowLeft, CheckCircle } from 'lucide-react'
import { ScreenHeader } from '@/components/ScreenHeader'

export default function SubscriptionPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <ScreenHeader title="Subscription" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <Crown className="w-8 h-8 text-slate-950" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5" /> Full Platform Access Active
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">All Features Unlocked</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              All tools, song libraries, rehearsal schedules, AudioLab, and administrative modules are currently fully accessible. Premium billing will be reintroduced in a future update.
            </p>
          </div>

          <button
            onClick={() => router.push('/home')}
            className="w-full py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
