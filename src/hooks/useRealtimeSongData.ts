'use client'

import { useState, useEffect, useCallback } from 'react'
import { PraiseNightSong } from '@/types/supabase'
import { BackendAPI } from '@/lib/api-client'

interface UseRealtimeSongDataProps {
  songId: string | null
  enabled?: boolean
  zoneId?: string | null
}

export function useRealtimeSongData({ songId, enabled = true, zoneId }: UseRealtimeSongDataProps) {
  const [songData, setSongData] = useState<PraiseNightSong | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSongData = useCallback(async () => {
    if (!songId || !enabled) return

    setLoading(true)
    setError(null)

    try {
      const res: any = await BackendAPI.songs.getById(songId)
      setSongData(res?.data || res || null)
    } catch (error) {
      console.error('Error fetching song data:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch song data')
    } finally {
      setLoading(false)
    }
  }, [songId, enabled])

  useEffect(() => {
    if (!songId || !enabled) return
    fetchSongData()

    const unsub = BackendAPI.realtime.subscribe('songs', songId, () => {
      fetchSongData()
    })
    return () => unsub()
  }, [songId, enabled, fetchSongData])

  return {
    songData,
    loading,
    error,
    refreshSongData: fetchSongData
  }
}
