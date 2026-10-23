import { BackendAPI } from '@/lib/api-client'
import { isHQGroup } from '@/config/zones'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay: boolean
  color?: string
  location?: string
  attendees?: string[]
  createdBy: string
  createdByName: string
  zoneId: string
  isGlobal?: boolean // Whether the event is visible to all zones
  type: 'rehearsal' | 'performance' | 'meeting' | 'other'
  isRecurring?: boolean
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    endDate?: Date
  }
  reminders?: {
    type: 'email' | 'notification'
    minutes: number
  }[]
  createdAt: Date
  updatedAt: Date
}

export interface EventAttendee {
  userId: string
  userName: string
  email: string
  status: 'pending' | 'accepted' | 'declined'
  respondedAt?: Date
}

export class CalendarService {
  // Create a new event
  async createEvent(eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const res: any = await BackendAPI.generic.create('calendar_events', {
        ...eventData,
        start: eventData.start.toISOString(),
        end: eventData.end.toISOString(),
        recurringPattern: eventData.recurringPattern ? {
          ...eventData.recurringPattern,
          endDate: eventData.recurringPattern.endDate ? eventData.recurringPattern.endDate.toISOString() : null
        } : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      return res?.data?.id || res?.id || String(Date.now())
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    }
  }

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    try {
      const updateData: any = {
        ...updates,
        updatedAt: new Date().toISOString()
      }
      if (updates.start) updateData.start = updates.start.toISOString()
      if (updates.end) updateData.end = updates.end.toISOString()
      if (updates.recurringPattern?.endDate) {
        updateData.recurringPattern = {
          ...updates.recurringPattern,
          endDate: updates.recurringPattern.endDate.toISOString()
        }
      }
      await BackendAPI.generic.update('calendar_events', eventId, updateData)
    } catch (error) {
      console.error('Error updating event:', error)
      throw error
    }
  }

