'use client'

import React, { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { BackendAPI, unwrap } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import { useZone } from '@/hooks/useZone'
import { isHQGroup } from '@/config/zones'

export default function SongSubmissionBadge() {
  const router = useRouter()
  const { currentZone } = useZone()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  
    const isHQ = currentZone?.id ? isHQGroup(currentZone.id) : false

  useEffect(() => {
    if (currentZone?.id) {
      loadUnreadCount()
    }
    
    // Listen to real-time submission events over WebSocket (zero polling)
    const unsub = BackendAPI.realtime.subscribe('submitted_song', 'all', () => {
      loadUnreadCount()
    })
    
    return () => unsub()
  }, [currentZone?.id])

  const loadUnreadCount = async () => {
    try {
      // HQ sees all notifications, others see only their zone
      const canSeeAll = isHQ
      const zoneId = canSeeAll ? undefined : currentZone?.id
      
      const notifications = unwrap<any[]>(await BackendAPI.submittedSongs.getAll({ status: 'pending', ...(zoneId ? { zoneId } : {}) }))
      setUnreadCount(notifications.length)
    } catch (error) {
 console.error('Error loading unread count:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  if (unreadCount === 0) return null

  return (
    <button
      onClick={() => router.push('/pages/admin/submitted-songs')}
      className="relative inline-flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors"
    >
      <Bell className="w-5 h-5" />
      <span className="font-medium">New Song Submissions</span>
      <span className="bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    </button>
  )
}











