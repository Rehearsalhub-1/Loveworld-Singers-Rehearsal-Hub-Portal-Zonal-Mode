"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { MasterSong, MasterProgram } from '@/types/master-library';
import { BackendAPI } from '@/lib/api-client';
import { useZone } from '@/hooks/useZone';
import { useAuth } from '@/hooks/useAuth';
import { isHQGroup, isBossZone } from '@/config/zones';
import { useMasterLibraryStore } from '@/stores/masterLibraryStore';

export function useMasterLibrary(isHQAdmin: boolean = false) {
  const { currentZone } = useZone();
  const { user, profile } = useAuth();

  // Determine if current zone is HQ or Boss (Central Admin)
  const isHQ = currentZone ? isHQGroup(currentZone.id) : false;
  const isBoss = currentZone ? isBossZone(currentZone.id) : false;
  const canManage = isHQAdmin || isHQ || isBoss;

  // State
  const [masterSongs, setMasterSongs] = useState<MasterSong[]>([]);
  const [hqInternalSongs, setHqInternalSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSong, setSelectedSong] = useState<MasterSong | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedForPublish, setSelectedForPublish] = useState<string[]>([]);
  const [stats, setStats] = useState({ totalSongs: 0, totalImports: 0, mostImported: [] as MasterSong[] });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Zone-specific state for importing
  const [zonePraiseNights, setZonePraiseNights] = useState<any[]>([]);
  const [selectedPraiseNight, setSelectedPraiseNight] = useState<string>('');

  // Load more state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMasterSongs, setHasMoreMasterSongs] = useState(true);
  const [hasMoreInternalSongs, setHasMoreInternalSongs] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Search/Filter state
  const [selectedLeadSinger, setSelectedLeadSinger] = useState<string>('');
  const [isLeadSingerDropdownOpen, setIsLeadSingerDropdownOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Programs state
  const [programs, setPrograms] = useState<MasterProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [isProgramsDropdownOpen, setIsProgramsDropdownOpen] = useState(false);
  const [showCreateProgramModal, setShowCreateProgramModal] = useState(false);
  const [isAssigningToProgram, setIsAssigningToProgram] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [songsToAssign, setSongsToAssign] = useState<MasterSong[]>([]);
  const [showOrderProgramsModal, setShowOrderProgramsModal] = useState(false);

  // Helper: Normalize name
  const normalizeName = (name: string): string => {
    return name
      .trim()
      .replace(/[.,;:!?]+$/, '')
      .trim();
  };

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    const zoneIdKey = currentZone?.id || 'public';
    const CACHE_TTL = 30 * 1000; // 30 seconds
    const now = Date.now();
    const cachedStore = useMasterLibraryStore.getState().getCache(zoneIdKey);

    // INSTANT RENDER FROM CACHE
    if (cachedStore) {
      setMasterSongs(cachedStore.songs);
      setStats(cachedStore.stats);
      setHqInternalSongs(cachedStore.internalSongs);
      setPrograms(cachedStore.programs);
      setLoading(false);

      if (now - cachedStore.lastFetchTime < CACHE_TTL) {
        return; // Cache is hot, skip background fetch
      }
    } else {
      setLoading(true);
    }

    try {
      const [songsRes, internalRes, programListRes]: any[] = await Promise.all([
        BackendAPI.songs.getAll({ limit: 50 }),
        BackendAPI.generic.list('praise_night_songs'),
        BackendAPI.generic.list('master_programs')
      ]);

      const songs: MasterSong[] = Array.isArray(songsRes) ? songsRes : (songsRes?.data || []);
      const internal: any[] = Array.isArray(internalRes) ? internalRes : (internalRes?.data || []);
      const programList: MasterProgram[] = Array.isArray(programListRes) ? programListRes : (programListRes?.data || []);

      const statsData = {
        totalSongs: songs.length,
        totalImports: songs.reduce((acc, s) => acc + (s.importCount || 0), 0),
        mostImported: [...songs].sort((a, b) => (b.importCount || 0) - (a.importCount || 0)).slice(0, 5)
      };

      setMasterSongs(songs);
      setStats(statsData);
      setHqInternalSongs(internal);
      setPrograms(programList);
      setHasMoreMasterSongs(songs.length === 50);
      setHasMoreInternalSongs(false);

      if (!canManage && currentZone) {
        const pnRes: any = await BackendAPI.praiseNights.getAll({ zoneId: currentZone.id, limit: 50 });
        const praiseNights = Array.isArray(pnRes) ? pnRes : (pnRes?.data || []);
        setZonePraiseNights(praiseNights);
      }

      // Update Zustand Cache
      useMasterLibraryStore.getState().setCache(zoneIdKey, {
        songs,
        stats: statsData,
        internalSongs: internal,
        programs: programList,
        lastFetchTime: Date.now()
      });

    } catch (error) {
      console.error('Error loading master library:', error);
      showToast('error', 'Failed to load Master Library');
    } finally {
      setLoading(false);
    }
  }, [currentZone, canManage, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Server-side search effect
  useEffect(() => {
    if (!searchTerm) {
      if (masterSongs.length < 50) loadData(); // Reload default list if we were searching
      return;
    }
    
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const searchRes: any = await BackendAPI.songs.getAll({ limit: 50, search: searchTerm });
        const searchResults = Array.isArray(searchRes) ? searchRes : (searchRes?.data || []);
        setMasterSongs(searchResults);
        // Reset hasMore because we are showing search results
        setHasMoreMasterSongs(false); 
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Pagination & Filtering
  const filteredMasterSongs = useMemo(() => {
    let filtered = masterSongs;

    // Security Filter: Hide HQ Only songs from non-HQ users
    if (!canManage) {
      filtered = filtered.filter(song => !song.isHQOnly);
    }

    if (selectedProgramId) {
      const selectedProgram = programs.find(p => p.id === selectedProgramId);
      if (selectedProgram) {
        filtered = filtered.filter(song => selectedProgram.songIds?.includes(song.id));
      }
    }

    if (selectedLeadSinger) {
      filtered = filtered.filter(song => {
        const singer = song.leadSinger?.trim();
        if (!singer) return false;
        return normalizeName(singer).toLowerCase() === normalizeName(selectedLeadSinger).toLowerCase();
      });
    }

    // Server-side search handles searchTerm, so we only filter locally if something missed
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(song =>
        song.title?.toLowerCase().includes(term) ||
        song.writer?.toLowerCase().includes(term) ||
        song.leadSinger?.toLowerCase().includes(term) ||
        song.category?.toLowerCase().includes(term) ||
        song.lyrics?.toLowerCase().includes(term) ||
        song.solfa?.toLowerCase().includes(term) ||
        song.key?.toLowerCase().includes(term) ||
        song.tempo?.toLowerCase().includes(term)
      );
    }

    return [...filtered].sort((a, b) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return sortOrder === 'asc'
        ? titleA.localeCompare(titleB)
        : titleB.localeCompare(titleA);
    });
  }, [masterSongs, searchTerm, selectedLeadSinger, selectedProgramId, programs, sortOrder]);

  const paginatedSongs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMasterSongs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMasterSongs, currentPage]);

  const totalPages = Math.ceil(filteredMasterSongs.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLeadSinger, selectedProgramId]);

  const availableForPublish = useMemo(() => {
    const publishedIds = masterSongs.map(s => s.originalSongId);
    return hqInternalSongs.filter(song => !publishedIds.includes(song.id || ''));
  }, [hqInternalSongs, masterSongs]);

  const leadSingers = useMemo(() => {
    const normalizedMap = new Map<string, string>();
    masterSongs.forEach(song => {
      const singer = song.leadSinger?.trim();
      if (!singer) return;
      const normalized = normalizeName(singer).toLowerCase();
      if (!normalizedMap.has(normalized)) {
        normalizedMap.set(normalized, singer);
      }
    });
    return Array.from(normalizedMap.values()).sort((a, b) => a.localeCompare(b));
  }, [masterSongs]);

  // Actions
  const loadMoreMasterSongs = useCallback(async () => {
    if (isLoadingMore || !hasMoreMasterSongs) return;
    setIsLoadingMore(true);
    try {
      const lastId = masterSongs.length ? masterSongs[masterSongs.length - 1].id : undefined;
      const res: any = await BackendAPI.songs.getAll({ limit: 50, after: lastId });
      const moreSongs = Array.isArray(res) ? res : (res?.data || []);
      if (moreSongs.length > 0) {
        setMasterSongs(prev => [...prev, ...moreSongs]);
      }
      setHasMoreMasterSongs(moreSongs.length === 50);
    } catch (error) {
      console.error('Error loading more songs:', error);
      showToast('error', 'Failed to load more songs');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreMasterSongs, masterSongs, showToast]);

  const loadMoreInternalSongs = useCallback(async () => {
    setIsLoadingMore(false);
    setHasMoreInternalSongs(false);
  }, []);

  const handlePublish = async () => {
    if (selectedForPublish.length === 0) {
      showToast('error', 'Please select songs to publish');
      return;
    }
    setPublishing(true);
    let successCount = 0;
    let failCount = 0;

    for (const songId of selectedForPublish) {
      const song = hqInternalSongs.find(s => (s.id || '') === songId);
      if (song) {
        try {
          const res: any = await BackendAPI.songs.create({
            ...song,
            sourceType: 'published',
            publishedBy: user?.uid || ''
          });
          if (!res?.error) successCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      }
    }

    setPublishing(false);
    setSelectedForPublish([]);
    setShowPublishModal(false);

    if (successCount > 0) {
      const userName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'Admin';
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: {
          message: `Published ${successCount} song(s) to Master Library`,
          type: 'success',
          userName,
          action: 'created',
          section: 'master_library',
          itemName: `${successCount} song(s)`
        }
      }));
      loadData();
    }
    if (failCount > 0) {
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: `Failed to publish ${failCount} song(s)`, type: 'error' }
      }));
    }
  };

  const handleDelete = async (songId: string) => {
    try {
      const res: any = await BackendAPI.songs.delete(songId);
      if (!res?.error) {
        const userName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'Admin';
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: {
            message: 'Song removed from Master Library',
            type: 'success',
            userName,
            action: 'deleted',
            section: 'master_library',
            itemName: 'Song'
          }
        }));
        loadData();
      } else {
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: { message: res?.error || 'Failed to remove song', type: 'error' }
        }));
      }
    } catch {
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'Failed to remove song', type: 'error' }
      }));
    }
  };

  const handleImport = async () => {
    if (!selectedSong || !selectedPraiseNight || !currentZone) {
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'Please select a praise night to import to', type: 'error' }
      }));
      return;
    }
    setImporting(true);
    try {
      const result: any = await BackendAPI.songs.create({
        ...selectedSong,
        zoneId: currentZone.id,
        praiseNightId: selectedPraiseNight,
        importedFrom: 'master',
        originalSongId: selectedSong.id,
        importedBy: user?.uid || ''
      });
      if (!result?.error) {
        const userName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'Admin';
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: {
            message: `"${selectedSong.title}" imported successfully!`,
            type: 'success',
            userName,
            action: 'created',
            section: 'songs',
            itemName: selectedSong.title
          }
        }));
        setShowImportModal(false);
        setSelectedSong(null);
        setSelectedPraiseNight('');
        loadData();
      } else {
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: { message: result.error || 'Failed to import song', type: 'error' }
        }));
      }
    } catch (error) {
      console.error('Error importing song:', error);
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'Failed to import song', type: 'error' }
      }));
    } finally {
      setImporting(false);
    }
  };

  const handleCreateProgram = async (name: string, description: string) => {
    if (!name.trim()) return;
    try {
      const res: any = await BackendAPI.generic.create('master_programs', {
        name,
        publishedBy: user?.uid || '',
        publishedByName: profile?.display_name || (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Admin'),
        description,
        songIds: [],
        createdAt: new Date().toISOString()
      });
      if (!res?.error) {
        showToast('success', 'Program created successfully');
        loadData();
        setShowCreateProgramModal(false);
      } else {
        showToast('error', res?.error || 'Failed to create program');
      }
    } catch (error) {
      console.error('Error creating program:', error);
      showToast('error', 'An unexpected error occurred');
    }
  };

  const handleBulkAddToProgram = async (programId: string) => {
    if (songsToAssign.length === 0) return;
    const songIds = songsToAssign.map(s => s.id);
    try {
      const res: any = await BackendAPI.generic.update('master_programs', programId, { songIds });
      if (!res?.error) {
        showToast('success', `Added ${songIds.length} song${songIds.length !== 1 ? 's' : ''} to program`);
        setIsAssigningToProgram(false);
        setSongsToAssign([]);
        setSelectedSongIds(new Set());
        loadData();
      } else {
        showToast('error', 'Failed to add songs to program');
      }
    } catch (error) {
      console.error('Error adding songs to program:', error);
      showToast('error', 'An error occurred');
    }
  };

  const handleToggleSongInProgram = async (songId: string, programId: string) => {
    try {
      const program = programs.find(p => p.id === programId);
      if (!program) return;
      const isInProgram = program.songIds?.includes(songId);
      const songIds = isInProgram
        ? (program.songIds || []).filter(id => id !== songId)
        : Array.from(new Set([...(program.songIds || []), songId]));

      const res: any = await BackendAPI.generic.update('master_programs', programId, { songIds });
      if (!res?.error) {
        showToast('success', isInProgram ? 'Removed from program' : 'Added to program');
        loadData();
      } else {
        showToast('error', res?.error || 'Failed to update program');
      }
    } catch (error) {
      console.error('Error toggling song in program:', error);
      showToast('error', 'An unexpected error occurred');
    }
  };

  const handleUpdateProgramOrder = async (updatedPrograms: MasterProgram[]) => {
    try {
      for (let i = 0; i < updatedPrograms.length; i++) {
        await BackendAPI.generic.update('master_programs', updatedPrograms[i].id, { sortOrder: i });
      }
      showToast('success', 'Program order updated');
      loadData();
    } catch (error) {
      console.error('Error updating program order:', error);
      showToast('error', 'An error occurred');
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    if (!confirm('Are you sure you want to delete this program? Songs will not be deleted.')) return;
    try {
      const res: any = await BackendAPI.generic.delete('master_programs', programId);
      if (!res?.error) {
        showToast('success', 'Program deleted successfully');
        loadData();
      } else {
        showToast('error', res?.error || 'Failed to delete program');
      }
    } catch (error) {
      console.error('Error deleting program:', error);
      showToast('error', 'An error occurred');
    }
  };

  const handleCreateSong = async (songData: any) => {
    setPublishing(true);
    try {
      const res: any = await BackendAPI.songs.create({
        ...songData,
        publishedBy: user?.uid || '',
        publishedByName: profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'HQ Admin'
      });
      if (!res?.error) {
        showToast('success', 'Song added to Master Library');
        setShowCreateModal(false);
        loadData();
      } else {
        showToast('error', res?.error || 'Failed to create song');
      }
    } catch (error) {
      console.error('Error creating song:', error);
      showToast('error', 'An unexpected error occurred');
    } finally {
      setPublishing(false);
    }
  };

  return {
    // State
    masterSongs,
    hqInternalSongs,
    loading,
    searchTerm, setSearchTerm,
    selectedSong, setSelectedSong,
    showPublishModal, setShowPublishModal,
    showDetailsModal, setShowDetailsModal,
    showImportModal, setShowImportModal,
    showEditModal, setShowEditModal,
    showCreateModal, setShowCreateModal,
    publishing,
    importing,
    selectedForPublish, setSelectedForPublish,
    stats,
    toast, showToast,
    zonePraiseNights,
    selectedPraiseNight, setSelectedPraiseNight,
    isLoadingMore,
    hasMoreMasterSongs,
    hasMoreInternalSongs,
    currentPage, setCurrentPage,
    totalPages,
    itemsPerPage,
    selectedLeadSinger, setSelectedLeadSinger,
    isLeadSingerDropdownOpen, setIsLeadSingerDropdownOpen,
    sortOrder, setSortOrder,
    programs,
    selectedProgramId, setSelectedProgramId,
    isProgramsDropdownOpen, setIsProgramsDropdownOpen,
    showCreateProgramModal, setShowCreateProgramModal,
    isAssigningToProgram, setIsAssigningToProgram,
    selectedSongIds, setSelectedSongIds,
    songsToAssign, setSongsToAssign,
    showOrderProgramsModal, setShowOrderProgramsModal,
    availableForPublish,
    leadSingers,
    filteredMasterSongs,
    paginatedSongs,
    canManage,
    currentZone,
    user, profile,

    // Actions
    loadData,
    loadMoreMasterSongs,
    loadMoreInternalSongs,
    handlePublish,
    handleDelete,
    handleImport,
    handleCreateProgram,
    handleBulkAddToProgram,
    handleToggleSongInProgram,
    handleUpdateProgramOrder,
    handleDeleteProgram,
    handleCreateSong
  };
}
