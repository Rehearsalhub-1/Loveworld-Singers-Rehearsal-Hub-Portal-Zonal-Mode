import { useState, useMemo } from 'react'

import { PraiseNight } from '@/types/supabase'

export interface PageSearchResult {
  id: string
  type: 'song' | 'category'
  title: string
  subtitle?: string
  description?: string
  category?: string
  status?: 'heard' | 'unheard'
}

export function usePageSearch(currentPage: PraiseNight | null) {
  const [searchQuery, setSearchQuery] = useState('')

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !currentPage?.songs) return []

    const query = searchQuery.toLowerCase().trim()
    const results: PageSearchResult[] = []

    currentPage.songs.forEach(song => {
      const matchesTitle = (song.title || '').toLowerCase().includes(query)
      const matchesWriter = song.writer?.toLowerCase().includes(query)
      const matchesLeadSinger = song.leadSinger?.toLowerCase().includes(query)
      const matchesConductor = song.conductor?.toLowerCase().includes(query)
      const matchesCategory = (song.category || '').toLowerCase().includes(query)
      const matchesKey = song.key?.toLowerCase().includes(query)
      const matchesLyrics = song.lyrics?.toLowerCase().includes(query)
      const matchesSolfas = song.solfas?.toLowerCase().includes(query)
      const matchesTempo = song.tempo?.toLowerCase().includes(query)

      if (matchesTitle || matchesWriter || matchesLeadSinger || matchesConductor || matchesCategory || matchesKey || matchesLyrics || matchesSolfas || matchesTempo) {
        let matchReason = ''
        if (matchesTitle) matchReason = 'Song Title'
        else if (matchesWriter) matchReason = `Writer: ${song.writer}`
        else if (matchesLeadSinger) matchReason = `Lead Singer: ${song.leadSinger}`
        else if (matchesConductor) matchReason = `Conductor: ${song.conductor}`
        else if (matchesCategory) matchReason = `Category: ${song.category}`
        else if (matchesKey) matchReason = `Key: ${song.key}`
        else if (matchesLyrics) matchReason = 'Lyrics Content'
        else if (matchesSolfas) matchReason = 'Solfas Content'
        else if (matchesTempo) matchReason = `Tempo: ${song.tempo}`

        results.push({
          id: `song-${song.title}-${currentPage.id}`,
          type: 'song',
          title: song.title,
          subtitle: matchReason,
          description: `${song.category || 'General'} • ${song.status}`,
          category: song.category,
          status: song.status
        })
      }
    })

    const categories = [...new Set(currentPage.songs.map(song => song.category))].filter(Boolean) as string[]
    categories.forEach(category => {
      if (category && category.toLowerCase().includes(query)) {
        const songsInCategory = currentPage.songs.filter(song => song.category === category)
        results.push({
          id: `category-${category}-${currentPage.id}`,
          type: 'category',
          title: category,
          subtitle: 'Song Category',
          description: `${songsInCategory.length} songs`,
          category: category
        })
      }
    })

    return results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === query
      const bExact = b.title.toLowerCase() === query
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1

      const typePriority = { song: 0, category: 1 }
      const aPriority = typePriority[a.type]
      const bPriority = typePriority[b.type]
      if (aPriority !== bPriority) return aPriority - bPriority

      return a.title.localeCompare(b.title)
    }).slice(0, 10)
  }, [searchQuery, currentPage])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    hasResults: searchResults.length > 0
  }
}
