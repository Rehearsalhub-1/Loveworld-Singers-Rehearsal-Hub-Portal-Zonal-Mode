import { useState, useMemo, useEffect } from 'react'

import { useRealtimeData } from './useRealtimeData'
import { PraiseNightSong } from '@/types/supabase'
import { BackendAPI } from '@/lib/api-client'

export interface HomeSearchResult {
  id: string
  type: 'song' | 'page' | 'category' | 'feature' | 'faq' | 'about'
  title: string
  subtitle?: string
  description?: string
  url: string
  pageId?: string
  category?: string
  status?: 'heard' | 'unheard'
  icon?: string
}

const features = [
  { title: 'Rehearsals', url: '/pages/rehearsals', icon: 'Calendar' },
  { title: 'Profile', url: '/pages/profile', icon: 'User' },
  { title: 'Push Notifications', url: '#', icon: 'Bell' },
  { title: 'Groups', url: '#', icon: 'Users' },
  { title: 'Submit Song', url: '#', icon: 'Music' },
  { title: 'Media', url: '#', icon: 'Play' },
  { title: 'Ministry Calendar', url: '#', icon: 'Calendar' },
  { title: 'Analytics', url: '#', icon: 'BarChart3' },
  { title: 'Customer Support', url: '/pages/support', icon: 'HelpCircle' }
]

const faqItems = [
  { question: 'How do I join a rehearsal?', answer: 'Check the Rehearsals section.' },
  { question: 'Where can I find song lyrics?', answer: 'Access in the AudioLabs section.' },
  { question: 'How do I get support?', answer: 'Use the Support section.' }
]

export function useHomeGlobalSearch(zoneId?: string, enabled: boolean = false) {
  const { pages } = useRealtimeData(zoneId) // Limit is not supported by hook
  const [searchQuery, setSearchQuery] = useState('')
  const [allSongs, setAllSongs] = useState<PraiseNightSong[]>([])
  const [songsLoaded, setSongsLoaded] = useState(false)

  useEffect(() => {
    if (!enabled) return; // Don't reset if just disabled, but do reset on zone change
    if (zoneId) {
      // Only reset if zone changed. 
      // Actually, we should probably keep data until new data loads to avoid flickering if toggling.
    }
  }, [zoneId])

  // Reset when zone changes completely
  useEffect(() => {
    setAllSongs([])
    setSongsLoaded(false)
  }, [zoneId])

  useEffect(() => {
    if (!zoneId || !enabled) return

    const loadAllSongs = async () => {
      try {
        const res: any = await BackendAPI.songs.getAll({ zoneId, limit: 1000 })
        const songs = Array.isArray(res) ? res : (res?.data || [])
        setAllSongs(songs as any[])
        setSongsLoaded(true)
      } catch (error) {
        console.error('Error loading songs for search:', error)
        setSongsLoaded(true)
      }
    }

    if (!songsLoaded) {
      loadAllSongs()
    }
  }, [songsLoaded, zoneId, enabled])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase().trim()
    const results: HomeSearchResult[] = []

    pages.forEach(page => {
      if (page.name.toLowerCase().includes(query)) {
        results.push({
          id: `page-${page.id}`,
          type: 'page',
          title: page.name,
          subtitle: 'Praise Night Event',
          description: `${page.location} • ${page.date}`,
          url: `/pages/praise-night?page=${page.id}`,
          pageId: page.id,
          icon: 'Calendar'
        })
      }
    })

    allSongs.forEach(song => {
      const matches =
        (song.title || '').toLowerCase().includes(query) ||
        song.writer?.toLowerCase().includes(query) ||
        song.leadSinger?.toLowerCase().includes(query) ||
        (song.category || '').toLowerCase().includes(query) ||
        song.lyrics?.toLowerCase().includes(query) ||
        song.solfas?.toLowerCase().includes(query) ||
        song.key?.toLowerCase().includes(query) ||
        song.tempo?.toLowerCase().includes(query)

      if (matches) {
        const songPage = pages.find(p => p.id === song.praiseNightId)
        results.push({
          id: `song-${song.title}-${songPage?.id || 'unknown'}`,
          type: 'song',
          title: song.title,
          subtitle: 'Song',
          description: `${songPage?.name || 'Unknown'} • ${song.category}`,
          url: `/pages/praise-night?page=${songPage?.id}&song=${encodeURIComponent(song.title)}`,
          pageId: songPage?.id,
          category: song.category,
          status: song.status,
          icon: 'Music'
        })
      }
    })

    features.forEach(feature => {
      if (feature.title.toLowerCase().includes(query)) {
        results.push({
          id: `feature-${feature.title}`,
          type: 'feature',
          title: feature.title,
          subtitle: 'App Feature',
          url: feature.url,
          icon: feature.icon
        })
      }
    })

    faqItems.forEach((faq, i) => {
      if (faq.question.toLowerCase().includes(query)) {
        results.push({
          id: `faq-${i}`,
          type: 'faq',
          title: faq.question,
          subtitle: 'FAQ',
          description: faq.answer,
          url: '/home#faq',
          icon: 'HelpCircle'
        })
      }
    })

    return results.slice(0, 15)
  }, [searchQuery, pages, allSongs])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    hasResults: searchResults.length > 0
  }
}
