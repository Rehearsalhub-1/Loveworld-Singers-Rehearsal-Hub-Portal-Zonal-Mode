'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, X, Settings, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

function useNotifications() {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? Notification.permission : 'default'
  );

  const needsPermission = permission === 'default';
  const isBlocked = permission === 'denied';
  const canSendNotifications = permission === 'granted';

  const requestPermission = async () => {
    if (!isSupported) return false;
    const res = await Notification.requestPermission();
    setPermission(res);
    return res === 'granted';
  };

  const sendTestNotification = (title: string = 'LWSRHP Notification', options?: NotificationOptions) => {
    if (canSendNotifications) {
      try {
        new Notification(title, options);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return {
    permission,
    isSupported,
    canSendNotifications,
    needsPermission,
    isBlocked,
    requestPermission,
    sendTestNotification,
  };
}

interface NotificationBannerProps {
  onDismiss?: () => void
  showSettingsButton?: boolean
}

export default function NotificationBanner({ onDismiss, showSettingsButton = true }: NotificationBannerProps) {
  const {
    permission,
    isSupported,
    canSendNotifications,
    needsPermission,
    isBlocked,
    requestPermission,
    sendTestNotification
  } = useNotifications()

  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Show banner if notifications are not set up properly
    if (isSupported && (needsPermission || isBlocked) && !isDismissed) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [isSupported, needsPermission, isBlocked, isDismissed])

  const handleRequestPermission = async () => {
    const granted = await requestPermission()
    if (granted) {
      setIsVisible(false)
      // Send a welcome notification
      setTimeout(() => {
        sendTestNotification()
      }, 1000)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    onDismiss?.()
  }

  const handleTestNotification = async () => {
    await sendTestNotification()
  }

  if (!isVisible || !isSupported) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {needsPermission ? (
            <Bell className="w-5 h-5 text-yellow-300" />
          ) : isBlocked ? (
            <BellOff className="w-5 h-5 text-red-300" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          
          <div>
            <h3 className="font-semibold text-sm">
              {needsPermission ? 'Enable Notifications' : 'Notifications Blocked'}
            </h3>
            <p className="text-xs text-purple-100">
              {needsPermission 
                ? 'Get notified about rehearsals, announcements, and updates.'
                : 'Notifications are blocked. Enable them in your browser settings.'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {needsPermission && (
            <>
              <button
                onClick={handleTestNotification}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
              >
                Test
              </button>
              <button
                onClick={handleRequestPermission}
                className="px-4 py-2 bg-white text-purple-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
              >
                Enable
              </button>
            </>
          )}
          
          {isBlocked && (
            <button
              onClick={() => window.open('/pages/notifications', '_blank')}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              Settings
            </button>
          )}
          
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// In-app notification toast component
interface NotificationToastProps {
  notification: {
    id: string
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    timestamp: Date
  }
  onClose: (id: string) => void
  autoClose?: boolean
  duration?: number
}

export function NotificationToast({ 
  notification, 
  onClose, 
  autoClose = true, 
  duration = 5000 
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onClose(notification.id), 300) // Wait for animation
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [autoClose, duration, notification.id, onClose])

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white border rounded-lg shadow-lg transform transition-all duration-300 ease-in-out ${getBackgroundColor()}`}>
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm">
              {notification.title}
            </h4>
            <p className="text-gray-600 text-xs mt-1">
              {notification.message}
            </p>
            <p className="text-gray-400 text-xs mt-2">
              {notification.timestamp.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false)
              setTimeout(() => onClose(notification.id), 300)
            }}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Notification center trigger button
interface NotificationCenterButtonProps {
  unreadCount?: number
  onClick?: () => void
}

export function NotificationCenterButton({ unreadCount = 0, onClick }: NotificationCenterButtonProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
    >
      <Bell className="w-5 h-5 text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}

