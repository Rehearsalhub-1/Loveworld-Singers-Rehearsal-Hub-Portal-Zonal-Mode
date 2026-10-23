'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Bell, Users, Building2, Calendar,
  Mic, Gift, Image, RefreshCw, Music, MessageCircle,
  Clock, Trash2, AlertCircle, ArrowRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications'
import { BackendAPI } from '@/lib/api-client'
import { parseProgramDate } from '@/utils/date-parser'

// Notification types
type NotificationType =
  | 'zone' | 'subgroup' | 'audiolab' | 'calendar'
  | 'birthday' | 'media' | 'song' | 'chat'

interface CombinedNotification {
  id: string
  title: string
  message: string
  sentBy?: string
  sentAt: string
  type: NotificationType
  subGroupName?: string
  read?: boolean
  is_read?: boolean
  projectId?: string
  projectName?: string
  invitedBy?: string
  eventDate?: string
  eventType?: string
  mediaType?: 'image' | 'video' | 'audio'
  mediaUrl?: string
  songStatus?: 'approved' | 'rejected' | 'replied'
  chatId?: string
  chatName?: string
  isGroup?: boolean
  senderAvatar?: string
}

// Filter tabs
const FILTER_TABS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: Bell },
  { id: 'unread', label: 'Unread', icon: AlertCircle },
  { id: 'audiolab', label: 'Studio', icon: Mic },
  { id: 'calendar', label: 'Events', icon: Calendar },
  { id: 'media', label: 'Media', icon: Image },
]

type FilterType = string

