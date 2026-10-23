'use client'

import { useState, useEffect, useRef } from 'react'

const loadedPages = new Set<string>()

export function useMinimumLoadingTime(
  isLoading: boolean, 
  minimumMs: number = 800,
  pageKey?: string
): boolean {
  const key = pageKey || (typeof window !== 'undefined' ? window.location.pathname : 'default')
  const wasAlreadyLoaded = loadedPages.has(key)
  
  const [showLoading, setShowLoading] = useState(() => {
    if (!isLoading && wasAlreadyLoaded) return false
    if (!isLoading) return false
    return true
  })
  
  const startTimeRef = useRef(Date.now())
  const hasMarkedLoaded = useRef(false)

  useEffect(() => {
    if (!isLoading) {
      if (!hasMarkedLoaded.current) {
        loadedPages.add(key)
        hasMarkedLoaded.current = true
      }
      
      if (wasAlreadyLoaded) {
        setShowLoading(false)
        return
      }
      
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, minimumMs - elapsed)
      
      if (remaining > 0) {
        const timer = setTimeout(() => setShowLoading(false), remaining)
        return () => clearTimeout(timer)
      } else {
        setShowLoading(false)
      }
    }
  }, [isLoading, minimumMs, key, wasAlreadyLoaded])

  return showLoading || isLoading
}

export function clearLoadedPagesCache() {
  loadedPages.clear()
}
