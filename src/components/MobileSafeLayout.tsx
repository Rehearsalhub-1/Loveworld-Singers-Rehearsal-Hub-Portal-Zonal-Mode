'use client'

import { useEffect, useState } from 'react'
import { MobileSafe } from '@/utils/mobile-safe'

interface MobileSafeLayoutProps {
  children: React.ReactNode
  hasBottomTabs?: boolean
  hasCategoryBar?: boolean
  className?: string
}

export default function MobileSafeLayout({ 
  children, 
  hasBottomTabs = false, 
  hasCategoryBar = false,
  className = ''
}: MobileSafeLayoutProps) {
  const [mobileStyles, setMobileStyles] = useState(MobileSafe.getMobileStyles())

  useEffect(() => {
    const updateStyles = () => {
      setMobileStyles(MobileSafe.getMobileStyles())
    }

        window.addEventListener('resize', updateStyles)
    
        window.addEventListener('orientationchange', updateStyles)

        if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateStyles)
    }

    return () => {
      window.removeEventListener('resize', updateStyles)
      window.removeEventListener('orientationchange', updateStyles)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateStyles)
      }
    }
  }, [])

  // Calculate bottom padding based on what elements are present
  const getBottomPadding = () => {
    let padding = 0
    
    if (hasBottomTabs) padding += 80 // Bottom tabs height
    if (hasCategoryBar) padding += 80 // Category bar height
    
    return Math.max(padding, 20) // Minimum 20px
  }

  return (
    <div 
      className={`mobile-vh ${className}`}
      style={{
        height: mobileStyles.fullHeight,
        paddingBottom: `${getBottomPadding()}px`
      }}
    >
      {children}
    </div>
  )
}



