import { useEffect, useState, useCallback } from 'react'

import { PraiseNight, PraiseNightSong } from '@/types/supabase'
import { BackendAPI } from '@/lib/api-client'
import { usePraiseNightStore } from '@/stores/praiseNightStore'
import { isHQGroup } from '@/config/zones'
import { sanitizeImageUrl } from '@/utils/image-utils'
import { useAuthStore } from '@/stores/authStore'
import { readCache, writeCache, DEFAULT_TTL_MS } from '@/lib/screen-cache'

import { isHQAdmin } from '@/config/roles'
import { useZoneStore } from '@/stores/zoneStore'

function canUserAccessCategory(profile: any, category: string, zoneId?: string): boolean {
  if (!profile) return true

  if (isHQAdmin(profile)) return true

  switch (category) {
    case 'ongoing':
      return profile.canAccessOngoingRehearsals !== false
    case 'pre-rehearsal':
      return profile.can_access_pre_rehearsal === true || profile.canAccessPreRehearsal === true
    case 'archive':
      return profile.canSeeArchive === true || profile.canAccessArchive === true || profile.can_access_archive === true
    default:
      return true
  }
}

async function fetchBackendPages(zoneId?: string, userId?: string | null, profile?: any): Promise<PraiseNight[]> {
  try {
    if (!zoneId) {
      return []
    }

    const res: any = await BackendAPI.praiseNights.getAll({
      zoneId
    });
    const rawPages: any[] = Array.isArray(res) ? res : (res?.data || []);

    const mapped: PraiseNight[] = rawPages.map((page) => ({
      id: page.id,
      name: page.name || page.title || page.page_title || 'Untitled Page',
      date: page.date || new Date().toISOString(),
      location: page.location || '',
      category: page.category || 'ongoing',
      pageCategory: page.pageCategory || undefined,
      bannerImage: sanitizeImageUrl(page.bannerImage || page.bannerimage, 'banner'),
      categoryOrder: page.categoryOrder || [],
      scope: page.scope || 'zone',
      scopeLabel: page.scopeLabel || '',
      subGroupName: page.subGroupName || '',
      countdown: {
        days: page.countdownDays || page.countdown?.days || page.countdowndays || 0,
        hours: page.countdownHours || page.countdown?.hours || page.countdownhours || 0,
        minutes: page.countdownMinutes || page.countdown?.minutes || page.countdownminutes || 0,
        seconds: page.countdownSeconds || page.countdown?.seconds || page.countdownseconds || 0
      },
      songs: [],
      createdAt: page.createdAt || page.created_at,
      updatedAt: page.updatedAt || page.updated_at
    }))

    // Filter out categories the user doesn't have access to
    if (profile) {
      return mapped.filter(page => canUserAccessCategory(profile, page.category, zoneId))
    }

    return mapped
  } catch (error) {
    console.error('Error fetching backend praise nights:', error)
    return []
  }
}

export function getEffectiveZoneId(zoneId?: string): string {
  if (zoneId) return zoneId
  if (typeof window !== 'undefined') {
    const storeZone = useZoneStore.getState().currentZone?.id
    if (storeZone) return storeZone
    try {
      const raw = localStorage.getItem('lwsrh_current_zone')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.id) return parsed.id
      }
    } catch {}
    try {
      const rawStorage = localStorage.getItem('lwsrh-zone-storage')
      if (rawStorage) {
        const parsed = JSON.parse(rawStorage)
        if (parsed?.state?.currentZone?.id) return parsed.state.currentZone.id
      }
    } catch {}
  }
  return 'zone-001'
}

export function getBestCachedPages(zoneId?: string, userId?: string | null): PraiseNight[] {
  const effectiveId = zoneId || getEffectiveZoneId()
  const store = usePraiseNightStore.getState()
  const userCache = store.getCache(`${effectiveId}-${userId || 'public'}`)?.pages
  if (userCache && userCache.length > 0) return userCache
  const pubCache = store.getCache(`${effectiveId}-public`)?.pages
  if (pubCache && pubCache.length > 0) return pubCache
  const screenCached = readCache<PraiseNight[]>(`praise_night_pages_${effectiveId}`)
  if (screenCached && screenCached.length > 0) return screenCached
  for (const key of Object.keys(store.caches || {})) {
    if (key.startsWith(effectiveId) && store.caches[key]?.pages?.length > 0) {
      return store.caches[key].pages
    }
  }
  // If not found for current zone, search any cache
  for (const key of Object.keys(store.caches || {})) {
    if (store.caches[key]?.pages?.length > 0) {
      return store.caches[key].pages
    }
  }
  return []
}

