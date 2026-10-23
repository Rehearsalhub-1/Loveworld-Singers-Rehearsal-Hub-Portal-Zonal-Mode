'use client'

import { useState } from 'react'
import { useZone } from '@/hooks/useZone'
import { ChevronDown, Check, Users } from 'lucide-react'
import CustomLoader from './CustomLoader'

export default function ZoneSwitcher() {
  const { currentZone, userZones, switchZone } = useZone()
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  // Don't show if no zone, or if user has fewer than 2 zones (no need to switch)
  if (!currentZone || userZones.length < 2) {
    return null
  }

  const handleZoneSwitch = async (zoneId: string) => {
    if (zoneId === currentZone.id) {
      setIsOpen(false)
      return
    }

    setIsOpen(false)
    setIsSwitching(true)


    // Call switchZone which updates current zone
    const success = await switchZone(zoneId)

    if (success) {

            try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && !key.startsWith('lwsrh-user-zone-') && (
            key.includes('praise-nights') ||
            key.includes('songs-data') ||
            key.includes('categories') ||
            key.includes('calendar') ||
            key.includes('notifications') ||
            key.includes('members') ||
            key.includes('rehearsal') ||
            key.includes('media-cache')
          )) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k))
      } catch (e) {
 console.error('Error clearing caches:', e)
      }

      // Small delay for visual feedback before hard reload
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } else {
      setIsSwitching(false)
    }
  }

  return (
    <>
      {isSwitching && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4">
            <CustomLoader size="lg" />
            <p className="text-gray-600 font-medium animate-pulse">Switching to new zone...</p>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Current Zone Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isSwitching}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: currentZone.themeColor }}
          />
          <div className="flex-1 text-left">
            <p className="text-xs text-gray-500">Current Zone</p>
            <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
              {currentZone.name}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl z-50 max-h-[400px] overflow-y-auto">
              <div className="py-2">
                {userZones.map((zone) => (
                  <button
                    key={zone.id}
                    onClick={() => handleZoneSwitch(zone.id)}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${currentZone.id === zone.id ? 'bg-green-50' : ''
                      }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: zone.themeColor }}
                    />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900">{zone.name}</p>
                      <p className="text-xs text-gray-500">{zone.region}</p>
                    </div>
                    {currentZone.id === zone.id && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Join Another Zone Button */}
              <div className="border-t border-gray-200 p-2">
                <a
                  href="/pages/join-zone"
                  className="w-full px-4 py-2.5 flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  <Users className="w-4 h-4" />
                  Join Another Zone
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
