// Push Notification Service for PWA

interface NotificationSettings {
  enabled: boolean
  sound: boolean
  vibration: boolean
  rehearsalReminders: boolean
  announcements: boolean
  systemUpdates: boolean
}

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null

  isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
  }

  getPermissionStatus(): { granted: boolean; denied: boolean; default: boolean } {
    if (!this.isNotificationSupported()) {
      return { granted: false, denied: false, default: true }
    }

    const permission = Notification.permission
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isNotificationSupported()) {
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
 console.error('Error requesting notification permission:', error)
      return false
    }
  }

  async initialize(): Promise<boolean> {
    if (!this.isNotificationSupported()) {
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.ready
      return true
    } catch (error) {
 console.error('Error initializing push notifications:', error)
      return false
    }
  }

  getNotificationSettings(): NotificationSettings {
    if (typeof window === 'undefined') {
      return {
        enabled: true,
        sound: true,
        vibration: true,
        rehearsalReminders: true,
        announcements: true,
        systemUpdates: true
      }
    }

    const stored = localStorage.getItem('notificationSettings')
    if (stored) {
      return JSON.parse(stored)
    }

    return {
      enabled: true,
      sound: true,
      vibration: true,
      rehearsalReminders: true,
      announcements: true,
      systemUpdates: true
    }
  }

  saveNotificationSettings(settings: NotificationSettings): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notificationSettings', JSON.stringify(settings))
    }
  }

  async sendSystemNotification(message: {
    title: string
    body: string
    type: 'info' | 'success' | 'warning' | 'error'
  }): Promise<boolean> {
    if (!this.registration || !this.getPermissionStatus().granted) {
      return false
    }

    try {
      await this.registration.showNotification(message.title, {
        body: message.body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `system-${Date.now()}`,
        requireInteraction: message.type === 'error'
      })
      return true
    } catch (error) {
 console.error('Error sending system notification:', error)
      return false
    }
  }

  async sendRehearsalReminder(rehearsalData: {
    title: string
    time: string
    location: string
    minutesUntil: number
  }): Promise<boolean> {
    if (!this.registration || !this.getPermissionStatus().granted) {
      return false
    }

    try {
      await this.registration.showNotification('Rehearsal Reminder', {
        body: `${rehearsalData.title} starts in ${rehearsalData.minutesUntil} minutes at ${rehearsalData.location}`,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'rehearsal-reminder',
        requireInteraction: true
      })
      return true
    } catch (error) {
 console.error('Error sending rehearsal reminder:', error)
      return false
    }
  }

  async sendAnnouncement(announcement: {
    title: string
    message: string
    priority: 'low' | 'medium' | 'high'
  }): Promise<boolean> {
    if (!this.registration || !this.getPermissionStatus().granted) {
      return false
    }

    try {
      await this.registration.showNotification(announcement.title, {
        body: announcement.message,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `announcement-${Date.now()}`,
        requireInteraction: announcement.priority === 'high'
      })
      return true
    } catch (error) {
 console.error('Error sending announcement:', error)
      return false
    }
  }

  async clearAllNotifications(): Promise<void> {
    if (!this.registration) {
      return
    }

    try {
      const notifications = await this.registration.getNotifications()
      notifications.forEach(notification => notification.close())
    } catch (error) {
 console.error('Error clearing notifications:', error)
    }
  }

  scheduleNotification(payload: {
    title: string
    body: string
    icon?: string
    data?: any
  }, delay: number): void {
    setTimeout(async () => {
      if (this.registration && this.getPermissionStatus().granted) {
        await this.registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/logo.png',
          badge: '/logo.png',
          data: payload.data
        })
      }
    }, delay)
  }
}

export const pushNotificationService = new PushNotificationService()
