'use client'

import React from 'react'
import CustomLoader from '@/components/CustomLoader'

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <CustomLoader message={message} />
    </div>
  )
}

export default LoadingScreen
