import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Music, X, Filter } from 'lucide-react';
import { MasterSong } from '@/types/master-library';
import { BackendAPI } from '@/lib/api-client';
import { PraiseNightSong } from '@/types/supabase';
import CustomLoader from '@/components/CustomLoader';
import { normalizeSearchString } from '@/utils/string-utils';

interface CloneFromMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClone: (song: PraiseNightSong) => void;
  praiseNightId: string;
  defaultCategory: string;
}

export default function CloneFromMasterModal({
  isOpen,
  onClose,
  onClone,
  praiseNightId,
  defaultCategory
}: CloneFromMasterModalProps) {
  const [songs, setSongs] = useState<MasterSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSongs();
    }
  }, [isOpen]);

  const loadSongs = async () => {
    setLoading(true);
    try {
      const res: any = await BackendAPI.songs.getAll({ limit: 5000 }); 
      setSongs(Array.isArray(res) ? res : (res?.data || []));
    } catch (error) {
      console.error('Failed to load master songs for cloning:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      // Search Filter
      if (searchTerm) {
        const searchUpper = normalizeSearchString(searchTerm);
        const titleMatch = normalizeSearchString(song.title).includes(searchUpper);
        const writerMatch = song.writer && normalizeSearchString(song.writer).includes(searchUpper);
        const singerMatch = song.leadSinger && normalizeSearchString(song.leadSinger).includes(searchUpper);
        return titleMatch || writerMatch || singerMatch;
      }

      return true;
    });
  }, [songs, searchTerm]);

  const handleCloneClick = (masterSong: MasterSong) => {
    // Map MasterSong to PraiseNightSong structure for the edit form
    const clonedSong: PraiseNightSong = {
      id: '',
      title: masterSong.title,
      status: 'unheard', // Default to unheard
      category: defaultCategory || masterSong.category || '',
      categories: masterSong.categories || (masterSong.category ? [masterSong.category] : []),
      praiseNightId: praiseNightId,
      leadSinger: masterSong.leadSinger || '',
      writer: masterSong.writer || '',
      conductor: masterSong.conductor || '',
      key: masterSong.key || '',
      tempo: masterSong.tempo || '',
      lyrics: masterSong.lyrics || '',
      solfas: masterSong.solfa || '',
      leadKeyboardist: masterSong.leadKeyboardist || '',
      leadGuitarist: masterSong.bassGuitarist || '',
      bassGuitarist: masterSong.bassGuitarist || '',
      drummer: masterSong.drummer || '',
      comments: [],
      audioFile: masterSong.audioUrls?.full || masterSong.audioFile || '',
      audioUrls: masterSong.audioUrls || {},
      customParts: masterSong.customParts || [],
      availableParts: masterSong.audioUrls ? Object.keys(masterSong.audioUrls).filter(k => masterSong.audioUrls[k]) : [],
      history: []
    };

    onClone(clonedSong);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-xl">
              <Music className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Clone from Master Library</h2>
              <p className="text-sm text-slate-500">Select a song to add to this Praise Night</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-white sm:px-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, writer, or singer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          {loading ? (
            <div className="flex flex-col flex-1 items-center justify-center p-12 h-64">
              <CustomLoader size="md" />
              <p className="mt-4 text-sm text-slate-500 font-medium">Loading master library...</p>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Music className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 text-lg font-medium">No songs found in Master Library.</p>
              {searchTerm && <p className="text-sm text-slate-400 mt-1">Try adjusting your search criteria</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSongs.map(song => (
                <div key={song.id} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all group flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 pr-4">
                      <h3 className="font-bold text-slate-900 truncate" title={song.title}>{song.title}</h3>
                      <p className="text-sm text-slate-500 truncate mt-0.5">
                        {song.writer && `Written by ${song.writer}`}
                        {song.writer && song.leadSinger && ' • '}
                        {song.leadSinger && `Led by ${song.leadSinger}`}
                      </p>
                    </div>
                    <span className="shrink-0 bg-green-100 text-green-700 text-[10px] uppercase font-bold px-2 py-1 rounded-full whitespace-nowrap">
                      Mintered
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4 text-xs">
                    {song.key && (
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium border border-slate-200">
                         {song.key}
                      </span>
                    )}
                    {song.category && (
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium border border-slate-200 truncate max-w-[120px]" title={song.category}>
                        {song.category}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-auto">
                    <button
                      onClick={() => handleCloneClick(song)}
                      className="w-full py-2 bg-purple-50 text-purple-700 font-semibold rounded-lg border border-purple-200 hover:bg-purple-100 hover:text-purple-800 transition-colors"
                    >
                      Clone to Program
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
