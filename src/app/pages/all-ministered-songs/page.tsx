'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Search, Music, Play, Pause, Loader2, ArrowLeft, ArrowUpDown, ChevronDown, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { MasterSong, MasterProgram } from '@/types/master-library'
import { BackendAPI } from '@/lib/api-client'
import { useAudio } from '@/contexts/AudioContext'
import { NavigationManager } from '@/utils/navigation'
import { MasterSongDetailSheet } from '@/components/admin/MasterSongDetailSheet'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useZone } from '@/hooks/useZone'
import { isHQGroup, isBossZone } from '@/config/zones'
import CustomLoader from '@/components/CustomLoader'

export default function AllMinisteredSongsPage() {
  const router = useRouter()
  const { currentZone } = useZone()
  const { currentSong, isPlaying, setCurrentSong, togglePlayPause } = useAudio()

  const isHQ = currentZone ? isHQGroup(currentZone.id) : false
  const isBoss = currentZone ? isBossZone(currentZone.id) : false
  const canEdit = isHQ || isBoss

  const [songs, setSongs] = useState<MasterSong[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLeadSinger, setSelectedLeadSinger] = useState<string>('')
  const [isLeadSingerDropdownOpen, setIsLeadSingerDropdownOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedSong, setSelectedSong] = useState<MasterSong | null>(null)
  const [isSongDetailOpen, setIsSongDetailOpen] = useState(false)
  const [programs, setPrograms] = useState<MasterProgram[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<string>('')
  const [isProgramsDropdownOpen, setIsProgramsDropdownOpen] = useState(false)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Load songs from Master Library
  useEffect(() => {
    const loadSongs = async () => {
      setLoading(true)
      try {
        const [songsRes, programListRes]: any[] = await Promise.all([
          BackendAPI.songs.getAll({ limit: 10000 }),
          BackendAPI.generic.list('master_programs')
        ])
        const masterSongs = Array.isArray(songsRes) ? songsRes : (songsRes?.data || [])
        const programList = Array.isArray(programListRes) ? programListRes : (programListRes?.data || [])
        setSongs(masterSongs)
        setPrograms(programList)
        setHasMore(false)
        setTotalCount(masterSongs.length)

      } catch (error) {
        console.error('Error loading master songs:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSongs()
  }, [])

  // Load more songs (rarely needed now)
  const loadMoreSongs = async () => {
    setLoadingMore(false)
    setHasMore(false)
  }

  // Normalize name: remove trailing punctuation and trim
  const normalizeName = (name: string): string => {
    return name
      .trim()
      .replace(/[.,;:!?]+$/, '') // Remove trailing punctuation
      .trim()
  }

  // Lenient Search Normalization: lowercase, no punctuation, single spaces
  const normalizeSearchText = (text: string): string => {
    if (!text) return ''
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove all non-word characters (except spaces)
      .replace(/\s+/g, ' ')    // Normalize multiple spaces
      .trim()
  }

  // Get unique lead singers with normalization (handle case differences, duplicates, and punctuation)
  const leadSingers = useMemo(() => {
    // Map: normalized (lowercase, no punctuation) -> canonical name (first occurrence with proper case)
    const normalizedMap = new Map<string, string>()

    songs.forEach(song => {
      const singer = song.leadSinger?.trim()
      if (!singer) return

      // Normalize: lowercase, remove trailing punctuation
      const cleaned = normalizeName(singer)
      const normalized = cleaned.toLowerCase()

      const isDuet = normalized.includes(' and ') || normalized.includes(' & ')

      if (isDuet) {
        // Duets: normalize case and punctuation, but keep separate from single names
        if (!normalizedMap.has(normalized)) {
          // Use cleaned version (no trailing punctuation) as canonical
          normalizedMap.set(normalized, cleaned)
        }
      } else {
        // Single names: normalize case-insensitively and remove trailing punctuation
        // First occurrence becomes the canonical version
        if (!normalizedMap.has(normalized)) {
          normalizedMap.set(normalized, cleaned)
        }
      }
    })

    // Return unique canonical names, sorted alphabetically
    return Array.from(normalizedMap.values()).sort()
  }, [songs])

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    let filtered = songs

    // Filter by lead singer (case-insensitive, handles duplicates and punctuation)
    if (selectedLeadSinger) {
      filtered = filtered.filter(song => {
        const singer = song.leadSinger?.trim()
        if (!singer) return false

        // Normalize both the song's singer and the selected filter
        const normalizedSinger = normalizeName(singer).toLowerCase()
        const normalizedFilter = normalizeName(selectedLeadSinger).toLowerCase()

        // Match case-insensitively and ignore trailing punctuation
        return normalizedSinger === normalizedFilter
      })
    }

    // Filter by program
    if (selectedProgramId) {
      const selectedProgram = programs.find(p => p.id === selectedProgramId)
      if (selectedProgram) {
        filtered = filtered.filter(song => selectedProgram.songIds?.includes(song.id))
      }
    }

    // Filter by search query (Lenient Matching)
    if (searchQuery.trim()) {
      const query = normalizeSearchText(searchQuery)
      filtered = filtered.filter(song =>
        normalizeSearchText(song.title || '').includes(query) ||
        normalizeSearchText(song.writer || '').includes(query) ||
        normalizeSearchText(song.leadSinger || '').includes(query) ||
        normalizeSearchText(song.category || '').includes(query) ||
        normalizeSearchText(song.lyrics || '').includes(query) ||
        normalizeSearchText(song.solfa || '').includes(query) ||
        normalizeSearchText(song.key || '').includes(query) ||
        normalizeSearchText(song.tempo?.toString() || '').includes(query)
      )
    }

    // Sort alphabetically by title
    filtered = [...filtered].sort((a, b) => {
      const titleA = (a.title || '').toLowerCase()
      const titleB = (b.title || '').toLowerCase()
      return sortOrder === 'asc'
        ? titleA.localeCompare(titleB)
        : titleB.localeCompare(titleA)
    })

    return filtered
  }, [songs, searchQuery, selectedLeadSinger, sortOrder, selectedProgramId, programs])

  // Auto-play Next Song
  useEffect(() => {
    const handleAudioEnded = (e: any) => {
      const endedSong = e.detail?.song;
      if (!endedSong) return;

      // Ensure we are playing from our filtered list
      const currentIndex = filteredSongs.findIndex(s => s.id === endedSong.id);
      if (currentIndex === -1) return; // Song not in list

      // Find the next song with valid audio
      let nextIndex = currentIndex + 1;
      while (nextIndex < filteredSongs.length) {
        const nextSong = filteredSongs[nextIndex];
        const hasAudio = nextSong.audioUrls?.full || nextSong.audioFile;

        if (hasAudio) {
          // Play next song
          const audioUrl = nextSong.audioUrls?.full || nextSong.audioFile;
          const audioSong = {
            id: nextSong.id,
            title: nextSong.title,
            audioFile: audioUrl,
            writer: nextSong.writer,
            leadSinger: nextSong.leadSinger,
          };

          // Switch page if necessary to show the playing song
          const targetPage = Math.floor(nextIndex / itemsPerPage) + 1;
          if (targetPage !== currentPage) {
            setCurrentPage(targetPage);
          }

          setCurrentSong(audioSong as any, true);

          // If the detail sheet is open, update it to the new song
          if (isSongDetailOpen) {
            setSelectedSong(nextSong);
            window.dispatchEvent(new CustomEvent('songDetailOpen'));
          }

          return;
        }
        nextIndex++;
      }
      // Reached the end with no more audio
    };

    window.addEventListener('audioEnded', handleAudioEnded);
    return () => {
      window.removeEventListener('audioEnded', handleAudioEnded);
    };
  }, [filteredSongs, currentPage, setCurrentSong, isSongDetailOpen]);

  // Paginated Songs
  const paginatedSongs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredSongs.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredSongs, currentPage])

  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedLeadSinger, selectedProgramId])


  const handleBack = () => {
    // Robust back navigation with fallback
    NavigationManager.handleBack(router, '/pages/rehearsals')
  }

  const handlePlayClick = (e: React.MouseEvent, song: MasterSong) => {
    e.stopPropagation()
    const audioUrl = song.audioUrls?.full || song.audioFile
    if (!audioUrl) return

    if (currentSong?.id === song.id) {
      togglePlayPause()
    } else {
      const audioSong = {
        id: song.id,
        title: song.title,
        audioFile: audioUrl,
        writer: song.writer,
        leadSinger: song.leadSinger,
      }
      setCurrentSong(audioSong as any, true)
    }
  }

  const handleSongClick = (song: MasterSong) => {
    setSelectedSong(song)
    setIsSongDetailOpen(true)
    window.dispatchEvent(new CustomEvent('songDetailOpen'))
  }

  const handleCloseSongDetail = () => {
    setIsSongDetailOpen(false)
    setSelectedSong(null)
    window.dispatchEvent(new CustomEvent('songDetailClose'))
  }

  // Handle song update from edit
  const handleSongUpdated = (updatedSong: MasterSong) => {
    setSongs(prev => prev.map(s => s.id === updatedSong.id ? updatedSong : s))
    setSelectedSong(updatedSong)
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-slate-50">
      <div className="h-full flex flex-col">
        <ScreenHeader
          title="All Ministered Songs"
          showBackButton={true}
          backPath="/pages/rehearsals"
          rightImageSrc="/logo.png"
          onTitleClick={() => router.push('/home')}
        />

        {/* Search and Filters */}
        <div className="relative z-30 px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {filteredSongs.length} song{filteredSongs.length !== 1 ? 's' : ''}
            </h2>
          </div>


          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by title, writer, or lead singer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200 rounded-xl"
            />
          </div>

          {/* Filters and Sort */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'Z-A' : 'A-Z'}`}
            >
              <Filter className="w-4 h-4 text-purple-600" />
            </button>

            {/* Lead Singer Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLeadSingerDropdownOpen(!isLeadSingerDropdownOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedLeadSinger
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <span>{selectedLeadSinger || 'Lead Singer'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isLeadSingerDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isLeadSingerDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsLeadSingerDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedLeadSinger('')
                        setIsLeadSingerDropdownOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!selectedLeadSinger
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      All Lead Singers
                    </button>
                    {leadSingers.map((singer) => (
                      <button
                        key={singer}
                        onClick={() => {
                          setSelectedLeadSinger(singer)
                          setIsLeadSingerDropdownOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-t border-gray-100 ${selectedLeadSinger === singer
                          ? 'bg-purple-50 text-purple-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        {singer}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* Programs Filter */}
            <div className="relative">
              <button
                onClick={() => setIsProgramsDropdownOpen(!isProgramsDropdownOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedProgramId
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <Music className="w-4 h-4" />
                <span>{selectedProgramId ? programs.find(p => p.id === selectedProgramId)?.name : 'Programs'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isProgramsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProgramsDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProgramsDropdownOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedProgramId('')
                        setIsProgramsDropdownOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!selectedProgramId
                        ? 'bg-violet-50 text-violet-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      All Songs
                    </button>
                    {programs.map(program => (
                      <button
                        key={program.id}
                        onClick={() => {
                          setSelectedProgramId(program.id)
                          setIsProgramsDropdownOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-t border-gray-100 ${selectedProgramId === program.id
                          ? 'bg-violet-50 text-violet-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        {program.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Songs List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <CustomLoader message="Loading songs..." />
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Music className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                {searchQuery ? 'No songs found' : 'No songs available'}
              </h3>
              <p className="text-sm text-gray-400 text-center max-w-xs">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Check back later for new songs'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedSongs.map((song, index) => {
                const isCurrentSong = currentSong?.id === song.id
                const hasAudio = song.audioUrls?.full || song.audioFile
                const songNumber = sortOrder === 'asc'
                  ? (currentPage - 1) * itemsPerPage + index + 1
                  : filteredSongs.length - ((currentPage - 1) * itemsPerPage + index)

                return (
                  <div
                    key={song.id}
                    onClick={() => handleSongClick(song)}
                    className={`
                      flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border transition-all cursor-pointer
                      hover:bg-gray-50 active:scale-[0.99]
                      ${isCurrentSong ? 'border-purple-400 bg-purple-50/50' : 'border-gray-100'}
                    `}
                  >
                    {/* Compact Icon / Number */}
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${isCurrentSong
                        ? 'bg-purple-600'
                        : 'bg-gradient-to-br from-violet-500 to-purple-600'
                      }
                    `}>
                      {isCurrentSong && isPlaying ? (
                        <div className="flex gap-0.5">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="w-0.5 bg-white rounded-full animate-pulse"
                              style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.1}s` }}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-white font-bold text-sm">{songNumber}</span>
                      )}
                    </div>

                    {/* Song Info - Compact */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-sm truncate ${isCurrentSong ? 'text-purple-700' : 'text-gray-900'}`}>
                        {song.title}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {song.writer || 'Unknown writer'}
                        {song.key && ` • ${song.key}`}
                      </p>
                    </div>

                    {/* Play Button */}
                    <button
                      onClick={(e) => handlePlayClick(e, song)}
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                        ${hasAudio
                          ? isCurrentSong
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        }
                      `}
                      disabled={!hasAudio}
                    >
                      {isCurrentSong && isPlaying ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                      )}
                    </button>
                  </div>
                )
              })}

              {/* Numbered Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-4 pt-8 pb-12">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 bg-white disabled:opacity-50 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Show current page and total */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // Logic to show a window of pages around current page
                        let pageNum = i + 1
                        if (totalPages > 5) {
                          if (currentPage > 3) {
                            pageNum = currentPage - 2 + i
                            if (pageNum > totalPages) pageNum = totalPages - (4 - i)
                          }
                        }

                        if (pageNum > totalPages) return null

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${currentPage === pageNum
                              ? 'bg-purple-600 text-white shadow-md scale-105'
                              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 bg-white disabled:opacity-50 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 font-medium">
                    Page <span className="text-purple-600">{currentPage}</span> of {totalPages}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Song Detail Sheet */}
      {selectedSong && (
        <MasterSongDetailSheet
          song={selectedSong}
          isOpen={isSongDetailOpen}
          onClose={handleCloseSongDetail}
          canEdit={canEdit}
          onSongUpdated={handleSongUpdated}
          songs={filteredSongs}
          onSongChange={(newSong) => {
            setSelectedSong(newSong);
          }}
        />
      )}
    </div>
  )
}