export function useRealtimeData(zoneId?: string, userId?: string | null) {
  const profile = useAuthStore(state => state.profile)
  const effectiveZoneId = getEffectiveZoneId(zoneId)

  const [pages, setPages] = useState<PraiseNight[]>(() => {
    return getBestCachedPages(effectiveZoneId, userId)
  })

  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getBestCachedPages(effectiveZoneId, userId)
    return cached.length === 0
  })

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const targetZoneId = effectiveZoneId || zoneId || 'zone-001'

    let isMounted = true
    const unsubscribes: (() => void)[] = []

    async function fetchAndCache(timestampOverride?: number) {
      try {
        const backendPages = await fetchBackendPages(targetZoneId, userId, profile)
        if (backendPages && isMounted) {
          setPages(backendPages)
          const cacheKey = `${targetZoneId}-${userId || 'public'}`
          usePraiseNightStore.getState().setPages(cacheKey, backendPages, Date.now(), timestampOverride)
          writeCache(`praise_night_pages_${targetZoneId}`, backendPages)
        }
      } catch (e) {
        console.error('Error in fetchAndCache:', e)
      }
    }

    async function loadInitialData() {
      const safetyTimer = setTimeout(() => {
        if (isMounted) setLoading(false)
      }, 3500)

      try {
        setError(null)
        const cached = getBestCachedPages(targetZoneId, userId)
        const cacheKey = `${targetZoneId}-${userId || 'public'}`
        const cachedStore = usePraiseNightStore.getState().getCache(cacheKey)
        const now = Date.now()

        if (cached && cached.length > 0 && isMounted) {
          setPages(cached)
          setLoading(false)
          clearTimeout(safetyTimer)
          if (cachedStore && (now - cachedStore.lastFetchTime < DEFAULT_TTL_MS)) {
            return
          }
        }

        await fetchAndCache()
      } catch (err) {
        console.error('Failed to load initial data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        clearTimeout(safetyTimer)
        if (isMounted) setLoading(false)
      }
    }

    loadInitialData()

    const unsubPraiseNights = BackendAPI.realtime.subscribe('praise_nights', targetZoneId || 'all', () => fetchAndCache())
    const unsubSongs = BackendAPI.realtime.subscribe('songs', targetZoneId || 'all', () => fetchAndCache())
    const unsubLiveSong = BackendAPI.realtime.subscribe('live_song', 'all', () => fetchAndCache())

    unsubscribes.push(unsubPraiseNights, unsubSongs, unsubLiveSong)

    return () => {
      isMounted = false
      unsubscribes.forEach(unsub => unsub())
    }
  }, [effectiveZoneId, zoneId, userId, profile?.id, profile?.role])

  const getCurrentPage = useCallback((id: number | string): PraiseNight | null => {
    return pages.find(page => page.id === id || page.id === id.toString()) || null
  }, [pages])

  const getCurrentSongs = useCallback(async (pageId: number | string, forceRefresh?: boolean): Promise<PraiseNightSong[]> => {
    const targetZoneId = effectiveZoneId || zoneId
    try {
      const cacheKey = `praise_night_songs_${pageId}_${targetZoneId || 'all'}`;
      if (!forceRefresh) {
        const cachedSongs = readCache<PraiseNightSong[]>(cacheKey) || readCache<PraiseNightSong[]>(`praise_night_songs_${pageId}_all`);
        if (cachedSongs && cachedSongs.length > 0) {
          // Revalidate in background silently
          BackendAPI.songs.praiseNight({ praiseNightId: String(pageId), zoneId: targetZoneId })
            .then((res: any) => {
              const songs = Array.isArray(res) ? res : (res?.data || []);
              if (songs.length > 0) {
                writeCache(cacheKey, songs);
              }
            })
            .catch(() => {});
          return cachedSongs;
        }
      }

      const page = pages.find(p => p.id === pageId || p.id === pageId.toString());
      if (page?.scope === 'subgroup') {
        const res: any = await BackendAPI.subgroups.songs({ rehearsalId: String(pageId) });
        const subgroupSongs = Array.isArray(res) ? res : (res?.data || []);
        const mapped = subgroupSongs.map((s: any) => ({
          ...s,
          rehearsalCount: 0,
          updatedAt: (s.updatedAt as any)?.toISOString?.() || new Date().toISOString(),
          createdAt: (s.createdAt as any)?.toISOString?.() || new Date().toISOString()
        })) as unknown as PraiseNightSong[];
        writeCache(cacheKey, mapped);
        return mapped;
      }
      const res: any = await BackendAPI.songs.praiseNight({ praiseNightId: String(pageId), zoneId: targetZoneId });
      const songs = Array.isArray(res) ? res : (res?.data || []);
      if (songs.length > 0) {
        writeCache(cacheKey, songs);
      }
      return songs;
    } catch (error) {
      console.error(`Error fetching songs for page ${pageId}:`, error);
      const cacheKey = `praise_night_songs_${pageId}_${targetZoneId || 'all'}`;
      const fallbackCached = readCache<PraiseNightSong[]>(cacheKey, 24 * 60 * 60 * 1000) || readCache<PraiseNightSong[]>(`praise_night_songs_${pageId}_all`, 24 * 60 * 60 * 1000);
      if (fallbackCached) return fallbackCached;
      return [];
    }
  }, [effectiveZoneId, zoneId, pages])

  return {
    pages,
    loading,
    error,
    getCurrentPage,
    getCurrentSongs,
    refreshData: async () => {
      try {
        setError(null)

        const cacheKey = `${zoneId}-${userId || 'public'}`
        usePraiseNightStore.getState().updateMetadataTime(cacheKey, 0);

        const updatedPages = await fetchBackendPages(zoneId!, userId, profile)
        setPages(updatedPages)

        if (zoneId) {
          usePraiseNightStore.getState().setPages(cacheKey, updatedPages, Date.now(), Date.now());
        }
      } catch (err) {
        console.error('Failed to refresh data:', err)
        setError(err instanceof Error ? err.message : 'Failed to refresh data')
      }
    }
  }
}
