'use client'

import React from 'react'

/**
 * ActivityLogger — Thin UI wrapper
 * Direct Firestore logging stripped; activity logs are handled by the API.
 */
export function ActivityLogger({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

export default ActivityLogger
