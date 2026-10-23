"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, BookOpen, Music, Users, Clock, Play, Pause, Music2, ChevronDown, ChevronUp, RefreshCw, Loader2, MoreVertical } from "lucide-react";
import { PraiseNightSong, HistoryEntry } from "@/types/supabase";
import { useAudio } from "@/contexts/AudioContext";
import { useZone } from "@/hooks/useZone";
import { isHQGroup } from "@/config/zones";
import { useRealtimeComments } from "@/hooks/useRealtimeComments";
import { useRealtimeSong } from "@/hooks/useRealtimeSong";
import { NavigationManager } from "@/utils/navigation";
import { formatTime } from "@/utils/string-utils";

// Modular Components
import { SongLyrics } from "./song-detail/SongLyrics";
import { SongSolfas } from "./song-detail/SongSolfas";
import { SongComments } from "./song-detail/SongComments";
import { SongHistory } from "./song-detail/SongHistory";
import { SongAudioPlayer } from "./song-detail/SongAudioPlayer";
import { SongDetailHeader } from "./song-detail/SongDetailHeader";
import { SongDetailTabsContent } from "./song-detail/SongDetailTabsContent";
import { LyricsCastMode } from "./song-detail/LyricsCastMode";

interface SongDetailModalProps {
  selectedSong: PraiseNightSong | null;
  isOpen: boolean;
  onClose: () => void;
  onSongChange?: (song: PraiseNightSong) => void;
  currentFilter?: 'heard' | 'unheard'; // Add current filter prop
  songs?: PraiseNightSong[]; // Add songs prop
  activeCategory?: string; // Add active category prop
  isSubGroup?: boolean;
}

