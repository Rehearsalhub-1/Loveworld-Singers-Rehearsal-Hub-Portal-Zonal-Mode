"use client";

import React, { createContext, useContext, useRef, useState, useEffect, ReactNode } from "react";
import { PraiseNightSong } from "@/types/supabase";

interface AudioContextType {
  currentSong: PraiseNightSong | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  hasError: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  setCurrentSong: (song: PraiseNightSong | null, autoPlay?: boolean) => void;
  togglePlayPause: () => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<PraiseNightSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isToggling, setIsToggling] = useState(false);

  const AUDIO_STATE_KEY = 'loveworld_audio_state';
  const AUDIO_TIME_KEY = 'loveworld_audio_time';
  const AUDIO_SONG_KEY = 'loveworld_audio_song';

  const togglePlayPause = () => {
    if (isToggling) return;

    setIsToggling(true);
    setTimeout(() => setIsToggling(false), 300);

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (!audioRef.current.src || audioRef.current.src === '') return;

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            setIsPlaying(false);
          });
        }
      }
    }
  };

  const play = () => {
    if (audioRef.current && currentSong?.audioFile && currentSong.audioFile.trim() !== '') {
      if (audioRef.current.readyState >= 2) {
        audioRef.current.play().catch(() => { });
      } else {
        const handleCanPlay = () => {
          if (audioRef.current) {
            audioRef.current.play().catch(() => { });
            audioRef.current.removeEventListener('canplay', handleCanPlay);
          }
        };
        audioRef.current.addEventListener('canplay', handleCanPlay);
      }
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const lastUpdateRef = useRef<number>(0);
  const lastSaveRef = useRef<number>(0);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const now = Date.now();
      const newTime = audioRef.current.currentTime;

      //  Update state every 250ms (Smooth enough for progress bars, saves CPU)
      if (now - lastUpdateRef.current > 250) {
        setCurrentTime(newTime);
        lastUpdateRef.current = now;
      }

      //  Save to disk every 3 seconds (Prevents SSD/Battery wear)
      if (now - lastSaveRef.current > 3000) {
        localStorage.setItem(AUDIO_TIME_KEY, newTime.toString());
        if (currentSong && isPlaying) {
          saveAudioState();
        }
        lastSaveRef.current = now;
      }
    }
  };

  const saveAudioState = () => {
    if (currentSong && isPlaying && currentTime > 5) {
      localStorage.setItem(AUDIO_STATE_KEY, 'true');
      localStorage.setItem(AUDIO_SONG_KEY, JSON.stringify({
        id: currentSong.id,
        title: currentSong.title,
        audioFile: currentSong.audioFile,
        mediaId: (currentSong as any).mediaId,
        duration: duration
      }));
      localStorage.setItem('audio_timestamp', Date.now().toString());
    }
  };

  const restoreAudioState = () => {
    try {
      const savedSong = localStorage.getItem(AUDIO_SONG_KEY);
      const savedState = localStorage.getItem(AUDIO_STATE_KEY);
      const savedTime = localStorage.getItem(AUDIO_TIME_KEY);
      const savedTimestamp = localStorage.getItem('audio_timestamp');

      if (savedSong && savedState === 'true') {
        const songData = JSON.parse(savedSong);
        const savedTimeNum = savedTimestamp ? parseInt(savedTimestamp) : 0;
        const now = Date.now();
        const thirtyMinutesAgo = now - (30 * 60 * 1000);

        if (savedTimeNum < thirtyMinutesAgo) {
          clearAudioState();
          return;
        }

        if (songData.audioFile && songData.audioFile.trim() !== '') {
          setCurrentSong(songData);
          if (savedTime) {
            const time = parseFloat(savedTime);
            if (!isNaN(time) && time > 0 && time < songData.duration) {
              setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = time;
                  setCurrentTime(time);
                }
              }, 1000);
            }
          }
        }
      }
    } catch (error) {
      clearAudioState();
    }
  };

  const clearAudioState = () => {
    localStorage.removeItem(AUDIO_SONG_KEY);
    localStorage.removeItem(AUDIO_STATE_KEY);
    localStorage.removeItem(AUDIO_TIME_KEY);
    localStorage.removeItem('audio_timestamp');
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
      setHasError(false);
      if (shouldAutoPlay && currentSong?.audioFile && currentSong.audioFile.trim() !== '') {
        audioRef.current.play().catch(() => {
          setHasError(true);
        });
        setShouldAutoPlay(false);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    window.dispatchEvent(new CustomEvent('audioEnded', { detail: { song: currentSong } }));
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handleError = () => {
    setIsPlaying(false);
    setIsLoading(false);
    setHasError(true);
  };

  useEffect(() => {
    saveAudioState();
  }, [currentSong, isPlaying]);

  useEffect(() => {
    restoreAudioState();
  }, []);

  useEffect(() => {
    if (currentSong?.audioFile && audioRef.current && currentSong.audioFile.trim() !== '') {
      try {
        if (audioRef.current.src && audioRef.current.src === currentSong.audioFile) return;

        setCurrentTime(0);
        setDuration(0);
        setIsLoading(true);
        setHasError(false);

        if (currentSong.audioFile.startsWith('http')) {
          audioRef.current.src = currentSong.audioFile;
          audioRef.current.load();
        } else {
          audioRef.current.src = '';
          setIsLoading(false);
          setHasError(true);
        }
      } catch (error) {
        if (audioRef.current) audioRef.current.src = '';
        setIsLoading(false);
        setHasError(true);
      }
    } else if (audioRef.current) {
      audioRef.current.src = '';
      setCurrentTime(0);
      setDuration(0);
      setIsLoading(false);
      setHasError(false);
    }
  }, [currentSong]);

  const setCurrentSongWithAutoPlay = (song: PraiseNightSong | null, autoPlay: boolean = false) => {
    if (currentSong?.id === song?.id) return;

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
    }

    setCurrentSong(song);
    setShouldAutoPlay(autoPlay);
  };

  const setCurrentTimeManual = (time: number) => {
    if (audioRef.current && duration > 0) {
      const clampedTime = Math.max(0, Math.min(time, duration));
      audioRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    }
  };

  const setDurationManual = (newDuration: number) => setDuration(newDuration);

  const value = {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    hasError,
    audioRef,
    setCurrentSong: setCurrentSongWithAutoPlay,
    togglePlayPause,
    play,
    pause,
    stop,
    setCurrentTime: setCurrentTimeManual,
    setDuration: setDurationManual,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
        preload="metadata"
      />
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
