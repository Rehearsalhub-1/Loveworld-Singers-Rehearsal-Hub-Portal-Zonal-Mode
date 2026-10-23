'use client'

import { useState, useEffect, useCallback } from 'react'
import { BackendAPI } from '@/lib/api-client'

interface Comment {
  id: string
  author?: string
  content: string
  date: string
  type: 'comment' | 'solfa' | 'lyrics'
}

interface UseRealtimeCommentsProps {
  songId: string | null
  enabled?: boolean
}

export function useRealtimeComments({ songId, enabled = true }: UseRealtimeCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    if (!songId || !enabled) return

    setLoading(true)
    setError(null)

    try {
      const song = await BackendAPI.songs.getById(songId)
      if (song && Array.isArray(song.comments)) {
        setComments(
          song.comments.map((c: any, idx: number) => ({
            id: c.id || `c-${idx}`,
            author: c.author || '',
            content: c.text || c.comment || c.content || (typeof c === 'string' ? c : ''),
            date: c.date || c.createdAt || new Date().toISOString(),
            type: c.type || 'comment'
          }))
        )
      } else {
        setComments([])
      }
    } catch (err: any) {
      console.error('Error fetching song comments:', err)
      setError(err?.message || 'Failed to fetch comments')
    } finally {
      setLoading(false)
    }
  }, [songId, enabled])

  useEffect(() => {
    if (!songId || !enabled) return
    fetchComments()
  }, [songId, enabled, fetchComments])

  return {
    comments,
    loading,
    error,
    refreshComments: fetchComments
  }
}