  // Delete an event
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await BackendAPI.generic.delete('calendar_events', eventId)
    } catch (error) {
      console.error('Error deleting event:', error)
      throw error
    }
  }

  // Get events for a specific zone (Includes global events)
  async getZoneEvents(zoneId: string, userId?: string, userRole?: string): Promise<CalendarEvent[]> {
    try {
      const [resGeneric, resUpcoming]: any = await Promise.all([
        BackendAPI.generic.list('calendar_events', 200).catch(() => ({ data: [] })),
        BackendAPI.events.getAll({ zoneId }).catch(() => ({ data: [] }))
      ])

      const list1 = Array.isArray(resGeneric) ? resGeneric : (resGeneric?.data || [])
      const list2 = Array.isArray(resUpcoming) ? resUpcoming : (resUpcoming?.data || [])
      const merged = [...list1, ...list2]

      const seen = new Set<string>()
      const allEvents: CalendarEvent[] = []

      for (const item of merged) {
        if (!item || !item.id || seen.has(item.id)) continue
        seen.add(item.id)
        allEvents.push(this.parseEvent(item.id, item))
      }

      if (userRole === 'boss') {
        return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime())
      }

      return allEvents.filter(event =>
        event.zoneId === zoneId ||
        event.isGlobal === true ||
        (userId && event.createdBy === userId)
      ).sort((a, b) => a.start.getTime() - b.start.getTime())
    } catch (error) {
      console.error('Error fetching zone events:', error)
      return []
    }
  }

  // Get events for a specific date range
  async getEventsInRange(zoneId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const all = await this.getZoneEvents(zoneId)
    return all.filter(e => e.start >= startDate && e.start <= endDate)
  }

  // Get events created by a specific user
  async getUserEvents(userId: string, zoneId: string): Promise<CalendarEvent[]> {
    const all = await this.getZoneEvents(zoneId)
    return all.filter(e => e.createdBy === userId)
  }

  // Subscribe to real-time events for a zone
  subscribeToZoneEvents(zoneId: string, callback: (events: CalendarEvent[]) => void, userId?: string, userRole?: string): () => void {
    let active = true
    const load = () => {
      if (!active) return
      this.getZoneEvents(zoneId, userId, userRole).then(events => {
        if (active) callback(events)
      }).catch(() => {})
    }

    load()
    // Realtime WebSocket subscription — matches mobile app 'programs' events
    const unsub = BackendAPI.realtime.subscribe('programs', 'all', () => {
      load()
    })

    return () => {
      active = false
      unsub()
    }
  }

  // Add attendee to event
  async addAttendee(eventId: string, attendee: Omit<EventAttendee, 'respondedAt'>): Promise<void> {
    try {
      await BackendAPI.generic.create('event_attendees', {
        eventId,
        ...attendee,
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error adding attendee:', error)
    }
  }

  async updateAttendeeStatus(eventId: string, userId: string, status: EventAttendee['status']): Promise<void> {
    try {
      await BackendAPI.generic.update('event_attendees', `${eventId}_${userId}`, {
        status,
        respondedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating attendee status:', error)
    }
  }

  // Get attendees for an event
  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    try {
      const res: any = await BackendAPI.generic.list('event_attendees', 100, 'eventId', eventId).catch(() => ({ data: [] }))
      const list = Array.isArray(res) ? res : (res?.data || [])
      return list.map((item: any) => ({
        userId: item.userId,
        userName: item.userName || 'Member',
        email: item.email || '',
        status: item.status || 'pending',
        respondedAt: item.respondedAt ? new Date(item.respondedAt) : undefined
      }))
    } catch (error) {
      console.error('Error fetching event attendees:', error)
      return []
    }
  }

  private parseEvent(id: string, data: any): CalendarEvent {
    const startRaw = data.start || data.startDate || data.date || new Date().toISOString()
    const endRaw = data.end || data.endDate || startRaw
    return {
      id: String(id),
      title: data.title || 'Untitled Event',
      description: data.description || '',
      start: new Date(startRaw),
      end: new Date(endRaw),
      allDay: !!data.allDay,
      color: data.color || '#9333EA',
      location: data.location || '',
      attendees: data.attendees || [],
      createdBy: data.createdBy || '',
      createdByName: data.createdByName || '',
      zoneId: data.zoneId || '',
      isGlobal: !!data.isGlobal,
      type: data.type || 'rehearsal',
      isRecurring: !!data.isRecurring,
      recurringPattern: data.recurringPattern ? {
        frequency: data.recurringPattern.frequency || 'weekly',
        interval: data.recurringPattern.interval || 1,
        endDate: data.recurringPattern.endDate ? new Date(data.recurringPattern.endDate) : undefined
      } : undefined,
      reminders: data.reminders || [],
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    }
  }

  // Generate recurring events
  generateRecurringEvents(baseEvent: CalendarEvent, endDate: Date): CalendarEvent[] {
    if (!baseEvent.isRecurring || !baseEvent.recurringPattern) {
      return [baseEvent]
    }

    const events: CalendarEvent[] = []
    const { frequency, interval } = baseEvent.recurringPattern
    const patternEndDate = baseEvent.recurringPattern.endDate || endDate

    let currentStart = new Date(baseEvent.start)
    let currentEnd = new Date(baseEvent.end)
    let eventCount = 0
    const maxEvents = 100

    while (currentStart <= patternEndDate && eventCount < maxEvents) {
      events.push({
        ...baseEvent,
        id: `${baseEvent.id}_${eventCount}`,
        start: new Date(currentStart),
        end: new Date(currentEnd)
      })

      switch (frequency) {
        case 'daily':
          currentStart.setDate(currentStart.getDate() + interval)
          currentEnd.setDate(currentEnd.getDate() + interval)
          break
        case 'weekly':
          currentStart.setDate(currentStart.getDate() + (7 * interval))
          currentEnd.setDate(currentEnd.getDate() + (7 * interval))
          break
        case 'monthly':
          currentStart.setMonth(currentStart.getMonth() + interval)
          currentEnd.setMonth(currentEnd.getMonth() + interval)
          break
      }

      eventCount++
    }

    return events
  }
}