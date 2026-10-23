'use client';

import { create } from 'zustand'
import { PraiseNight, PraiseNightSong } from '@/types/supabase'
import { BackendAPI } from '@/lib/api-client'
import { sanitizeImageUrl } from '@/utils/image-utils'

interface AdminState {
  pages: PraiseNight[]
  loading: boolean
  error: string | null
  currentZoneId?: string
  songsCache: Record<string, PraiseNightSong[]>
  lastFetchTime: number

  refreshData: (silent?: boolean) => Promise<void>
  getCurrentPage: (id: string) => PraiseNight | null
  getCurrentSongs: (pageId: string, forceRefresh?: boolean) => Promise<PraiseNightSong[]>
  setZoneId: (zoneId: string) => void
}

const CACHE_DURATION = 30000

async function fetchAdminData(zoneId?: string): Promise<PraiseNight[]> {
  try {
    const params = zoneId ? { zoneId } : undefined
    const [pagesRes, songsRes]: any = await Promise.all([
      BackendAPI.praiseNights.getAll(params).catch(() => []),
      BackendAPI.songs.getAll(params).catch(() => [])
    ])

    const pages = Array.isArray(pagesRes) ? pagesRes : (pagesRes?.data || [])
    const allZoneSongs = Array.isArray(songsRes) ? songsRes : (songsRes?.data || [])

    if (pages.length === 0) return []

    return pages.map((page: any) => ({
      id: page.id,
      name: page.name || page.title || 'Untitled Page',
      date: page.date || new Date().toISOString(),
      location: page.location || '',
      category: page.category || 'ongoing',
      pageCategory: page.pageCategory || undefined,
      bannerImage: sanitizeImageUrl(page.bannerImage, 'banner'),
      categoryOrder: page.categoryOrder || [],
      songCount: allZoneSongs.filter((s: any) => {
        const songPageId = s.praiseNightId || s.praisenightid || s.praisenight_id || s.pageId
        if (!songPageId) return false
        return songPageId.toString() === page.id.toString()
      }).length,
      countdown: {
        days: page.countdownDays || page.countdown?.days || 0,
        hours: page.countdownHours || page.countdown?.hours || 0,
        minutes: page.countdownMinutes || page.countdown?.minutes || 0,
        seconds: page.countdownSeconds || page.countdown?.seconds || 0
      },
      songs: []
    }))
  } catch (error) {
    console.error('Admin: Error fetching data:', error)
    throw error
  }
}

async function fetchPageSongs(pageId: string, zoneId?: string): Promise<PraiseNightSong[]> {
  try {
    const res: any = await BackendAPI.songs.praiseNight({ praiseNightId: pageId, zoneId })
    return Array.isArray(res) ? res : (res?.data || [])
  } catch (error) {
    console.error(`Error fetching songs for page ${pageId}:`, error)
    return []
  }
}

export const useAdminData = create<AdminState>((set, get) => ({
  pages: [],
  loading: true,
  error: null,
  currentZoneId: undefined,
  songsCache: {},
  lastFetchTime: 0,

  refreshData: async (silent = false) => {
    const { currentZoneId, pages } = get()
    
    if (!silent && (Date.now() - get().lastFetchTime) < CACHE_DURATION && pages.length > 0) {
      return;
    }

    if (!silent && pages.length === 0) set({ loading: true })

    try {
      set({ error: null })
      const freshPages = await fetchAdminData(currentZoneId)
      set({ 
        pages: freshPages, 
        lastFetchTime: Date.now(),
        error: null,
        loading: false
      })
    } catch (err: any) {
      console.warn('Admin: Backend unreachable or returned error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to load data'
      if (get().pages.length === 0) {
        set({ error: errorMsg, loading: false })
      } else {
        set({ loading: false })
      }
    }
  },

  getCurrentPage: (id: string) => {
    return get().pages.find(page => page.id === id) || null
  },

  getCurrentSongs: async (pageId: string, forceRefresh = false) => {
    const { songsCache, currentZoneId } = get()
    
    if (!forceRefresh && songsCache[pageId]) {
      return songsCache[pageId]
    }

    const songs = await fetchPageSongs(pageId, currentZoneId)
    set((state) => ({
      songsCache: { ...state.songsCache, [pageId]: songs }
    }))
    return songs
  },

  setZoneId: (zoneId: string) => {
    const { currentZoneId } = get()
    if (currentZoneId !== zoneId) {
      set({ currentZoneId: zoneId, pages: [], lastFetchTime: 0, songsCache: {}, loading: true })
      get().refreshData()
    }
  }
}))
