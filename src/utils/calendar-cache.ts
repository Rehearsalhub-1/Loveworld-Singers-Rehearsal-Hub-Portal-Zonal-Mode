// Calendar events caching utility
import { CalendarEvent } from '@/app/pages/calendar/_lib/calendar-service'

const CACHE_PREFIX = 'calendar-cache-'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface CachedData<T> {
  data: T
  timestamp: number
  zoneId: string
}

export class CalendarCache {
  private static getCacheKey(zoneId: string): string {
    return `${CACHE_PREFIX}${zoneId}`
  }

  // Save events to localStorage
  static saveEvents(zoneId: string, events: CalendarEvent[]): void {
    try {
      const cached: CachedData<CalendarEvent[]> = {
        data: events,
        timestamp: Date.now(),
        zoneId
      }
      localStorage.setItem(this.getCacheKey(zoneId), JSON.stringify(cached))
    } catch (error) {
 console.error('Failed to cache calendar events:', error)
    }
  }

  // Load events from localStorage
  static loadEvents(zoneId: string): CalendarEvent[] | null {
    try {
      const cached = localStorage.getItem(this.getCacheKey(zoneId))
      if (!cached) {
        return null
      }

      const parsed: CachedData<CalendarEvent[]> = JSON.parse(cached)
      
            const age = Date.now() - parsed.timestamp
      if (age > CACHE_DURATION) {
        this.clearEvents(zoneId)
        return null
      }

            if (parsed.zoneId !== zoneId) {
        this.clearEvents(zoneId)
        return null
      }

      return parsed.data
    } catch (error) {
 console.error('Failed to load cached calendar events:', error)
      return null
    }
  }

    static clearEvents(zoneId: string): void {
    try {
      localStorage.removeItem(this.getCacheKey(zoneId))
    } catch (error) {
 console.error('Failed to clear cached calendar events:', error)
    }
  }

    static clearAll(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
 console.error('Failed to clear all calendar caches:', error)
    }
  }
}
