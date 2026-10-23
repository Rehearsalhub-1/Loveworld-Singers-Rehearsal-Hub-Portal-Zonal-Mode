import { useEffect, useState, useCallback, useRef } from 'react'
import { PraiseNightSong } from '@/types/supabase'
import { BackendAPI } from '@/lib/api-client'
import { lowDataOptimizer } from '@/utils/low-data-optimizer'

function hasLyricsContent(lyrics?: string | null): boolean {
  if (!lyrics || typeof lyrics !== 'string') return false
  const stripped = lyrics.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  return stripped.length > 0
}

function getStoredSong(id?: string | number): PraiseNightSong | null {
  if (!id || typeof window === 'undefined') return null
  const strId = String(id)

  // 1. Check in-memory lowDataOptimizer
  const mem = lowDataOptimizer.get(`song-detail-${strId}`)
  if (mem && hasLyricsContent(mem.lyrics)) return mem

  // 2. Check persistent localStorage song_cache_ (exact key format from mobile app)
  try {
    const raw = localStorage.getItem(`song_cache_${strId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed) return parsed
    }
  } catch {}

  // 3. Check generic screen cache
  try {
    const raw2 = localStorage.getItem(`lwsrh_screen_cache_song_${strId}`)
    if (raw2) {
      const parsed2 = JSON.parse(raw2)
      if (parsed2?.data) return parsed2.data
    }
  } catch {}

  return mem || null
}

function persistSong(id: string | number, songData: PraiseNightSong) {
  if (!id || typeof window === 'undefined') return
  const strId = String(id)
  lowDataOptimizer.set(`song-detail-${strId}`, songData)
  try {
    localStorage.setItem(`song_cache_${strId}`, JSON.stringify(songData))
  } catch {}
}

/**
 * Hook to fetch and subscribe to realtime updates for a specific song.
 * Caches songs permanently like the mobile app so reopening doesn't refetch or stall.
 */
export function useRealtimeSong(
  zoneId: string | undefined,
  praiseNightId: string | undefined,
  songId: string | undefined,
  initialSong?: PraiseNightSong | null
) {
  const [song, setSong] = useState<PraiseNightSong | null>(() => {
    if (!songId) return null
    const stored = getStoredSong(songId)
    if (stored && hasLyricsContent(stored.lyrics)) {
      return { ...(initialSong || {}), ...stored }
    }
    if (initialSong && hasLyricsContent(initialSong.lyrics)) {
      return initialSong
    }
    if (stored) return { ...(initialSong || {}), ...stored }
    return initialSong || null
  })

  const [loading, setLoading] = useState<boolean>(() => {
    if (!songId) return false
    // If initialSong already has lyrics, we don't need connecting
    if (initialSong && hasLyricsContent(initialSong.lyrics)) return false
    // If cached song has lyrics, instant 0ms load!
    const stored = getStoredSong(songId)
    if (stored && hasLyricsContent(stored.lyrics)) return false
    // Lyrics missing: show Connecting...
    return true
  })

  const [error, setError] = useState<string | null>(null)
  const isFetchingRef = useRef(false)

  // Sync state whenever songId or initialSong changes
  useEffect(() => {
    if (!songId) {
      setSong(null)
      setLoading(false)
      return
    }

    const stored = getStoredSong(songId)
    if (stored && hasLyricsContent(stored.lyrics)) {
      setSong(prev => ({ ...(prev || {}), ...(initialSong || {}), ...stored }))
      setLoading(false)
    } else if (initialSong && hasLyricsContent(initialSong.lyrics)) {
      setSong(initialSong)
      setLoading(false)
      persistSong(songId, initialSong)
    } else {
      setSong(prev => (stored ? { ...(initialSong || {}), ...stored } : (initialSong || prev)))
      setLoading(true)
    }
  }, [songId])

  const fetchSong = useCallback(async (isInitial = false) => {
    if (!songId || isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      setError(null)
      const stored = getStoredSong(songId)
      const cachedHasLyrics = hasLyricsContent(stored?.lyrics) || hasLyricsContent(initialSong?.lyrics)

      // If we already have lyrics from persistent cache, show them at 0ms and revalidate silently in background
      if (cachedHasLyrics && isInitial) {
        setLoading(false)
        try {
          const res: any = await BackendAPI.songs.getById(String(songId))
          const fresh = res?.data || res
          if (fresh) {
            setSong(prev => {
              const merged = { ...(prev || {}), ...fresh }
              persistSong(songId, merged)
              return merged
            })
          }
        } catch {}
        return
      }

      // No lyrics in cache yet: show Connecting... and fetch
      setLoading(true)
      const res: any = await BackendAPI.songs.getById(String(songId))
      const fresh = res?.data || res
      if (fresh) {
        setSong(prev => {
          const merged = { ...(prev || {}), ...(initialSong || {}), ...fresh }
          persistSong(songId, merged)
          return merged
        })
      }
    } catch (err) {
      console.error('Error fetching song lyrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch song')
    } finally {
      isFetchingRef.current = false
      setLoading(false)
    }
  }, [songId, initialSong])

  const refreshSong = useCallback(async () => {
    setLoading(true)
    await fetchSong(false)
  }, [fetchSong])

  useEffect(() => {
    if (!songId) {
      setSong(null)
      setLoading(false)
      return
    }

    fetchSong(true)

    const unsubscribe = BackendAPI.realtime.subscribe('songs', String(songId), (update) => {
      const data = (update as any)?.data || update
      if (data && typeof data === 'object') {
        setSong(prev => {
          const next = { ...(prev || {}), ...data } as PraiseNightSong
          persistSong(songId, next)
          return next
        })
        return
      }
      fetchSong(false)
    })

    return () => {
      unsubscribe()
    }
  }, [songId, fetchSong])

  return {
    song,
    loading,
    error,
    refreshSong
  }
}
