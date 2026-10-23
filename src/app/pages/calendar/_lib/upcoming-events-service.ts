import { BackendAPI } from '@/lib/api-client'
import moment from 'moment'
import { isHQGroup } from '@/config/zones'

export interface UpcomingEvent {
  id: string
  title: string
  description?: string
  date: string
  endDate?: string // Multi-day event end date
  time?: string
  location?: string
  image?: string // Ecard/banner image URL
  type: 'announcement' | 'event' | 'reminder' | 'meeting' | 'rehearsal'
  showInCarousel: boolean
  isGlobal?: boolean // Whether the event is visible to all zones
  createdAt: string
  updatedAt: string
  createdBy?: string
}

// OPTIMIZED: Cache events for 30 minutes
const EVENTS_CACHE_KEY = 'lwsrh-upcoming-events-cache'
const EVENTS_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

interface EventsCache {
  data: UpcomingEvent[]
  timestamp: number
}

function getEventsCache(cacheKey: string): EventsCache | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null
    const data: EventsCache = JSON.parse(cached)
    if (Date.now() - data.timestamp > EVENTS_CACHE_TTL) {
      return null
    }
    return data
  } catch {
    return null
  }
}

function setEventsCache(cacheKey: string, data: UpcomingEvent[]) {
  if (typeof window === 'undefined') return
  try {
    const cache: EventsCache = { data, timestamp: Date.now() }
    localStorage.setItem(cacheKey, JSON.stringify(cache))
  } catch {
    // Ignore storage errors
  }
}

export class UpcomingEventsService {
  /**
   * Get all upcoming events (next 30 days) for a specific zone
   */
  static async getUpcomingEvents(zoneId: string): Promise<UpcomingEvent[]> {
    try {
      if (!zoneId) return []

      const cacheKey = `${EVENTS_CACHE_KEY}_${zoneId}`
      const cached = getEventsCache(cacheKey)
      if (cached) {
        const today = moment()
        const next30Days = moment().add(30, 'days')
        return cached.data.filter(event => {
          const eventDate = moment(event.date)
          return eventDate.isBetween(today, next30Days, 'day', '[]')
        }).sort((a, b) => moment(a.date).diff(moment(b.date)))
      }

      // Fetch from BackendAPI events endpoint
      const res: any = await BackendAPI.events.getAll({ zoneId }).catch(() => ({ data: [] }))
      const allEvents: UpcomingEvent[] = Array.isArray(res) ? res : (res?.data || [])

      if (!allEvents || allEvents.length === 0) {
        return []
      }

      const filteredForZone = allEvents.filter((event: any) => {
        const isTargetZone = event.zoneId === zoneId
        const isGlobal = event.isGlobal === true
        const isBothHQ = isHQGroup(zoneId) && isHQGroup(event.zoneId)
        return isTargetZone || isGlobal || isBothHQ
      })

      setEventsCache(cacheKey, filteredForZone)

      const today = moment()
      const next30Days = moment().add(30, 'days')

      return filteredForZone.filter((event: any) => {
        const eventDate = moment(event.date)
        return eventDate.isBetween(today, next30Days, 'day', '[]')
      }).sort((a: any, b: any) => {
        return moment(a.date).diff(moment(b.date))
      })
    } catch (error) {
      console.error(`Error fetching upcoming events for zone ${zoneId}:`, error)
      return []
    }
  }

  static async getCarouselEvents(zoneId: string): Promise<UpcomingEvent[]> {
    const allEvents = await this.getUpcomingEvents(zoneId)
    return allEvents.filter(event => event.showInCarousel !== false)
  }

  static async createEvent(eventData: Omit<UpcomingEvent, 'id' | 'createdAt' | 'updatedAt'> & { zoneId: string }): Promise<UpcomingEvent> {
    try {
      const cleanedData: Record<string, any> = {
        title: eventData.title,
        date: eventData.date,
        type: eventData.type,
        showInCarousel: eventData.showInCarousel,
        isGlobal: eventData.isGlobal || false,
        zoneId: eventData.zoneId,
        id: `upcoming-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      if (eventData.endDate) cleanedData.endDate = eventData.endDate
      if (eventData.description) cleanedData.description = eventData.description
      if (eventData.time) cleanedData.time = eventData.time
      if (eventData.location) cleanedData.location = eventData.location
      if (eventData.image) cleanedData.image = eventData.image
      if (eventData.createdBy) cleanedData.createdBy = eventData.createdBy

      await BackendAPI.generic.create('upcoming_events', cleanedData)
      return cleanedData as UpcomingEvent
    } catch (error) {
      console.error('Error creating upcoming event:', error)
      throw error
    }
  }

  static async getAllEvents(zoneId: string): Promise<UpcomingEvent[]> {
    return this.getUpcomingEvents(zoneId);
  }

  static async updateEvent(id: string, updates: Partial<UpcomingEvent>, _zoneId?: string): Promise<void> {
    try {
      await BackendAPI.generic.update('upcoming_events', id, {
        ...updates,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error(`Error updating upcoming event ${id}:`, error)
      throw error
    }
  }

  static async deleteEvent(id: string, _zoneId?: string): Promise<void> {
    try {
      await BackendAPI.generic.delete('upcoming_events', id)
    } catch (error) {
      console.error(`Error deleting upcoming event ${id}:`, error)
      throw error
    }
  }
}
