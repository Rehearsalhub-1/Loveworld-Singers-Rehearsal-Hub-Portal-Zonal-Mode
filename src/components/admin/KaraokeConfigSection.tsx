"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Mic,
    Search,
    CheckCircle,
    XCircle,
    X,
    FileText,
    Save,
    Clock,
    Music
} from 'lucide-react';
import { MasterSong } from '@/types/master-library';
import { BackendAPI } from '@/lib/api-client';
import CustomLoader from '@/components/CustomLoader';
import { useZone } from '@/hooks/useZone';
import { PraiseNightSong } from '@/types/supabase';

export default function KaraokeConfigSection() {
    const { currentZone } = useZone();

    // State
    const [allSongs, setAllSongs] = useState<(MasterSong | PraiseNightSong)[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Modal State
    const [selectedSong, setSelectedSong] = useState<any | null>(null);
    const [lrcText, setLrcText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load Master Library songs (HQ Published)
            const res: any = await BackendAPI.songs.getAll({ limit: 5000 });
            const masterSongs = Array.isArray(res) ? res : (res?.data || []);

            const merged: any[] = [
                ...masterSongs.map((s: any) => ({ ...s, _source: 'Master' }))
            ];

            // Sort by title
            merged.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            
            setAllSongs(merged);
        } catch (error) {
            console.error('Error loading songs:', error);
            showToast('error', 'Failed to load songs');
        } finally {
            setLoading(false);
        }
    }, [currentZone]);

    // Load data
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter songs based on search
    const filteredSongs = useMemo(() => {
        let filtered = allSongs;

        // Filter by search query
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(song =>
                song.title?.toLowerCase().includes(term) ||
                (song as any).writer?.toLowerCase().includes(term) ||
                (song as any).leadSinger?.toLowerCase().includes(term) ||
                (song as any).artist?.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [allSongs, searchTerm]);

    // Paginated songs for display
    const paginatedSongs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredSongs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredSongs, currentPage]);

    const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const openConfigModal = async (song: any) => {
        setSelectedSong(song);
        setLrcText(song.karaokeLrcText || song.lyrics || '');
    };

    const handleSaveLrc = async () => {
        if (!selectedSong) return;

        setIsSaving(true);
        try {
            await BackendAPI.songs.update(selectedSong.id, {
                karaokeLrcText: lrcText
            });
            showToast('success', 'LRC Text saved successfully!');
            setSelectedSong(null);
        } catch (error) {
            showToast('error', 'Failed to save LRC Text.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAutoSync = async () => {
        if (!selectedSong) return;
        
        const audioUrl = selectedSong.audioUrls?.full || selectedSong.audioFile;
        if (!audioUrl) {
            showToast('error', 'No audio file found for this song to sync.');
            return;
        }

        setIsSyncing(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

            // Strip existing timestamps to get clean text if any, or use existing lrcText
            const cleanText = lrcText.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
            
            const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
            const response = await fetch(`${backendUrl}/api/lyrics-sync`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    audioUrl,
                    songId: selectedSong.id,
                    existingLyrics: cleanText || "",
                    provider: 'groq' // Switched from 'modal' to 'groq' to avoid Modal Backend Error
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to sync with AI');
            }

            const data = await response.json();
            if (data.lrc) {
                setLrcText(data.lrc);
                showToast('success', 'Lyrics synced with AI perfectly!');
            } else if (data.lyrics && Array.isArray(data.lyrics)) {
                // Convert Groq lyrics array to LRC format
                const lrcFormat = data.lyrics.map((l: any) => {
                    const minutes = Math.floor(l.time / 60);
                    const seconds = (l.time % 60).toFixed(2).padStart(5, '0');
                    return `[${String(minutes).padStart(2, '0')}:${seconds}] ${l.text}`;
                }).join('\n');
                setLrcText(lrcFormat);
                showToast('success', 'Lyrics synced with Groq AI perfectly!');
            } else {
                throw new Error('AI returned no synced lyrics');
            }
        } catch (error: any) {
            console.error('AI Sync Error:', error);
            showToast('error', error.message || 'AI Synchronization failed');
        } finally {
            setIsSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50">
                <CustomLoader message="Loading Library for Karaoke Config..." />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white lg:bg-gradient-to-br lg:from-slate-50 lg:via-white lg:to-purple-50">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    {toast.message}
                </div>
            )}

            {/* Mobile Stats Header */}
            <div className="lg:hidden bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Mic className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-white/80 text-xs">Karaoke Library</p>
                            <p className="text-white font-bold text-lg">{allSongs.length} songs</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 lg:p-6 pb-24 lg:pb-6">
                {/* Header - Desktop Only */}
                <div className="hidden lg:block mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-100 rounded-lg">
                                <Mic className="w-6 h-6 text-violet-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Karaoke Config</h1>
                                <p className="text-slate-500 text-sm">
                                    Paste raw LRC timing files to guarantee 100% perfect audio syncing
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative flex-1 max-w-2xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search songs to configure..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[40%]">Song Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%]">Lead Singer</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%]">Source</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right w-[20%]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedSongs.length > 0 ? (
                                    paginatedSongs.map((song) => (
                                        <tr key={song.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 align-middle">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                                                        <Music className="w-5 h-5 text-violet-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 line-clamp-1">{song.title}</p>
                                                        <p className="text-sm text-slate-500 line-clamp-1">{song.writer || 'Unknown Writer'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <p className="text-sm font-medium text-slate-700">{song.leadSinger || '-'}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                                    (song as any)._source === 'Master' 
                                                        ? 'bg-purple-100 text-purple-700' 
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {(song as any)._source}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 align-middle text-right">
                                                <button
                                                    onClick={() => openConfigModal(song)}
                                                    className="px-4 py-2 bg-slate-100 hover:bg-violet-100 text-slate-700 hover:text-violet-700 transition-colors rounded-lg font-medium text-sm inline-flex items-center gap-2"
                                                >
                                                    <Clock className="w-4 h-4" />
                                                    Config LRC
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                                            No songs found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile List View */}
                <div className="lg:hidden space-y-3 mb-8">
                    {paginatedSongs.length > 0 ? (
                        paginatedSongs.map((song) => (
                            <div key={song.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                                        <Music className="w-6 h-6 text-violet-600" />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <p className="font-bold text-slate-900 leading-tight mb-1 truncate">{song.title}</p>
                                        <p className="text-xs text-slate-500 truncate mb-1">{song.writer || 'Unknown Writer'}</p>
                                        <p className="text-xs font-medium text-violet-600 truncate">{song.leadSinger}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => openConfigModal(song)}
                                    className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                                >
                                    <Clock className="w-4 h-4" />
                                    Configure LRC
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-500 bg-white rounded-xl border border-slate-200">
                            No songs found matching "{searchTerm}"
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-lg font-medium text-sm transition-colors border shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 border-slate-200 bg-white hover:bg-slate-50"
                        >
                            Previous
                        </button>
                        <span className="text-slate-500 text-sm font-medium px-4">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 rounded-lg font-medium text-sm transition-colors border shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 border-slate-200 bg-white hover:bg-slate-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Editor Modal */}
            {selectedSong && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 flex-shrink-0">
                            <div className="pr-4">
                                <h3 className="text-lg font-bold text-slate-900 line-clamp-1">Karaoke LRC Editor</h3>
                                <p className="text-sm text-slate-500 pt-0.5 line-clamp-1">{selectedSong.title}</p>
                            </div>
                            <button
                                onClick={() => setSelectedSong(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                            {isLoadingLyrics ? (
                                <div className="flex flex-col items-center justify-center h-48 space-y-4">
                                    <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-sm text-slate-500">Loading existing LRC data...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800">
                                        <FileText className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                                        <div className="text-sm space-y-1">
                                            <p className="font-semibold">Format Guide (Standard LRC)</p>
                                            <p>Use the format <code className="bg-blue-100 px-1 rounded">[mm:ss.xx] Lyric Text</code></p>
                                            <p className="text-blue-600 opacity-80 mt-2">Example:<br />[00:15.50] Glorious You reign<br />[00:19.20] You are the Mighty God</p>
                                        </div>
                                    </div>

                                    {(selectedSong?.audioUrls?.full || selectedSong?.audioFile) && (
                                        <div className="bg-white border text-center border-slate-200 rounded-xl p-4 shadow-sm">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Audio Reference</p>
                                            <audio
                                                controls
                                                src={selectedSong.audioUrls?.full || selectedSong.audioFile}
                                                className="w-full h-10 outline-none"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-semibold text-slate-700">Raw LRC Sync Text</label>
                                            <button
                                                onClick={handleAutoSync}
                                                disabled={isSyncing || isLoadingLyrics}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                    isSyncing 
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-95'
                                                }`}
                                            >
                                                {isSyncing ? (
                                                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                                                ) : (
                                                    <Music className="w-3.5 h-3.5" />
                                                )}
                                                {isSyncing ? 'AI Thinking...' : 'Auto-Sync with AI'}
                                            </button>
                                        </div>
                                        <textarea
                                            value={lrcText}
                                            onChange={(e) => setLrcText(e.target.value)}
                                            placeholder="Paste your timed LRC text here..."
                                            className="w-full h-[40vh] min-h-[300px] p-4 font-mono text-sm bg-slate-900 text-green-400 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none placeholder-slate-600 shadow-inner resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 flex-shrink-0">
                            <button
                                onClick={() => setSelectedSong(null)}
                                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveLrc}
                                disabled={isSaving || isLoadingLyrics}
                                className="px-6 py-2.5 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 focus:ring-4 focus:ring-violet-100 transition-all flex items-center justify-center min-w-[120px]"
                            >
                                {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save LRC
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
