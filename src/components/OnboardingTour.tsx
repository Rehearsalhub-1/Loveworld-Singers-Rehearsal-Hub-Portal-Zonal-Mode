'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { BackendAPI } from '@/lib/api-client'

interface OnboardingTourProps {
  forceShow?: boolean
  onComplete?: () => void
}

export default function OnboardingTour({ forceShow = false, onComplete }: OnboardingTourProps) {
  const { user, profile } = useAuth()
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    const checkTourStatus = async () => {
      if (!user || !profile) return

      // Force show if testing
      if (forceShow) {
        setShowWelcome(true)
        return
      }

      const hasSeenTour = (profile as any)?.has_seen_onboarding_tour || false
      
      if (!hasSeenTour) {
        // Show welcome message after a short delay
        setTimeout(() => {
          setShowWelcome(true)
        }, 1500)
      }
    }

    checkTourStatus()
  }, [user, profile, forceShow])

  const handleDismiss = async () => {
    setShowWelcome(false)
    
    // Mark tour as completed in user profile
    if (user && !forceShow) {
      try {
        const uId = user.uid || (user as any).id
        if (uId) {
          await BackendAPI.profiles.update(uId, {
            has_seen_onboarding_tour: true,
            onboarding_completed_at: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error(' Error updating tour status:', error)
      }
    }

    if (onComplete) {
      onComplete()
    }
  }

  if (!showWelcome) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <h2 className="text-xl font-bold text-white">Welcome to Loveworld Singers Hub!</h2>
        <p className="text-slate-300 text-sm">
          Access rehearsed songs, lyrics, audios, schedules, and stay updated with your zone.
        </p>
        <button
          onClick={handleDismiss}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition"
        >
          Get Started
        </button>
      </div>
    </div>
  )
}
