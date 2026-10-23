'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { ArrowLeft, Users, Check, Loader2 } from 'lucide-react'
import { BackendAPI } from '@/lib/api-client'

export default function JoinZonePage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { refreshZones, userZones } = useZone()

  const [zoneCode, setZoneCode] = useState('')
  const [zoneName, setZoneName] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Validate zone code as user types
  const handleZoneCodeChange = async (code: string) => {
    setZoneCode(code.toUpperCase())
    setError('')
    setZoneName(null)

    if (code.length >= 6) {
      const { getZoneByInvitationCode } = await import('@/config/zones')
      const zone = getZoneByInvitationCode(code.toUpperCase())
      if (zone) {
        setZoneName(zone.name)
      } else {
        setError('Invalid zone code')
      }
    }
  }

  const handleJoinZone = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.uid || !profile) {
      setError('Please sign in first')
      return
    }

    if (!zoneCode || zoneCode.length < 6) {
      setError('Please enter a valid zone code')
      return
    }

    setIsJoining(true)
    setError('')

    try {
      const result = await BackendAPI.members.joinZone({ invitationCode: zoneCode })

      if (result.success) {
        const zName = result.data?.name || 'your zone'
        setSuccess(`Welcome to ${zName}!`)

        localStorage.removeItem('lwsrh-zone-cache-v5')
        localStorage.removeItem('lwsrh-profile-cache-v1')

        const cacheKeys = ['praise-nights', 'songs-data', 'categories', 'calendar', 'notifications']
        cacheKeys.forEach(key => {
          try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const storageKey = localStorage.key(i)
              if (storageKey && storageKey.includes(key)) {
                localStorage.removeItem(storageKey)
              }
            }
          } catch (e) { /* ignore */ }
        })

        // Full page redirect to ensure all contexts reload fresh
        setTimeout(() => {
          window.location.href = '/home'
        }, 1200)
      } else {
        setError(result.error || 'Failed to join zone')
      }
    } catch (err: any) {
 console.error('Join zone error:', err)
      setError(err.message || 'Failed to join zone')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50">
      {/* Header */}
      {/* Header */}
      <ScreenHeader
        title="Join a Zone"
        showBackButton={true}
        backPath="/pages/profile"
        rightImageSrc="/logo.png"
      />

      <div className="max-w-md mx-auto px-4 py-8">
        {/* Current Zones */}
        {userZones.length > 0 && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm text-green-800 font-medium mb-2">Your Current Zones:</p>
            <div className="space-y-2">
              {userZones.map(zone => (
                <div key={zone.id} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: zone.themeColor }}
                  />
                  <span className="text-sm text-green-700">{zone.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join Zone Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Join a Zone</h2>
            <p className="text-sm text-gray-600">
              Enter your zone invitation code to join a LoveWorld Singers zone
            </p>
          </div>

          <form onSubmit={handleJoinZone} className="space-y-4">
            {/* Zone Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zone Invitation Code
              </label>
              <input
                type="text"
                value={zoneCode}
                onChange={(e) => handleZoneCodeChange(e.target.value)}
                placeholder="e.g., ZONE044 or ZNLZONE044"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center text-lg font-mono uppercase"
                maxLength={12}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use ZNL prefix for coordinator access (e.g., ZNLZONE044)
              </p>
            </div>

            {/* Zone Detection */}
            {zoneName && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-900">Zone Found!</p>
                    <p className="text-base font-bold text-emerald-700">{zoneName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!zoneName || isJoining}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  Join Zone
                </>
              )}
            </button>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Don't have a zone code? Contact your zone coordinator or check your invitation message.
          </p>
        </div>
      </div>
    </div>
  )
}
