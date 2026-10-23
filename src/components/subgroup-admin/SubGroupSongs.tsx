"use client";

import React, { useState, useEffect } from 'react';
import {
  Music,
  Plus,
  Search,
  Download,
  RefreshCw,
  X,
  Library,
  FileText
} from 'lucide-react';
import { BackendAPI } from '@/lib/api-client';
import CustomLoader from '@/components/CustomLoader';
import EditSongModal from '../EditSongModal';
import { SubGroupSong } from '@/types/subgroup';
import { Category, PraiseNight, PraiseNightSong } from '@/types/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Toast, ToastContainer } from '../Toast';

interface SubGroupSongsProps {
  subGroupId: string;
  zoneId: string;
}

interface Song {
  id: string;
  title: string;
  writer?: string;
  category?: string;
  importedFrom?: string;
}

export default function SubGroupSongs({ subGroupId, zoneId }: SubGroupSongsProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [zoneSongs, setZoneSongs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedForImport, setSelectedForImport] = useState<string[]>([]);

  // Create form state
  const [creating, setCreating] = useState(false);
  const [editingSong, setEditingSong] = useState<SubGroupSong | null>(null);
  const [showSongModal, setShowSongModal] = useState(false);
  const [standardCategories, setStandardCategories] = useState<any[]>([]);
  const [standardPrograms, setStandardPrograms] = useState<PraiseNight[]>([]);
  const [toasts, setToasts] = useState<any[]>([]);
  const { user } = useAuth();

  const addToast = (toast: { type: 'success' | 'error' | 'info' | 'warning', message: string }) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    loadSongs();
    loadStandardData();
  }, [subGroupId]);

  const loadStandardData = async () => {
    if (!zoneId) return;
    try {
      const [catsRes, progsRes]: any = await Promise.all([
        BackendAPI.categories.getAll({ zoneId }),
        BackendAPI.praiseNights.getAll({ zoneId, limit: 100 })
      ]);
      setStandardCategories(Array.isArray(catsRes) ? catsRes : (catsRes?.data || []));
      setStandardPrograms((Array.isArray(progsRes) ? progsRes : (progsRes?.data || [])) as any);
    } catch (error) {
      console.error('Error loading standard modal data:', error);
    }
  };

  const loadSongs = async () => {
    setIsLoading(true);
    try {
      const res: any = await BackendAPI.subgroups.songs({ subGroupId });
      setSongs(Array.isArray(res) ? res : (res?.data || []));
    } catch (error) {
      console.error('Error loading songs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadZoneSongs = async () => {
    try {
      const res: any = await BackendAPI.songs.getAll({ zoneId, limit: 5000 });
      const allZoneSongs = Array.isArray(res) ? res : (res?.data || []);
      // Filter out already imported songs (by originalSongId)
      const importedOriginalIds = songs.filter(s => s.importedFrom).map(s => s.id);
      setZoneSongs(allZoneSongs.filter((s: any) => !importedOriginalIds.includes(s.id)));
    } catch (error) {
      console.error('Error loading zone songs:', error);
    }
  };

  const handleOpenImport = () => {
    loadZoneSongs();
    setShowImportModal(true);
  };

  const handleImport = async () => {
    if (selectedForImport.length === 0) return;

    setImporting(true);
    try {
      const songsToImport = zoneSongs.filter(s => selectedForImport.includes(s.id));

      await BackendAPI.subgroups.importSongs({
        subGroupId,
        zoneId,
        songs: songsToImport
      });

      setSelectedForImport([]);
      setShowImportModal(false);
      loadSongs();
    } catch (error) {
      console.error('Error importing songs:', error);
    } finally {
      setImporting(false);
    }
  };

  const toPraiseNightSong = (s: SubGroupSong): PraiseNightSong => {

    return {
      id: s.id,
      title: s.title,
      status: s.status || 'unheard',
      category: s.category || 'General',
      categories: [s.category || 'General'],
      praiseNightId: s.praiseNightId || 'subgroup-context',
      isActive: s.isActive,
      leadSinger: s.leadSinger,
      writer: s.writer,
      key: s.key,
      tempo: s.tempo,
      lyrics: s.lyrics || '',
      solfas: s.solfa || '',
      audioFile: s.audioFile || s.audioUrls?.full,
      audioUrls: s.audioUrls as any,
      comments: s.comments as any || [],
      history: s.history || []
    };
  };

  const fromPraiseNightSong = (ps: PraiseNightSong): Partial<SubGroupSong> => {

    return {
      title: ps.title,
      status: ps.status,
      category: ps.category,
      leadSinger: ps.leadSinger,
      writer: ps.writer,
      key: ps.key,
      tempo: ps.tempo,
      lyrics: ps.lyrics || '',
      solfa: ps.solfas || '',
      audioFile: ps.audioFile,
      audioUrls: ps.audioUrls as any,
      comments: ps.comments as any || [],
      history: ps.history
    };
  };

  const handleModalUpdate = async (ps: PraiseNightSong) => {
    if (!ps.title.trim() || !user) return;
    setCreating(true);
    try {
      const updates = fromPraiseNightSong(ps);
      
      if (editingSong) {
        await BackendAPI.subgroups.updateSong(editingSong.id, updates);
        addToast({ type: 'success', message: 'Song updated' });
      } else {
        await BackendAPI.subgroups.createSong({ ...updates, subGroupId, zoneId });
        addToast({ type: 'success', message: 'Song created' });
      }
      
      setShowSongModal(false);
      loadSongs();
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to process song' });
    } finally {
      setCreating(false);
    }
  };

  const handleEditSong = (song: any) => {
    setEditingSong(song);
    setShowSongModal(true);
  };

  const handleAddSong = () => {
    setEditingSong(null);
    setShowSongModal(true);
  };

  const toggleImportSelection = (songId: string) => {
    setSelectedForImport(prev =>
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  const filteredSongs = songs.filter(s =>
    (s.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.writer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <CustomLoader />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Songs</h1>
          <p className="text-slate-500">Manage your sub-group song library</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleOpenImport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Import from Zone</span>
          </button>
          <button
            onClick={handleAddSong}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search songs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Songs List */}
      {filteredSongs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Music className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">No songs yet</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleOpenImport}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Import from Zone →
            </button>
            <span className="text-slate-300">or</span>
            <button
              onClick={handleAddSong}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Create your own →
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredSongs.map((song) => (
              <div
                key={song.id}
                onClick={() => handleEditSong(song)}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Music className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">{song.title}</h3>
                    <p className="text-sm text-slate-500">
                      {song.writer || 'Unknown writer'}
                      {song.importedFrom && (
                        <span className="ml-2 text-xs text-blue-600">• Imported</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Library className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Import from Zone</h2>
                    <p className="text-sm text-slate-500">Select songs to import</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {zoneSongs.length === 0 ? (
                <div className="text-center py-8">
                  <Music className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No songs available to import</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {zoneSongs.map((song) => (
                    <div
                      key={song.id}
                      onClick={() => toggleImportSelection(song.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedForImport.includes(song.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedForImport.includes(song.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-slate-300'
                          }`}>
                          {selectedForImport.includes(song.id) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{song.title}</p>
                          <p className="text-sm text-slate-500 truncate">{song.writer || 'Unknown'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  {selectedForImport.length} selected
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={selectedForImport.length === 0 || importing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <>
                        <CustomLoader size="sm" />
                        <span>Importing...</span>
                      </>
                    ) : 'Import Selected'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standard Edit Modal */}
      <EditSongModal 
        isOpen={showSongModal}
        onClose={() => setShowSongModal(false)}
        song={editingSong ? toPraiseNightSong(editingSong as any) : null}
        categories={standardCategories}
        praiseNightCategories={standardPrograms as any}
        onUpdate={handleModalUpdate}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
