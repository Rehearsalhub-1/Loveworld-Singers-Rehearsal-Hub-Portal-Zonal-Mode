import { BackendAPI } from '@/lib/api-client'
import { UserProfile } from '@/types/supabase'
import moment from 'moment'

export interface BirthdayUser {
  id: string
  first_name: string
  last_name: string
  birthday: string
  profile_image_url?: string
  age?: number
  isToday: boolean
  zoneId?: string
}

// Cache birthdays for 1 hour to reduce API reads (per zone)
const BIRTHDAY_CACHE_KEY = 'lwsrh-birthday-cache'
const BIRTHDAY_CACHE_TTL = 60 * 60 * 1000 // 1 hour

interface BirthdayCache {
  data: BirthdayUser[]
  timestamp: number
  dateKey: string
  zoneId: string
}

function getBirthdayCache(zoneId: string): BirthdayCache | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(`${BIRTHDAY_CACHE_KEY}-${zoneId}`)
    if (!cached) return null
    const data: BirthdayCache = JSON.parse(cached)
    const today = moment().format('YYYY-MM-DD')
    if (data.dateKey !== today || data.zoneId !== zoneId || Date.now() - data.timestamp > BIRTHDAY_CACHE_TTL) {
      return null
    }
    return data
  } catch {
    return null
  }
}

function setBirthdayCache(zoneId: string, data: BirthdayUser[]) {
  if (typeof window === 'undefined') return
  try {
    const cache: BirthdayCache = {
      data,
      timestamp: Date.now(),
      dateKey: moment().format('YYYY-MM-DD'),
      zoneId
    }
    localStorage.setItem(`${BIRTHDAY_CACHE_KEY}-${zoneId}`, JSON.stringify(cache))
  } catch {
    // Ignore storage errors
  }
}

export class BirthdayService {
  /**
   * Get users with birthdays today and upcoming (next 7 days) for a specific zone
   */
  static async getTodayAndUpcomingBirthdays(zoneId?: string): Promise<BirthdayUser[]> {
    try {
      if (zoneId) {
        const cached = getBirthdayCache(zoneId)
        if (cached) return cached.data
      }

      // Fetch profiles using BackendAPI
      const res: any = await BackendAPI.generic.list('profiles', 500).catch(() => ({ data: [] }))
      const profiles = (Array.isArray(res) ? res : (res?.data || [])) as UserProfile[]

      if (!profiles || profiles.length === 0) {
        return []
      }

      const today = moment()
      const nextWeek = moment().add(7, 'days')

      const birthdayUsers: BirthdayUser[] = profiles
        .filter(profile => {
          if (!profile.birthday) return false
          if (!zoneId) return true
          return profile.zone === zoneId || profile.is_hq_member === true
        })
        .map(profile => {
          const birthday = moment(profile.birthday)
          const birthdayThisYear = moment(profile.birthday).year(today.year())
          const isToday = birthdayThisYear.isSame(today, 'day')

          return {
            id: profile.id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            birthday: profile.birthday || '',
            profile_image_url: (profile.profile_image_url || profile.avatar_url) || undefined,
            isToday,
            zoneId: profile.zone
          }
        })

      if (zoneId) {
        setBirthdayCache(zoneId, birthdayUsers)
      }

      return birthdayUsers
    } catch (error) {
      console.error('Error fetching birthdays:', error)
      return []
    }
  }

  static async getBirthdaysForMonth(month: number, zoneId?: string): Promise<BirthdayUser[]> {
    try {
      const res: any = await BackendAPI.generic.list('profiles', 500).catch(() => ({ data: [] }))
      const profiles = (Array.isArray(res) ? res : (res?.data || [])) as UserProfile[]

      return profiles
        .filter(p => {
          if (!p.birthday) return false
          const bMonth = moment(p.birthday).month() + 1
          if (bMonth !== month) return false
          if (!zoneId) return true
          return p.zone === zoneId || p.is_hq_member === true
        })
        .map(p => ({
          id: p.id,
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          birthday: p.birthday || '',
          profile_image_url: (p.profile_image_url || p.avatar_url) || undefined,
          isToday: moment(p.birthday).isSame(moment(), 'day'),
          zoneId: p.zone
        }))
    } catch (error) {
      console.error('Error fetching month birthdays:', error)
      return []
    }
  }
}