// Simple cache for notifications
const notificationCache = new Map<string, { data: CombinedNotification[]; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<CombinedNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { user, profile } = useAuth()
  const { currentZone, isLoading: zoneLoading, isZoneCoordinator, userRole } = useZone()
  const isSongAdmin = userRole === 'hq_admin' || userRole === 'boss'
  const { markAsSeen } = useUnreadNotifications()

  const zoneColor = currentZone?.themeColor || '#9333EA'
  const userId = user?.uid || profile?.id
  const userEmail = user?.email || profile?.email

  // Mark notifications as seen when page loads
  useEffect(() => {
    markAsSeen()
  }, [markAsSeen])

  // Delete notification handler
  const handleDelete = async (notif: CombinedNotification, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingId(notif.id)
    setError(null)

    try {
      await BackendAPI.notifications.delete(notif.id).catch(() => {})
      setNotifications(prev => prev.filter(n => n.id !== notif.id))
      if (currentZone?.id && userId) {
        notificationCache.delete(`${currentZone.id}-${userId}`)
      }
    } catch (err) {
      console.error('[Notifications] Error deleting:', err)
      setError('Failed to delete notification')
    } finally {
      setDeletingId(null)
    }
  }

  // Load notifications from BackendAPI
  const loadNotifications = useCallback(async (showRefresh = false, bypassCache = false) => {
    if (!currentZone?.id || !userId) {
      setLoading(false)
      return
    }

    // Check cache first
    const cacheKey = `${currentZone.id}-${userId}`
    if (!bypassCache && !showRefresh) {
      const cached = notificationCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setNotifications(cached.data)
        setLoading(false)
        return
      }
    }

    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res: any = await BackendAPI.notifications.getAll().catch(() => ({ data: [] }))
      const rawList = Array.isArray(res) ? res : (res?.data || [])

      const allNotifications: CombinedNotification[] = rawList.map((notif: any) => ({
        id: String(notif.id),
        title: notif.title || 'Notification',
        message: notif.message || '',
        sentBy: notif.sender_name || 'System',
        sentAt: notif.created_at || new Date().toISOString(),
        type: notif.category || notif.type || 'system',
        is_read: !!notif.is_read,
        action_url: notif.action_url,
        chatId: notif.chat_id || notif.chatId,
        projectId: notif.project_id || notif.projectId
      }))

      allNotifications.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      notificationCache.set(cacheKey, { data: allNotifications, timestamp: Date.now() })
      setNotifications(allNotifications)
    } catch (e) {
      console.error('Load error:', e)
      setError('Failed to load notifications')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId, userEmail, currentZone?.id])

  // Initial load
  useEffect(() => {
    if (currentZone?.id && !zoneLoading && userId) {
      loadNotifications()
    }
  }, [currentZone?.id, zoneLoading, userId, loadNotifications])

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filter === 'unread') return n.is_read === false || (n.read === false)
      if (filter === 'all') return true
      if (filter === 'audiolab') return n.type === 'audiolab'
      if (filter === 'calendar') return n.type === 'calendar' || n.type === 'birthday'
      if (filter === 'media') return n.type === 'media'
      return true
    })
  }, [notifications, filter])

  // Group by date
  const grouped = useMemo(() => {
    return filteredNotifications.reduce((acc, notif) => {
      const date = new Date(notif.sentAt)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let key = date.toDateString() === today.toDateString() ? 'Today'
        : date.toDateString() === yesterday.toDateString() ? 'Yesterday'
          : date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

      if (!acc[key]) acc[key] = []
      acc[key].push(notif)
      return acc
    }, {} as Record<string, CombinedNotification[]>)
  }, [filteredNotifications])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMs < 0) return date.toLocaleDateString()
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getIcon = (type: NotificationType) => {
    const icons: Record<NotificationType, React.ElementType> = {
      zone: Building2, subgroup: Users, audiolab: Mic, calendar: Calendar,
      birthday: Gift, media: Image, song: Music, chat: MessageCircle
    }
    return icons[type] || Bell
  }

  const getIconBg = (type: NotificationType, songStatus?: string) => {
    const colors: Record<NotificationType, string> = {
      zone: 'bg-blue-100 text-blue-600',
      subgroup: 'bg-purple-100 text-purple-600',
      audiolab: 'bg-violet-100 text-violet-600',
      calendar: 'bg-amber-100 text-amber-600',
      birthday: 'bg-pink-100 text-pink-600',
      media: 'bg-emerald-100 text-emerald-600',
      song: 'bg-purple-100 text-purple-600',
      chat: 'bg-indigo-100 text-indigo-600'
    }
    return colors[type] || 'bg-gray-100 text-gray-600'
  }

  const handleClick = (notif: CombinedNotification) => {
    switch (notif.type) {
      case 'audiolab':
        router.push(notif.projectId ? `/pages/audiolab?project=${notif.projectId}` : '/pages/audiolab')
        break
      case 'calendar':
      case 'birthday':
        router.push('/pages/calendar')
        break
      case 'media':
        router.push('/pages/media')
        break
      case 'song':
        router.push(isSongAdmin ? '/pages/admin/submitted-songs' : '/pages/submit-song')
        break
      case 'chat':
        router.push(notif.chatId ? `/pages/groups?conversation=${notif.chatId}` : '/pages/groups')
        break
      case 'subgroup':
      case 'zone':
        router.push('/pages/groups')
        break
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-y-auto">
      <ScreenHeader
        title="Notifications"
        showBackButton={true}
        backPath="/home"
        rightButtons={
          <button onClick={() => loadNotifications(true, true)} disabled={refreshing}
            className="p-2 rounded-lg hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="pb-24 px-4 overflow-y-auto" style={{ height: 'calc(100vh - 60px)' }}>
        <div className="max-w-2xl mx-auto">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="relative -mx-4 px-4 mb-4 pt-2 sticky top-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 z-10">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {FILTER_TABS.map(tab => {
                const Icon = tab.icon
                const count = tab.id === 'all' ? notifications.length
                  : notifications.filter(n => {
                    if (tab.id === 'calendar') return n.type === 'calendar' || n.type === 'birthday'
                    return n.type === tab.id
                  }).length

                return (
                  <button key={tab.id} onClick={() => setFilter(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 border ${filter === tab.id
                      ? 'text-white shadow-lg shadow-purple-200 border-transparent scale-105'
                      : 'bg-white/50 backdrop-blur-sm text-gray-500 border-gray-100 hover:bg-white hover:text-gray-900'
                      }`}
                    style={filter === tab.id ? { backgroundColor: zoneColor } : undefined}
                  >
                    <Icon className={`w-4 h-4 ${filter === tab.id ? 'animate-pulse' : ''}`} />
                    {tab.label}
                    {count > 0 && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-lg text-[10px] font-black ${filter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                        }`}>{count}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white/50 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-gray-100/50">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl animate-pulse flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-6 w-1/3 bg-gray-100 rounded-lg animate-pulse mb-3" />
                      <div className="h-4 w-full bg-gray-100 rounded-lg animate-pulse mb-2" />
                      <div className="h-4 w-2/3 bg-gray-100 rounded-lg animate-pulse mb-4" />
                      <div className="h-3 w-1/4 bg-gray-50 rounded-lg animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in zoom-in duration-700">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-100 rounded-full blur-3xl opacity-30 animate-pulse" />
                <div className="relative w-32 h-32 bg-white rounded-[40px] shadow-2xl shadow-indigo-100/50 flex items-center justify-center border border-indigo-50/50 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <Bell className="w-12 h-12 text-indigo-400" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 border-4 border-white">
                    <span className="text-white text-[10px] font-black">0</span>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Peace and Quiet</h3>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([dateGroup, notifs]) => (
                <div key={dateGroup}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">{dateGroup}</span>
                  </div>
                  <div className="space-y-2">
                    {notifs.map(notif => {
                      const Icon = getIcon(notif.type)
                      const iconBg = getIconBg(notif.type, notif.songStatus)
                      const isClickable = ['audiolab', 'calendar', 'birthday', 'media', 'song', 'chat', 'subgroup', 'zone'].includes(notif.type)
                      const isUnread = (notif.is_read === false || notif.read === false) && ['chat', 'song', 'subgroup', 'zone'].includes(notif.type)
                      const isDeleting = deletingId === notif.id

                      return (
                        <div key={notif.id} onClick={() => isClickable && handleClick(notif)}
                          className={`group relative bg-white/70 backdrop-blur-md rounded-[28px] p-4 sm:p-5 border transition-all duration-300 ${isClickable ? 'cursor-pointer hover:bg-white hover:shadow-2xl hover:shadow-indigo-100/50 hover:-translate-y-1 active:scale-[0.98]' : ''
                            } ${isUnread ? 'border-indigo-100 shadow-sm' : 'border-gray-100/50'} ${isDeleting ? 'opacity-50' : ''}`}
                        >
                          {/* Premium Unread Indicator */}
                          {isUnread && (
                            <div className="absolute top-5 right-5 flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">New</span>
                              <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-lg shadow-indigo-200 animate-pulse" />
                            </div>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={(e) => handleDelete(notif, e)}
                            disabled={isDeleting}
                            className="absolute bottom-4 right-4 p-2 rounded-xl bg-gray-50/50 text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 border border-gray-100/50"
                          >
                            {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>

                          <div className="flex items-start gap-4">
                            {/* Icon/Avatar Section */}
                            <div className="relative shrink-0">
                              {notif.type === 'chat' && notif.senderAvatar ? (
                                <div className="relative">
                                  <img src={notif.senderAvatar} alt="" className="w-14 h-14 rounded-2xl object-cover shadow-md border-2 border-white" />
                                  <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-lg shadow-sm border border-gray-50">
                                    <MessageCircle className="w-3.5 h-3.5 text-indigo-600" />
                                  </div>
                                </div>
                              ) : (
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md border-2 border-white transition-transform group-hover:scale-110 duration-500 ${iconBg}`}>
                                  <Icon className="w-7 h-7" />
                                </div>
                              )}
                            </div>

                            {/* Content Section */}
                            <div className="flex-1 min-w-0 pr-6">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className={`font-black text-gray-900 tracking-tight ${isUnread ? 'text-indigo-950' : ''}`}>{notif.title}</h3>
                                {notif.type === 'subgroup' && notif.subGroupName && (
                                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                                    {notif.subGroupName}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-2 font-medium">
                                {notif.message}
                              </p>

                              {/* Action Footer */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  {notif.sentBy && notif.type !== 'chat' && (
                                    <span className="truncate max-w-[120px]">{notif.sentBy}</span>
                                  )}
                                  {notif.sentBy && notif.type !== 'chat' && <span>•</span>}
                                  <span className="whitespace-nowrap">{formatDate(notif.sentAt)}</span>
                                </div>

                                {isClickable && (
                                  <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-[11px] uppercase tracking-wider group-hover:translate-x-1 transition-transform duration-300">
                                    <span>Open</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
