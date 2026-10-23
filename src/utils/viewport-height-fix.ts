// Viewport Height Fix for Mobile Browsers
export class ViewportHeightFix {
  private static isInitialized = false
  private static initialHeight = 0

  static init() {
    if (typeof window === 'undefined' || this.isInitialized) return
    
    this.isInitialized = true
    this.initialHeight = window.innerHeight
    
    // Set CSS custom property for viewport height and check keyboard state
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)

      // Detect virtual keyboard state globally
      let isKeyboardOpen = false
      if (window.visualViewport) {
        const maxVpHeight = Math.max(this.initialHeight, window.innerHeight)
        if (maxVpHeight - window.visualViewport.height > 150) {
          isKeyboardOpen = true
        }
      } else if (this.initialHeight - window.innerHeight > 150) {
        isKeyboardOpen = true
      }

      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        const inputType = (document.activeElement as HTMLInputElement).type
        if (!['checkbox', 'radio', 'range', 'button', 'submit', 'reset'].includes(inputType)) {
          isKeyboardOpen = true
        }
      }

      if (isKeyboardOpen) {
        document.documentElement.classList.add('keyboard-open')
      } else {
        document.documentElement.classList.remove('keyboard-open')
      }
    }

    // Set initial value
    setVH()

    window.addEventListener('resize', setVH)
    
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.initialHeight = window.innerHeight
        setVH()
      }, 100)
    })

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVH)
    }

    // Handle global focus in/out for active keyboard management
    document.addEventListener('focusin', (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        const inputType = (target as HTMLInputElement).type
        if (!['checkbox', 'radio', 'range', 'button', 'submit', 'reset'].includes(inputType)) {
          document.documentElement.classList.add('keyboard-open')
          setTimeout(() => {
            try {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } catch (err) {}
          }, 300)
        }
      }
    })

    document.addEventListener('focusout', (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        setTimeout(() => {
          if (!document.activeElement || !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            document.documentElement.classList.remove('keyboard-open')
            setVH()
          }
        }, 100)
      }
    })

    // Handle app resume from background (iOS Safari issue)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(setVH, 100)
        setTimeout(setVH, 500) // Double check after animations
      }
    })

    // Handle page focus (when switching back to tab)
    window.addEventListener('focus', () => {
      setTimeout(setVH, 100)
    })

    // Handle page show (when page becomes visible)
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        setTimeout(setVH, 100)
      }
    })

  }

  static getViewportHeight() {
    if (typeof window === 'undefined') return '100vh'
    
    // Use visual viewport if available
    if (window.visualViewport) {
      return `${window.visualViewport.height}px`
    }
    
    // Use CSS custom property
    const vh = document.documentElement.style.getPropertyValue('--vh')
    if (vh) {
      return `calc(var(--vh, 1vh) * 100)`
    }
    
    return '100vh'
  }

  static forceRefresh() {
    if (typeof window === 'undefined') return
    
    const vh = window.innerHeight * 0.01
    document.documentElement.style.setProperty('--vh', `${vh}px`)
    
    // Also trigger a resize event to update any components listening
    window.dispatchEvent(new Event('resize'))
  }
}



