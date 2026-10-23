'use client'

import { useEffect } from 'react'

export default function ScreenshotPrevention() {
  useEffect(() => {
    // Prevent screenshots and screen recording
    const preventScreenshot = () => {
      // Add CSS to prevent screenshots
      const style = document.createElement('style')
      style.textContent = `
        * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        
        // Prevent text selection
        body {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
        
        // Allow text selection in input fields
        input, textarea, [contenteditable] {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          user-select: text !important;
        }
      `
      document.head.appendChild(style)

      // Prevent right-click context menu
      const preventContextMenu = (e: MouseEvent) => {
        e.preventDefault()
        return false
      }

      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, and mobile screenshot shortcuts
      const preventDevTools = (e: KeyboardEvent) => {
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
          (e.ctrlKey && e.key === 'U') ||
          (e.ctrlKey && e.key === 'S') ||
          (e.ctrlKey && e.key === 'A') ||
          (e.ctrlKey && e.key === 'P') ||
          // Mobile screenshot shortcuts
          (e.key === 'PrintScreen') ||
          (e.altKey && e.key === 'PrintScreen') ||
          // Additional mobile keys
          (e.key === 'VolumeDown') ||
          (e.key === 'VolumeUp')
        ) {
          e.preventDefault()
          return false
        }
      }

      // Prevent drag and drop
      const preventDragDrop = (e: DragEvent) => {
        e.preventDefault()
        return false
      }

      // Mobile-specific protections
      const preventMobileScreenshot = () => {
        // Detect mobile devices
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        
        if (isMobile) {
          // Add mobile-specific CSS
          const mobileStyle = document.createElement('style')
          mobileStyle.textContent = `
            /* Mobile screenshot prevention */
            body {
              -webkit-touch-callout: none !important;
              -webkit-user-select: none !important;
              -khtml-user-select: none !important;
              -moz-user-select: none !important;
              -ms-user-select: none !important;
              user-select: none !important;
              -webkit-tap-highlight-color: transparent !important;
            }
            
            /* Prevent long press context menu on mobile */
            * {
              -webkit-touch-callout: none !important;
              -webkit-user-select: none !important;
              -khtml-user-select: none !important;
              -moz-user-select: none !important;
              -ms-user-select: none !important;
              user-select: none !important;
            }
            
            /* Allow text selection in inputs */
            input, textarea, [contenteditable] {
              -webkit-user-select: text !important;
              -moz-user-select: text !important;
              -ms-user-select: text !important;
              user-select: text !important;
            }
          `
          document.head.appendChild(mobileStyle)
          
          // Prevent mobile screenshot gestures
          const preventMobileGestures = (e: TouchEvent) => {
            // Prevent three-finger screenshot gesture
            if (e.touches.length >= 3) {
              e.preventDefault()
              return false
            }
          }
          
          // Prevent mobile screenshot with volume + power button
          const preventMobileKeys = (e: KeyboardEvent) => {
            // This is harder to detect on mobile, but we try
            if (e.key === 'VolumeDown' || e.key === 'VolumeUp') {
              e.preventDefault()
              return false
            }
          }
          
          document.addEventListener('touchstart', preventMobileGestures, { passive: false })
          document.addEventListener('touchend', preventMobileGestures, { passive: false })
          document.addEventListener('keydown', preventMobileKeys)
          
          return () => {
            document.removeEventListener('touchstart', preventMobileGestures)
            document.removeEventListener('touchend', preventMobileGestures)
            document.removeEventListener('keydown', preventMobileKeys)
            if (mobileStyle.parentNode) {
              mobileStyle.parentNode.removeChild(mobileStyle)
            }
          }
        }
        return () => {}
      }

      // Add event listeners
      document.addEventListener('contextmenu', preventContextMenu)
      document.addEventListener('keydown', preventDevTools)
      document.addEventListener('dragstart', preventDragDrop)
      document.addEventListener('drop', preventDragDrop)
      
      // Initialize mobile protections
      const mobileCleanup = preventMobileScreenshot()

      // Prevent print
      window.addEventListener('beforeprint', (e) => {
        e.preventDefault()
        alert('Printing is not allowed')
        return false
      })

            const clearConsole = () => {
        if (typeof console !== 'undefined') {
          console.clear()
        }
      }

            const consoleInterval = setInterval(clearConsole, 2000)

      // Cleanup function
      return () => {
        document.removeEventListener('contextmenu', preventContextMenu)
        document.removeEventListener('keydown', preventDevTools)
        document.removeEventListener('dragstart', preventDragDrop)
        document.removeEventListener('drop', preventDragDrop)
        clearInterval(consoleInterval)
        mobileCleanup() // Clean up mobile protections
        if (style.parentNode) {
          style.parentNode.removeChild(style)
        }
      }
    }

    const cleanup = preventScreenshot()
    return cleanup
  }, [])

  // Add meta tags for additional security
  useEffect(() => {
    // Add security meta tags
    const securityMeta = document.createElement('meta')
    securityMeta.setAttribute('name', 'referrer')
    securityMeta.setAttribute('content', 'no-referrer')
    document.head.appendChild(securityMeta)

    // Prevent iframe embedding
    const frameMeta = document.createElement('meta')
    frameMeta.setAttribute('http-equiv', 'X-Frame-Options')
    frameMeta.setAttribute('content', 'DENY')
    document.head.appendChild(frameMeta)

    // Mobile screenshot prevention meta tags
    const mobileSecurityMeta = document.createElement('meta')
    mobileSecurityMeta.setAttribute('name', 'mobile-web-app-capable')
    mobileSecurityMeta.setAttribute('content', 'yes')
    document.head.appendChild(mobileSecurityMeta)

    const mobileStatusMeta = document.createElement('meta')
    mobileStatusMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
    mobileStatusMeta.setAttribute('content', 'black-translucent')
    document.head.appendChild(mobileStatusMeta)

    // Prevent mobile screenshot with additional meta tags
    const preventScreenshotMeta = document.createElement('meta')
    preventScreenshotMeta.setAttribute('name', 'format-detection')
    preventScreenshotMeta.setAttribute('content', 'telephone=no')
    document.head.appendChild(preventScreenshotMeta)

    return () => {
      if (securityMeta.parentNode) {
        securityMeta.parentNode.removeChild(securityMeta)
      }
      if (frameMeta.parentNode) {
        frameMeta.parentNode.removeChild(frameMeta)
      }
      if (mobileSecurityMeta.parentNode) {
        mobileSecurityMeta.parentNode.removeChild(mobileSecurityMeta)
      }
      if (mobileStatusMeta.parentNode) {
        mobileStatusMeta.parentNode.removeChild(mobileStatusMeta)
      }
      if (preventScreenshotMeta.parentNode) {
        preventScreenshotMeta.parentNode.removeChild(preventScreenshotMeta)
      }
    }
  }, [])

  return null
}