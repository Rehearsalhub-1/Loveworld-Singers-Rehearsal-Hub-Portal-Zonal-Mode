'use client'

import { useState, useEffect, useCallback } from 'react'

export type PermissionType = 'notification' | 'microphone'

interface PermissionState {
  notification: PermissionState['status']
  microphone: PermissionState['status']
  status: 'granted' | 'denied' | 'prompt' | 'unknown'
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<{
    notification: 'granted' | 'denied' | 'prompt' | 'unknown'
    microphone: 'granted' | 'denied' | 'prompt' | 'unknown'
  }>({
    notification: 'unknown',
    microphone: 'unknown'
  })
  
  const [modalType, setModalType] = useState<PermissionType | null>(null)

  // Check current permission status
  const checkPermissions = useCallback(async () => {
    // Check notification permission
    if ('Notification' in window) {
      const notifPerm = Notification.permission
      // Map 'default' to 'prompt' for consistency
      const mappedPerm = notifPerm === 'default' ? 'prompt' : notifPerm
      setPermissions(prev => ({
        ...prev,
        notification: mappedPerm as 'granted' | 'denied' | 'prompt'
      }))
    }

    // Check microphone permission
    if ('permissions' in navigator) {
      try {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        setPermissions(prev => ({
          ...prev,
          microphone: micPermission.state as 'granted' | 'denied' | 'prompt'
        }))
        
        // Listen for changes
        micPermission.onchange = () => {
          setPermissions(prev => ({
            ...prev,
            microphone: micPermission.state as 'granted' | 'denied' | 'prompt'
          }))
        }
      } catch (e) {
        // Some browsers don't support microphone permission query
        setPermissions(prev => ({ ...prev, microphone: 'unknown' }))
      }
    }
  }, [])

  useEffect(() => {
    checkPermissions()
  }, [checkPermissions])

  // Request permission with modal
  const requestPermission = useCallback((type: PermissionType): Promise<boolean> => {
    return new Promise((resolve) => {
            if (type === 'notification' && permissions.notification === 'granted') {
        resolve(true)
        return
      }
      if (type === 'microphone' && permissions.microphone === 'granted') {
        resolve(true)
        return
      }

      // Store resolve function for later
      (window as any).__permissionResolve = resolve
      setModalType(type)
    })
  }, [permissions])

  // Close modal
  const closeModal = useCallback(() => {
    setModalType(null)
    // Resolve with false if closed without granting
    if ((window as any).__permissionResolve) {
      (window as any).__permissionResolve(false)
      delete (window as any).__permissionResolve
    }
  }, [])

  // Handle permission granted
  const handleGranted = useCallback(() => {
    checkPermissions()
    if ((window as any).__permissionResolve) {
      (window as any).__permissionResolve(true)
      delete (window as any).__permissionResolve
    }
  }, [checkPermissions])

  // Handle permission denied
  const handleDenied = useCallback(() => {
    checkPermissions()
    if ((window as any).__permissionResolve) {
      (window as any).__permissionResolve(false)
      delete (window as any).__permissionResolve
    }
  }, [checkPermissions])

    const needsPermission = useCallback((type: PermissionType): boolean => {
    if (type === 'notification') {
      return permissions.notification !== 'granted'
    }
    if (type === 'microphone') {
      return permissions.microphone !== 'granted'
    }
    return true
  }, [permissions])

  return {
    permissions,
    modalType,
    requestPermission,
    closeModal,
    handleGranted,
    handleDenied,
    needsPermission,
    checkPermissions
  }
}
