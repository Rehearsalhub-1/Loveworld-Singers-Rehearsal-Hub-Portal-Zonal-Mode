"use client";

import { useMemo, useEffect } from 'react';
import { Music, Sparkles, BookOpen, Clock, Play, SkipForward, Volume2, HandMetal, Piano, Heart } from 'lucide-react';

interface UsePraiseNightSongsDataProps {
  finalSongData: any[];
  activeCategory: string;
  activeFilter: 'heard' | 'unheard';
  currentPraiseNight: any;
  setActiveCategory: (category: string) => void;
}

export const usePraiseNightSongsData = ({
  finalSongData,
  activeCategory,
  activeFilter,
  currentPraiseNight,
  setActiveCategory
}: UsePraiseNightSongsDataProps) => {
  // Helper function to check if song belongs to category
  const songBelongsToCategory = (song: any, targetCategory: string) => {
    if (song.categories && Array.isArray(song.categories) && song.categories.length > 0) {
      return song.categories.some((cat: string) => cat.trim() === targetCategory.trim());
    }
    return (song.category || '').trim() === targetCategory.trim();
  };

  // Song categories - get from Supabase data
  const songCategories = useMemo(() => {
    const songsToUse = finalSongData.length > 0 ? finalSongData : (currentPraiseNight?.songs || []);
    if (songsToUse.length === 0) return [];

    const allCategories: string[] = [];
    songsToUse.forEach((song: any) => {
      if (song.categories && Array.isArray(song.categories)) {
        allCategories.push(...song.categories.filter((cat: any) => cat && cat.trim()));
      } else if (song.category && song.category.trim()) {
        allCategories.push(song.category);
      }
    });

    return [...new Set(allCategories)];
  }, [finalSongData, currentPraiseNight?.songs]);

  // Categories that currently have at least one active song
  const categoriesWithActiveSongs = useMemo(() => {
    const activeCategories = finalSongData
      .filter((song: any) => song.isActive && song.category)
      .map((song: any) => song.category);
    return Array.from(new Set(activeCategories));
  }, [finalSongData]);

  // All categories sorted (Active first, then manual order, then alphabetical)
  const mainCategories = useMemo(() => {
    const base = [...songCategories];
    if (base.length === 0) return base;

    const order = currentPraiseNight?.categoryOrder || [];

    return base.sort((a, b) => {
      const aActive = categoriesWithActiveSongs.includes(a);
      const bActive = categoriesWithActiveSongs.includes(b);

      if (aActive !== bActive) return aActive ? -1 : 1;

      const aOrderIndex = order.indexOf(a);
      const bOrderIndex = order.indexOf(b);

      if (aOrderIndex !== -1 && bOrderIndex !== -1) return aOrderIndex - bOrderIndex;
      if (aOrderIndex !== -1) return -1;
      if (bOrderIndex !== -1) return 1;

      return a.localeCompare(b);
    });
  }, [songCategories, categoriesWithActiveSongs, currentPraiseNight?.categoryOrder]);

  // Filter songs based on selected category and status
  const filteredSongs = useMemo(() => {
    return finalSongData.filter(song => {
      const matchesCategory = songBelongsToCategory(song, activeCategory);
      const matchesStatus = song.status === activeFilter;
      return matchesCategory && matchesStatus;
    }).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });
  }, [finalSongData, activeCategory, activeFilter]);

  // Get counts for current category
  const categoryCounts = useMemo(() => {
    const heard = finalSongData.filter(song => {
      return songBelongsToCategory(song, activeCategory) && song.status === 'heard';
    }).length;

    const unheard = finalSongData.filter(song => {
      return songBelongsToCategory(song, activeCategory) && song.status === 'unheard';
    }).length;

    return {
      heard,
      unheard,
      total: heard + unheard
    };
  }, [finalSongData, activeCategory]);

  // Prefer auto-selecting a category that has active songs; otherwise fall back to first
  useEffect(() => {
    if (!activeCategory) {
      const preferred = mainCategories.find((cat) => categoriesWithActiveSongs.includes(cat));
      if (preferred) {
        setActiveCategory(preferred);
        return;
      }
      if (songCategories.length > 0) {
        setActiveCategory(songCategories[0]);
      }
    } else if (!songCategories.includes(activeCategory)) {
      // If current activeCategory no longer exists (page switched), reset with preference
      const preferred = mainCategories.find((cat) => categoriesWithActiveSongs.includes(cat));
      if (preferred) {
        setActiveCategory(preferred);
      } else if (songCategories.length > 0) {
        setActiveCategory(songCategories[0]);
      } else {
        setActiveCategory('');
      }
    }
  }, [activeCategory, mainCategories, categoriesWithActiveSongs, songCategories, setActiveCategory]);

  return {
    songCategories,
    categoriesWithActiveSongs,
    mainCategories,
    filteredSongs,
    categoryCounts,
    songBelongsToCategory
  };
};