export default function SongDetailModal({ selectedSong, isOpen, onClose, onSongChange, currentFilter = 'heard', songs = [], activeCategory = '', isSubGroup = false }: SongDetailModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'lyrics' | 'solfas' | 'comments' | 'history' | 'notation'>('lyrics');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  const [activeHistoryTab, setActiveHistoryTab] = useState<'lyrics' | 'audio' | 'solfas' | 'comments' | 'metadata' | 'notation'>('lyrics');
  const [isRepeating, setIsRepeating] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [categorySongs, setCategorySongs] = useState<PraiseNightSong[]>([]);
  
  const isNavigatingRef = useRef(false);
  const [isFullscreenLyrics, setIsFullscreenLyrics] = useState(false);
  const [isFullscreenComments, setIsFullscreenComments] = useState(false);
  const [isFullscreenSolfas, setIsFullscreenSolfas] = useState(false);
  const [isNavigatingToAudioLab, setIsNavigatingToAudioLab] = useState(false);
  const [isCastModeOpen, setIsCastModeOpen] = useState(false);

  const { currentZone } = useZone();
  const zoneColor = currentZone?.themeColor || '#9333EA';

  const darkenColor = (color: string, percent: number) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  const getCommentLabel = () => {
    if (isSubGroup) return "Sub-Group Lead";
    return isHQGroup(currentZone?.id) ? "Pastor" : "Coordinator";
  };

  const toggleFullscreenLyrics = () => setIsFullscreenLyrics(!isFullscreenLyrics);
  const toggleFullscreenComments = () => setIsFullscreenComments(!isFullscreenComments);
  const toggleFullscreenSolfas = () => setIsFullscreenSolfas(!isFullscreenSolfas);

  const [historyAudioStates, setHistoryAudioStates] = useState<{ [key: string]: { isPlaying: boolean, currentTime: number, duration: number } }>({});
  const historyAudioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const [mainPlayerWasPlaying, setMainPlayerWasPlaying] = useState(false);

  const [expandedHistoryEntries, setExpandedHistoryEntries] = useState<Set<string>>(new Set());
  const toggleHistoryEntry = (entryId: string) => {
    setExpandedHistoryEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) newSet.delete(entryId);
      else newSet.add(entryId);
      return newSet;
    });
  };

  const [historyEntries] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory] = useState(false);
  const loadHistoryEntries = async () => {};

  const { currentSong, isPlaying, currentTime, duration, isLoading, hasError, togglePlayPause, audioRef, setCurrentSong, setCurrentTime: setCurrentTimeManual } = useAudio();
  const currentSongData = selectedSong;

  // Set the current song when modal opens (only if it's a different song)
  // BUT skip if we're in the middle of an intentional navigation (skip/autoAdvance)
  useEffect(() => {
    if (selectedSong && isOpen) {
      // If we're navigating internally, don't override the song
      if (isNavigatingRef.current) {
        isNavigatingRef.current = false;
        return;
      }

      // Only set the song if it's different from the current one
      // This prevents restarting the same song when opening the modal
      if (currentSong?.id !== selectedSong.id) {
        setCurrentSong(selectedSong, false);
      }
    }
  }, [selectedSong?.title, isOpen, currentSong?.id]);

  // Load songs from the same category AND current filter, find current song index
  useEffect(() => {
    if (selectedSong) {
      const songsInCategory = songs.filter(song => {
        // We ignore status filter for skipping within category to match "like before" behavior
        // const matchesStatus = song.status === currentFilter;
        
        // Match category using the same logic as page.tsx
        let matchesCategory = false;
        if (activeCategory && activeCategory.toLowerCase() !== 'ongoing' && activeCategory.toLowerCase() !== 'all') {
          if (song.categories && Array.isArray(song.categories) && song.categories.length > 0) {
            matchesCategory = song.categories.some((cat: string) => cat.trim() === activeCategory.trim());
          } else {
            matchesCategory = (song.category || '').trim() === activeCategory.trim();
          }
        } else {
          // If no specific activeCategory provided, fall back to matching selectedSong's own category
          // This keeps skipping within the same category even in "Ongoing" view
          const targetCat = selectedSong.category || (selectedSong.categories && selectedSong.categories[0]);
          if (targetCat) {
            if (song.categories && Array.isArray(song.categories) && song.categories.length > 0) {
              matchesCategory = song.categories.some((cat: string) => cat.trim() === targetCat.trim());
            } else {
              matchesCategory = (song.category || '').trim() === targetCat.trim();
            }
          } else {
            matchesCategory = true; // Fallback to all songs if category is totally missing
          }
        }
        
        return matchesCategory;
      });
      
      setCategorySongs(songsInCategory);

      const index = songsInCategory.findIndex(song => song.id === selectedSong.id || song.title === selectedSong.title);
      setCurrentSongIndex(index >= 0 ? index : 0);
    }
  }, [selectedSong, currentFilter, songs, activeCategory]);

  // Handle audio ended event for repeat functionality and auto-skip
  useEffect(() => {
    const handleAudioEnded = (event: CustomEvent) => {

      const isCurrentSong = event.detail.song?.title === currentSongData?.title ||
        event.detail.song?.id === currentSongData?.id;

      if (isRepeating && isCurrentSong) {
        // Restart the current song
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch((error) => {
 console.error('Error repeating song:', error);
          });
        }
      } else if (!isRepeating && isCurrentSong) {
        // Auto-skip to next song when not repeating
        if (currentSongIndex < categorySongs.length - 1 && categorySongs.length > 0) {
          // Go to next song
          const nextSong = categorySongs[currentSongIndex + 1];
          if (nextSong && onSongChange) {
            isNavigatingRef.current = true;
            setCurrentSongIndex(currentSongIndex + 1);
            onSongChange(nextSong);
            // Set the new song in audio context and auto-play
            setCurrentSong(nextSong, true);
          }
        } else {
          // No more songs, just stop
          if (audioRef.current) {
            audioRef.current.pause();
          }
        }
      }
    };

    window.addEventListener('audioEnded', handleAudioEnded as EventListener);
    return () => {
      window.removeEventListener('audioEnded', handleAudioEnded as EventListener);
    };
  }, [isRepeating, currentSongData?.title, currentSongIndex, categorySongs, onSongChange, setCurrentSong]);

  const handlePrevious = () => {

    if (currentSongIndex > 0 && categorySongs.length > 0) {
      // Go to previous song
      const prevSong = categorySongs[currentSongIndex - 1];
      if (prevSong && onSongChange) {
        isNavigatingRef.current = true;
        setCurrentSongIndex(currentSongIndex - 1);
        onSongChange(prevSong);
        // Set the new song in audio context and auto-play
        setCurrentSong(prevSong, true);
      }
    } else if (audioRef.current && duration > 0) {
      // If at first song or no songs, skip back 10 seconds (restored fallback)
      const newTime = Math.max(0, audioRef.current.currentTime - 10);
      setCurrentTimeManual(newTime);
    }
  };

  const handleNext = () => {

    if (currentSongIndex < categorySongs.length - 1 && categorySongs.length > 0) {
      // Go to next song
      const nextSong = categorySongs[currentSongIndex + 1];
      if (nextSong && onSongChange) {
        isNavigatingRef.current = true;
        setCurrentSongIndex(currentSongIndex + 1);
        onSongChange(nextSong);
        // Set the new song in audio context and auto-play
        setCurrentSong(nextSong, true);
      }
    } else if (audioRef.current && duration > 0) {
      // If at last song or no songs, skip forward 10 seconds (restored fallback)
      const newTime = Math.min(duration, audioRef.current.currentTime + 10);
      setCurrentTimeManual(newTime);
    }
  };

  const toggleRepeat = () => {
    const newRepeatState = !isRepeating;
    setIsRepeating(newRepeatState);
  };

  const handleMusicPage = () => {
    // Navigate to AudioLab library with song title to auto-expand
    if (currentSongData?.title) {
      setIsNavigatingToAudioLab(true);

      // We add a small delay to ensure the user sees the spinner 
      // and to let any pending state updates settle
      setTimeout(() => {
        // Use encodeURIComponent to handle song title
        // Add program=ongoing so LibraryView knows to switch tabs
        const targetId = currentSongData.title;
        router.push(`/pages/audiolab?view=library&program=ongoing&song=${encodeURIComponent(targetId)}`);

        // Push depth since we are navigating deeper
        NavigationManager.push();

        // IMPORTANT: We do NOT call onClose() here.
        // Calling onClose() triggers a router.back() in many layouts (like PraiseNightPage),
        // which can cancel the forward navigation to AudioLab.
        // The page transition will naturally unmount this modal.
      }, 500);
    }
  };


  // History audio player functions
  const handleHistoryAudioPlayPause = (audioId: string) => {
    const historyAudioRef = historyAudioRefs.current[audioId];
    if (!historyAudioRef) return;

    // Pause all other history audios
    Object.keys(historyAudioRefs.current).forEach(id => {
      if (id !== audioId && historyAudioRefs.current[id]) {
        historyAudioRefs.current[id]!.pause();
        setHistoryAudioStates(prev => ({
          ...prev,
          [id]: { ...prev[id], isPlaying: false }
        }));
      }
    });

    if (historyAudioStates[audioId]?.isPlaying) {
      // Pause current history audio
      historyAudioRef.pause();
      setHistoryAudioStates(prev => ({
        ...prev,
        [audioId]: { ...prev[audioId], isPlaying: false }
      }));

      // Resume main player if it was playing before
      if (mainPlayerWasPlaying) {
        togglePlayPause();
        setMainPlayerWasPlaying(false);
      }
    } else {
      // Play current history audio - pause main player if it's playing
      if (isPlaying) {
        setMainPlayerWasPlaying(true);
        togglePlayPause(); // This will pause the main player
      }

      historyAudioRef.play(); // Play the history audio element, not the main one
      setHistoryAudioStates(prev => ({
        ...prev,
        [audioId]: { ...prev[audioId], isPlaying: true }
      }));
    }
  };

  const handleHistoryAudioTimeUpdate = (audioId: string) => {
    const audioElement = historyAudioRefs.current[audioId];
    if (audioElement) {
      setHistoryAudioStates(prev => ({
        ...prev,
        [audioId]: { ...prev[audioId], currentTime: audioElement.currentTime }
      }));
    }
  };

  const handleHistoryAudioLoadedMetadata = (audioId: string) => {
    const audioElement = historyAudioRefs.current[audioId];
    if (audioElement) {
      setHistoryAudioStates(prev => ({
        ...prev,
        [audioId]: { ...prev[audioId], duration: audioElement.duration }
      }));
    }
  };

  const handleHistoryAudioEnded = (audioId: string) => {
    setHistoryAudioStates(prev => ({
      ...prev,
      [audioId]: { ...prev[audioId], isPlaying: false, currentTime: 0 }
    }));

    // Resume main player if it was playing before
    if (mainPlayerWasPlaying) {
      togglePlayPause();
      setMainPlayerWasPlaying(false);
    }
  };

  const formatDateTime = (dateInput: any) => {
    let date: Date;

    // Handle different date formats
    if (dateInput && typeof dateInput === 'object') {
      // Timestamp object
      if (dateInput.toDate && typeof dateInput.toDate === 'function') {
        date = dateInput.toDate();
      }
      // Timestamp with seconds/nanoseconds
      else if (dateInput.seconds) {
        date = new Date(dateInput.seconds * 1000);
      }
      // Regular Date object
      else if (dateInput instanceof Date) {
        date = dateInput;
      }
      // ISO string or other format
      else {
        date = new Date(dateInput);
      }
    }
    // String or number
    else if (dateInput) {
      date = new Date(dateInput);
    }
    // Fallback to current date
    else {
      date = new Date();
    }

    if (isNaN(date.getTime())) {
      return { date: 'Invalid Date', time: '' };
    }

    return {
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  };

  const { comments: realtimeComments } = useRealtimeComments({
    songId: currentSongData?.id?.toString() || null,
    enabled: isOpen && activeHistoryTab === 'comments'
  });

  const { song: realtimeSongData, loading: realtimeSongLoading } = useRealtimeSong(
    currentZone?.id || undefined,
    currentSongData?.praiseNightId || undefined,
    currentSongData?.id?.toString() || undefined,
    currentSongData
  );

  const displayedSongData = useMemo(() => {
    if (!realtimeSongData) return currentSongData;
    if (!currentSongData) return realtimeSongData;
    return {
      ...currentSongData,
      ...realtimeSongData,
      lyrics: (realtimeSongData.lyrics && realtimeSongData.lyrics.trim().length > 0)
        ? realtimeSongData.lyrics
        : (currentSongData.lyrics || ''),
    };
  }, [realtimeSongData, currentSongData]);

  const [isDragging, setIsDragging] = useState(false);
  const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);

  const seekToTime = (newTime: number) => {
    if (audioRef.current && duration > 0) {
      const clampedTime = Math.max(0, Math.min(duration, newTime));

      // Ensure the audio is loaded before seeking
      if (audioRef.current.readyState >= 2) {
        setCurrentTimeManual(clampedTime);
      } else {
        // Wait for audio to be ready then seek
        const handleCanPlay = () => {
          if (audioRef.current) {
            setCurrentTimeManual(clampedTime);
            audioRef.current.removeEventListener('canplay', handleCanPlay);
          }
        };
        audioRef.current.addEventListener('canplay', handleCanPlay);
      }
    }
  };

  // 10-second skip functions
  const skipBackward10 = () => {
    if (audioRef.current && duration > 0) {
      const newTime = Math.max(0, currentTime - 10);
      seekToTime(newTime);
    }
  };

  const skipForward10 = () => {
    if (audioRef.current && duration > 0) {
      const newTime = Math.min(duration, currentTime + 10);
      seekToTime(newTime);
    }
  };

  const getTimeFromMouseEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    return percentage * duration;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration > 0) {
      const newTime = getTimeFromMouseEvent(e);
      seekToTime(newTime);
    }
  };

  const dragStartPos = useRef<{ x: number; time: number } | null>(null);

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Record where the drag started — we'll only enter "dragging" mode
    // once the mouse actually moves, so simple clicks still work.
    dragStartPos.current = { x: e.clientX, time: Date.now() };
    setWasPlayingBeforeDrag(isPlaying);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragStartPos.current && audioRef.current && duration > 0) {
      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      
      // Only start dragging after 3px of movement (prevents accidental drags)
      if (!isDragging && dx > 3) {
        setIsDragging(true);
        // Pause during drag for smoother seeking
        if (isPlaying && audioRef.current) {
          audioRef.current.pause();
        }
      }

      if (isDragging) {
        const newTime = getTimeFromMouseEvent(e);
        seekToTime(newTime);
      }
    }
  };

  const handleProgressMouseUp = () => {
    dragStartPos.current = null;
    if (isDragging) {
      setIsDragging(false);
      if (wasPlayingBeforeDrag && audioRef.current) {
        audioRef.current.play().catch(error => {
          console.error('Error resuming after drag:', error);
        });
      }
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragStartPos.current && audioRef.current && duration > 0) {
        const dx = Math.abs(e.clientX - dragStartPos.current.x);
        if (!isDragging && dx > 3) {
          setIsDragging(true);
          if (wasPlayingBeforeDrag && audioRef.current) {
            audioRef.current.pause();
          }
        }

        if (isDragging) {
          const progressBar = document.querySelector('.progress-bar') as HTMLElement;
          if (progressBar) {
            const rect = progressBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, clickX / rect.width));
            const newTime = percentage * duration;
            seekToTime(newTime);
          }
        }
      }
    };

    const handleGlobalMouseUp = () => {
      dragStartPos.current = null;
      if (isDragging) {
        setIsDragging(false);
        if (wasPlayingBeforeDrag && audioRef.current) {
          audioRef.current.play().catch(error => {
            console.error('Error resuming after drag:', error);
          });
        }
      }
    };

    if (dragStartPos.current || isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, duration, wasPlayingBeforeDrag]);

  if (!isOpen || !selectedSong) return null;

  return (
    <>
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .bg-music-doodle {
          background-color: #ffffff;
          background-image: url("data:image/svg+xml,%3Csvg width='250' height='250' viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23D946EF' fill-opacity='0.06'%3E%3C!-- Official IoMic Path --%3E%3Cpath d='M110 50c1.66 0 3-1.34 3-3V35c0-1.66-1.34-3-3-3s-3 1.34-3 3v12c0 1.66 1.34 3 3 3zM115.3 41c0 2.54-2.04 4.63-4.57 4.93V49h-1.46v-3.07a4.996 4.996 0 01-4.57-4.93h-1.48c0 3.19 2.39 5.8 5.48 6.4v3.13h-2.19c-.43 0-.78.35-.78.78s.35.78.78.78h5.83c.43 0 .78-.35.78-.78s-.35-.78-.78-.78h-2.19v-3.13c3.09-.6 5.48-3.21 5.48-6.4h-1.48z' transform='scale(1.2)'/%3E%3C!-- Official IoHeadset Path --%3E%3Cpath d='M50 20c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8h-4v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z' transform='scale(1.3) translate(15, 0)'/%3E%3C!-- Official IoMusicalNotes Path --%3E%3Cpath d='M180 30l-10 2.45v10.55c-.5-.15-1-.24-1.5-.24-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-11.4l8-1.96V37.5c-.5-.15-1-.24-1.5-.24-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-11z' transform='scale(1.3)'/%3E%3C!-- Official GiGuitar Path --%3E%3Cpath d='M30 150c0 5 4 9 9 9s9-4 9-9c0-6-4.5-8-4.5-13 0-4 1.5-6 1.5-6h-12s1.5 2 1.5 6c0 5-4.5 7-4.5 13z' transform='scale(1.2) rotate(15, 39, 150)'/%3E%3C!-- Official GiPianoKeys Path --%3E%3Cpath d='M160 140h28v20h-28z M164 140v12h2v-12z M168 140v12h2v-12z M174 140v12h2v-12z M178 140v12h2v-12z' transform='scale(1.4) rotate(10, 174, 150)'/%3E%3C/g%3E%3C/svg%3E");
          background-repeat: repeat;
        }
      `}</style>
      <div className="fixed inset-0 bg-white bg-music-doodle z-[1000] flex flex-col">
        {/* Responsive Container */}
        <div className="mx-auto max-w-2xl w-full h-full flex flex-col">

          {/* Fullscreen Lyrics View */}
          {isFullscreenLyrics && activeTab === 'lyrics' ? (
            <SongLyrics 
              isFullscreen={true}
              onToggleFullscreen={toggleFullscreenLyrics}
              lyrics={displayedSongData?.lyrics}
              title={displayedSongData?.title || currentSongData?.title}
              writer={displayedSongData?.writer || currentSongData?.writer}
              zoneColor={zoneColor}
              isLoading={realtimeSongLoading}
              onOpenCastMode={() => setIsCastModeOpen(true)}
            />
          ) : isFullscreenComments && activeTab === 'comments' ? (
            <SongComments 
              isFullscreen={true}
              onToggleFullscreen={toggleFullscreenComments}
              comments={displayedSongData?.comments || displayedSongData?.notes || (displayedSongData as any)?.coordinatorComment}
              zoneColor={zoneColor}
              title={currentSongData?.title}
            />
          ) : isFullscreenSolfas && activeTab === 'solfas' ? (
            <SongSolfas 
              isFullscreen={true}
              onToggleFullscreen={toggleFullscreenSolfas}
              solfas={currentSongData?.solfas}
              title={currentSongData?.title}
            />
          ) : (
            <>
              {/* Normal Modal Content */}
              <SongDetailHeader
                onClose={onClose}
                displayedSongData={displayedSongData}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isSubGroup={isSubGroup}
                showMoreMenu={showMoreMenu}
                setShowMoreMenu={setShowMoreMenu}
                moreMenuRef={moreMenuRef}
              />

              <SongDetailTabsContent
                activeTab={activeTab}
                displayedSongData={displayedSongData}
                toggleFullscreenLyrics={toggleFullscreenLyrics}
                toggleFullscreenSolfas={toggleFullscreenSolfas}
                toggleFullscreenComments={toggleFullscreenComments}
                zoneColor={zoneColor}
                commentLabel={getCommentLabel()}
                isLoading={realtimeSongLoading}
                onOpenCastMode={() => setIsCastModeOpen(true)}
                historyProps={{
                  activeHistoryTab,
                  setActiveHistoryTab,
                  isLoadingHistory,
                  historyEntries,
                  loadHistoryEntries,
                  expandedHistoryEntries,
                  toggleHistoryEntry,
                  darkenColor,
                  formatDateTime,
                  formatTime,
                  getCommentLabel,
                  historyAudioStates,
                  handleHistoryAudioPlayPause,
                  historyAudioRefs,
                  handleHistoryAudioTimeUpdate,
                  handleHistoryAudioLoadedMetadata,
                  handleHistoryAudioEnded
                }}
              />


              {/* Floating Fullscreen Buttons */}
              {activeTab === 'lyrics' && !isFullscreenLyrics && (
                <SongLyrics 
                  isFullscreen={false}
                  onToggleFullscreen={toggleFullscreenLyrics}
                  showFloatingButtonOnly={true}
                  zoneColor={zoneColor}
                  darkenColor={darkenColor}
                  onOpenCastMode={() => setIsCastModeOpen(true)}
                />
              )}

              {activeTab === 'comments' && !isFullscreenComments && (
                <SongComments 
                  isFullscreen={false}
                  onToggleFullscreen={toggleFullscreenComments}
                  showFloatingButtonOnly={true}
                  zoneColor={zoneColor}
                  darkenColor={darkenColor}
                />
              )}

              {activeTab === 'solfas' && !isFullscreenSolfas && (
                <SongSolfas 
                  isFullscreen={false}
                  onToggleFullscreen={toggleFullscreenSolfas}
                  showFloatingButtonOnly={true}
                  zoneColor={zoneColor}
                  darkenColor={darkenColor}
                />
              )}

              <SongAudioPlayer 
                currentTime={currentTime}
                duration={duration}
                formatTime={formatTime}
                isDragging={isDragging}
                handleProgressClick={handleProgressClick}
                handleProgressMouseDown={handleProgressMouseDown}
                handleProgressMouseMove={handleProgressMouseMove}
                handleProgressMouseUp={handleProgressMouseUp}
                isRepeating={isRepeating}
                toggleRepeat={toggleRepeat}
                handlePrevious={handlePrevious}
                skipBackward10={skipBackward10}
                togglePlayPause={togglePlayPause}
                isLoading={isLoading}
                hasError={hasError}
                isPlaying={isPlaying}
                skipForward10={skipForward10}
                handleNext={handleNext}
                handleMusicPage={handleMusicPage}
                isNavigatingToAudioLab={isNavigatingToAudioLab}
                zoneColor={zoneColor}
                darkenColor={darkenColor}
                historyAudioRefs={historyAudioRefs}
                setHistoryAudioStates={setHistoryAudioStates}
              />
            </>
          )}
        </div>
      </div>

      {/* Cast Mode overlay */}
      {isCastModeOpen && currentSongData && (
        <LyricsCastMode
          lyrics={displayedSongData?.lyrics || currentSongData.lyrics}
          title={displayedSongData?.title || currentSongData.title}
          writer={displayedSongData?.writer || currentSongData.writer}
          imageUrl={currentSongData.imageUrl}
          zoneColor={zoneColor}
          isLoading={realtimeSongLoading}
          onClose={() => setIsCastModeOpen(false)}
        />
      )}
    </>
  );
}
