"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Music, 
  X, 
  Library, 
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { BackendAPI } from '@/lib/api-client';
import CustomLoader from '@/components/CustomLoader';
import { normalizeSearchString } from '@/utils/string-utils';

interface SubGroupCloneModalProps {
  onClose: () => void;
  zoneId: string;
  subGroupId: string;
  onSuccess: (songId: string) => void;
}

export default function SubGroupCloneModal({ 
  onClose, 
  zoneId, 
  subGroupId, 
  onSuccess 
}: SubGroupCloneModalProps) {
  const [masterSongs, setMasterSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMasterSongs();
  }, []);

  const loadMasterSongs = async () => {
    setLoading(true);
    try {
      const res: any = await BackendAPI.songs.getAll({ limit: 5000 });
      const songs = Array.isArray(res) ? res : (res?.data || []);
      setMasterSongs(songs);
    } catch (error) {
      console.error('Error loading master library:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = useMemo(() => {
    if (!searchTerm) return masterSongs;
    const query = normalizeSearchString(searchTerm);
    return masterSongs.filter(song => 
      normalizeSearchString(song.title).includes(query) || 
      normalizeSearchString(song.writer || '').includes(query) ||
      normalizeSearchString(song.leadSinger || '').includes(query)
    );
  }, [masterSongs, searchTerm]);

  const handleImport = async (song: any) => {
    if (importingId) return;
    setImportingId(song.id);
    try {
      const created: any = await BackendAPI.subgroups.createSong({
        ...song,
        subGroupId,
        zoneId,
        importedFrom: song.id
      });
      const newId = created?.id || created?.data?.id || song.id;
      setImportHistory(prev => new Set(prev).add(song.id));
      onSuccess(newId);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-[120] p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-[0_20px_70px_rgba(0,0,0,0.15)] overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[85vh]">
        
        {/* Header - Purple Accent */}
        <div className="p-10 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20">
              <Library className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Song Library</h2>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">Available Tracks</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-10 py-6 bg-slate-50/50 border-b border-slate-100">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-purple-600/5 focus:border-purple-600 transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-4 bg-white">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <CustomLoader size="sm" />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4">Connecting to Hub...</p>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="py-20 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem]">
              <Music className="w-12 h-12 text-slate-100 mx-auto mb-4" />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No matching results</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredSongs.map((song) => (
                <div 
                  key={song.id}
                  className="group flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[2rem] hover:border-purple-200 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-6 min-w-0">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                      <Music className="w-5 h-5 text-slate-300 group-hover:text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 text-sm truncate">{song.title}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">
                        {song.leadSinger ? `${song.leadSinger} • ` : ''}{song.writer || 'Central'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleImport(song)}
                    disabled={importingId === song.id || importHistory.has(song.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                      importHistory.has(song.id)
                        ? 'bg-green-50 text-green-600 border border-green-100'
                        : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-600/10'
                    } disabled:opacity-50`}
                  >
                    {importingId === song.id ? (
                      <CustomLoader size="sm" />
                    ) : importHistory.has(song.id) ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Cloned
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" /> Clone
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-slate-300" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Tracks will be added directly to your songs.</span>
          </div>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-white border border-slate-200 text-slate-900 font-black rounded-xl hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest shadow-sm"
          >
            Finished
          </button>
        </div>
      </div>
    </div>
  );
}
