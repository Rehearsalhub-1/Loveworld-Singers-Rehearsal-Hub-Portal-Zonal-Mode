'use client'

import { createContext, useContext, ReactNode } from 'react'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import PermissionModal from '@/components/PermissionModal'

interface PermissionContextType {
  permissions: {
    notification: 'granted' | 'denied' | 'prompt' | 'unknown'
    microphone: 'granted' | 'denied' | 'prompt' | 'unknown'
  }
  requestPermission: (type: PermissionType) => Promise<boolean>
  needsPermission: (type: PermissionType) => boolean
}

const PermissionContext = createContext<PermissionContextType | null>(null)

export function PermissionProvider({ children }: { children: ReactNode }) {
  const {
    permissions,
    modalType,
    requestPermission,
    closeModal,
    handleGranted,
    handleDenied,
    needsPermission
  } = usePermissions()

  return (
    <PermissionContext.Provider value={{ permissions, requestPermission, needsPermission }}>
      {children}
      
      {/* Permission Modal */}
      {modalType && (
        <PermissionModal
          type={modalType}
          isOpen={true}
          onClose={closeModal}
          onGranted={handleGranted}
          onDenied={handleDenied}
        />
      )}
    </PermissionContext.Provider>
  )
}

export function usePermissionContext() {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermissionContext must be used within PermissionProvider')
  }
  return context
}
