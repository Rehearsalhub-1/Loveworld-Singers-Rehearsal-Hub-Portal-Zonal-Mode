/**
 * NOTIFICATION STORE — Centralized Notification State (Thin UI / API-backed)
 *
 * Replaces: Firestore listeners on notifications & chats
 * Uses: Standalone API /notifications
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { BackendAPI } from '@/lib/api-client'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NotificationData {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  category: 'rehearsal' | 'announcement' | 'reminder' | 'system' | 'admin' | 'song' | 'praise_night'
  priority: 'low' | 'medium' | 'high'
  sender_id?: string
  sender_name?: string
  action_url?: string
  created_at: string
  read_at?: string
  is_read: boolean
  target_audience: 'all' | 'group' | 'individual'
  target_group?: string
  target_user_id?: string
  zoneId?: string
}

interface NotificationState {
  // Badge counts
  chatUnreadCount: number
  hasNewZoneMessage: boolean
  hasNewMedia: boolean
  hasNewCalendar: boolean
  hasUpcomingBirthday: boolean
  hasUnseenBirthday: boolean

  // Full notification list
  notifications: NotificationData[]
  notificationsLoading: boolean

  // Subscription tracking
  _currentUserId: string | null
  _currentZoneId: string | null

  // Actions
  initialize: (userId: string, zoneId: string, userProfile?: any) => void
  cleanup: () => void
  markAsSeen: () => void
  markMediaSeen: (userId?: string) => void
  markCalendarSeen: (userId?: string) => void

  // Notification CRUD
  markAsRead: (notificationId: string, userId: string) => Promise<boolean>
  markAllAsRead: (userId: string) => Promise<boolean>
  deleteNotification: (notificationId: string, userId: string) => Promise<boolean>
}

export const useNotificationStore = create<NotificationState>()(
  subscribeWithSelector((set, get) => ({
    chatUnreadCount: 0,
    hasNewZoneMessage: false,
    hasNewMedia: false,
    hasNewCalendar: false,
    hasUpcomingBirthday: false,
    hasUnseenBirthday: false,
    notifications: [],
    notificationsLoading: false,
    _currentUserId: null,
    _currentZoneId: null,

    initialize: async (userId: string, zoneId: string) => {
      set({
        _currentUserId: userId,
        _currentZoneId: zoneId,
        notificationsLoading: true,
      })

      try {
        const res = await BackendAPI.notifications.getAll({ userId }).catch(() => ({ data: [] }))
        const notifs = Array.isArray(res) ? res : res.data || []
        set({
          notifications: notifs,
          notificationsLoading: false,
        })
      } catch {
        set({ notificationsLoading: false })
      }
    },

    cleanup: () => {
      set({
        _currentUserId: null,
        _currentZoneId: null,
      })
    },

    markAsSeen: () => {
      set({
        chatUnreadCount: 0,
        hasNewZoneMessage: false,
      })
    },

    markMediaSeen: () => {
      set({ hasNewMedia: false })
    },

    markCalendarSeen: () => {
      set({ hasNewCalendar: false })
    },

    markAsRead: async (notificationId: string) => {
      try {
        await BackendAPI.notifications.markAsRead(notificationId).catch(() => {})
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          ),
        }))
        return true
      } catch {
        return false
      }
    },

    markAllAsRead: async () => {
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      }))
      return true
    },

    deleteNotification: async (notificationId: string) => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== notificationId),
      }))
      return true
    },
  }))
)

// Selectors
export const selectChatUnreadCount = (s: NotificationState) => s.chatUnreadCount
export const selectHasNewZoneMessage = (s: NotificationState) => s.hasNewZoneMessage
export const selectHasNewMedia = (s: NotificationState) => s.hasNewMedia
export const selectHasNewCalendar = (s: NotificationState) => s.hasNewCalendar
export const selectHasUpcomingBirthday = (s: NotificationState) => s.hasUpcomingBirthday
export const selectHasUnseenBirthday = (s: NotificationState) => s.hasUnseenBirthday
export const selectNotifications = (s: NotificationState) => s.notifications
export const selectNotificationsLoading = (s: NotificationState) => s.notificationsLoading

export function useUnreadNotifications() {
  const chatUnreadCount = useNotificationStore(selectChatUnreadCount)
  const hasNewZoneMessage = useNotificationStore(selectHasNewZoneMessage)
  const hasNewMedia = useNotificationStore(selectHasNewMedia)
  const hasNewCalendar = useNotificationStore(selectHasNewCalendar)
  const hasUpcomingBirthday = useNotificationStore(selectHasUpcomingBirthday)
  const hasUnseenBirthday = useNotificationStore(selectHasUnseenBirthday)
  const markMediaSeen = useNotificationStore((s) => s.markMediaSeen)
  const markCalendarSeen = useNotificationStore((s) => s.markCalendarSeen)
  const markAsSeen = useNotificationStore((s) => s.markAsSeen)

  const hasAnyUnread = chatUnreadCount > 0 || hasNewZoneMessage || hasNewMedia || hasNewCalendar

  return {
    chatUnreadCount,
    unreadCount: chatUnreadCount,
    hasNewZoneMessage,
    hasNewMedia,
    hasNewCalendar,
    hasUpcomingBirthday,
    hasUnseenBirthday,
    totalUnread: chatUnreadCount,
    hasAnyUnread,
    hasUnread: hasAnyUnread,
    markMediaSeen,
    markCalendarSeen,
    markAsSeen,
  }
}

export function useRealtimeNotifications(userId: string) {
  const notifications = useNotificationStore(selectNotifications)
  const loading = useNotificationStore(selectNotificationsLoading)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const deleteNotification = useNotificationStore((s) => s.deleteNotification)

  return {
    notifications,
    loading,
    error: null,
    markAsRead: (id: string) => markAsRead(id, userId),
    markAllAsRead: () => markAllAsRead(userId),
    deleteNotification: (id: string) => deleteNotification(id, userId),
    refresh: async () => {},
  }
}

export function useNotificationActions() {
  const createNotificationForAll = async (data: {
    title: string
    message: string
    type: string
    category: string
    priority: string
  }) => {
    try {
      await BackendAPI.generic.create('notifications', {
        ...data,
        target_audience: 'all',
        created_at: new Date().toISOString(),
        is_read: false,
      })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const createNotificationForGroup = async (data: {
    title: string
    message: string
    groupName: string
    type: string
    category: string
    priority: string
  }) => {
    try {
      await BackendAPI.generic.create('notifications', {
        title: data.title,
        message: data.message,
        type: data.type,
        category: data.category,
        priority: data.priority,
        target_audience: 'group',
        target_group: data.groupName,
        created_at: new Date().toISOString(),
        is_read: false,
      })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  return { createNotificationForAll, createNotificationForGroup }
}
