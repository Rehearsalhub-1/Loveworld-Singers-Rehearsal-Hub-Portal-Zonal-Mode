"use client";

import React, { useState } from 'react';
import { X, Search, Check, Download, Upload, Music, Plus, ArrowUpDown, Trash2 } from 'lucide-react';
import { MasterSong, MasterProgram } from '@/types/master-library';

interface MasterLibraryModalsProps {
  // Publish Modal
  showPublishModal: boolean;
  setShowPublishModal: (show: boolean) => void;
  availableForPublish: any[];
  selectedForPublish: string[];
  setSelectedForPublish: (ids: string[]) => void;
  handlePublish: () => void;
  publishing: boolean;
  isLoadingMore: boolean;
  hasMoreInternal: boolean;
  onLoadMoreInternal: () => void;

  // Import Modal
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
  selectedSong: MasterSong | null;
  zonePraiseNights: any[];
  selectedPraiseNight: string;
  setSelectedPraiseNight: (id: string) => void;
  handleImport: () => void;
  importing: boolean;

  // Program Modals
  showCreateProgramModal: boolean;
  setShowCreateProgramModal: (show: boolean) => void;
  handleCreateProgram: (name: string, description: string) => void;
  showOrderProgramsModal: boolean;
  setShowOrderProgramsModal: (show: boolean) => void;
  programs: MasterProgram[];
  handleUpdateProgramOrder: (updatedPrograms: MasterProgram[]) => void;

  // Create Song Modal
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  handleCreateSong: (songData: any) => void;
  isHQAdmin: boolean;
}

export const MasterLibraryModals: React.FC<MasterLibraryModalsProps> = ({
  showPublishModal,
  setShowPublishModal,
  availableForPublish,
  selectedForPublish,
  setSelectedForPublish,
  handlePublish,
  publishing,
  isLoadingMore,
  hasMoreInternal,
  onLoadMoreInternal,

  showImportModal,
  setShowImportModal,
  selectedSong,
  zonePraiseNights,
  selectedPraiseNight,
  setSelectedPraiseNight,
  handleImport,
  importing,

  showCreateProgramModal,
  setShowCreateProgramModal,
  handleCreateProgram,
  showOrderProgramsModal,
  setShowOrderProgramsModal,
  programs,
  handleUpdateProgramOrder,

  showCreateModal,
  setShowCreateModal,
  handleCreateSong,
  isHQAdmin
}) => {
  const [progName, setProgName] = useState('');
  const [progDesc, setProgDesc] = useState('');
  const [reorderingPrograms, setReorderingPrograms] = useState<MasterProgram[]>(programs);

  // For Create Song Modal (Simplified for now)
  const [newSong, setNewSong] = useState<Partial<MasterSong>>({
    title: '',
    writer: '',
    leadSinger: '',
    category: '',
    lyrics: '',
    solfa: ''
  });

  return (
    <>
      {/* Publish Modal (Import from HQ Internal) */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Import to Master Library</h3>
                  <p className="text-white/70 text-xs">Select songs from HQ Internal to publish globally</p>
                </div>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="p-2 hover:bg-white/10 text-white/80 hover:text-white rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableForPublish.map(song => {
                  const songKey = song.id || '';
                  const isSelected = selectedForPublish.includes(songKey);
                  return (
                    <button
                      key={songKey}
                      onClick={() => {
                        const id = songKey;
                        if (isSelected) setSelectedForPublish(selectedForPublish.filter(sid => sid !== id));
                        else setSelectedForPublish([...selectedForPublish, id]);
                      }}
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group ${isSelected
                        ? 'bg-purple-600 border-purple-600 shadow-lg shadow-purple-200'
                        : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-md'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                        {isSelected ? <Check className="w-5 h-5 text-white" /> : <Music className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>{song.title}</p>
                        <p className={`text-[10px] uppercase font-bold tracking-widest ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{song.leadSinger || 'No Singer'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {hasMoreInternal && (
                <button
                  onClick={onLoadMoreInternal}
                  disabled={isLoadingMore}
                  className="w-full mt-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  {isLoadingMore ? <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /> : <Plus className="w-5 h-5" />}
                  {isLoadingMore ? 'Loading...' : 'Load More Songs'}
                </button>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-white">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-500">
                  <span className="font-bold text-purple-600">{selectedForPublish.length}</span> songs selected
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPublishModal(false)}
                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishing || selectedForPublish.length === 0}
                    className="flex items-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-200"
                  >
                    {publishing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                    Publish to Library
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import to Zone Modal */}
      {showImportModal && selectedSong && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Download className="w-6 h-6" />
                </div>
                <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <h3 className="text-xl font-bold">Import Song to Zone</h3>
              <p className="text-white/70 text-sm mt-1">"{selectedSong.title}"</p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Select Praise Night / Event</label>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {zonePraiseNights.map(pn => (
                    <button
                      key={pn.id}
                      onClick={() => setSelectedPraiseNight(pn.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${selectedPraiseNight === pn.id
                        ? 'bg-purple-600 border-purple-600 shadow-lg shadow-purple-100'
                        : 'bg-white border-slate-200 hover:border-purple-300'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${selectedPraiseNight === pn.id ? 'text-white' : 'text-slate-900'}`}>{pn.title}</p>
                        <p className={`text-[10px] mt-0.5 ${selectedPraiseNight === pn.id ? 'text-white/60' : 'text-slate-400'}`}>{new Date(pn.date).toLocaleDateString()}</p>
                      </div>
                      {selectedPraiseNight === pn.id && <Check className="w-5 h-5 text-white" />}
                    </button>
                  ))}
                  {zonePraiseNights.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-slate-400 text-sm">No praise nights found in your zone.</p>
                      <p className="text-xs text-slate-400 mt-1">Please create one in the Praise Nights section first.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || !selectedPraiseNight}
                  className="flex-[2] py-3.5 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
                >
                  {importing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download className="w-5 h-5" />}
                  Import to Zone
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Program Modal */}
      {showCreateProgramModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 bg-violet-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">New Master Program</h3>
              </div>
              <button onClick={() => setShowCreateProgramModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Program Name</label>
                <input
                  type="text"
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                  placeholder="e.g. Easter Youth Camp 2024"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Description (Optional)</label>
                <textarea
                  value={progDesc}
                  onChange={(e) => setProgDesc(e.target.value)}
                  placeholder="Notes about this program..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all h-24 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateProgramModal(false)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleCreateProgram(progName, progDesc);
                    setProgName('');
                    setProgDesc('');
                  }}
                  disabled={!progName.trim()}
                  className="flex-[2] py-3 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 disabled:opacity-50 transition-all shadow-lg"
                >
                  Create Program
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Programs Modal */}
      {showOrderProgramsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <ArrowUpDown className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Reorder Programs</h3>
              </div>
              <button onClick={() => setShowOrderProgramsModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
              {reorderingPrograms.map((prog, index) => (
                <div key={prog.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        if (index === 0) return;
                        const newList = [...reorderingPrograms];
                        [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
                        setReorderingPrograms(newList);
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-purple-600 disabled:opacity-20"
                      disabled={index === 0}
                    >
                      <Plus className="w-4 h-4 rotate-180" /> {/* Should be arrow up */}
                    </button>
                    <button
                      onClick={() => {
                        if (index === reorderingPrograms.length - 1) return;
                        const newList = [...reorderingPrograms];
                        [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
                        setReorderingPrograms(newList);
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-purple-600 disabled:opacity-20"
                      disabled={index === reorderingPrograms.length - 1}
                    >
                      <Plus className="w-4 h-4" /> {/* Should be arrow down */}
                    </button>
                  </div>
                  <div className="flex-1 truncate">
                    <p className="text-sm font-bold text-slate-800">{prog.name}</p>
                    <p className="text-[10px] text-slate-400">{prog.songIds?.length || 0} Songs</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowOrderProgramsModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-colors">Cancel</button>
              <button
                onClick={() => {
                  handleUpdateProgramOrder(reorderingPrograms);
                  setShowOrderProgramsModal(false);
                }}
                className="flex-[2] py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 shadow-lg"
              >
                Save Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Create Song Modal (Simplified) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 bg-green-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Add Song Manually</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Song Title</label>
                <input
                  type="text"
                  value={newSong.title}
                  onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Writer</label>
                <input
                  type="text"
                  value={newSong.writer}
                  onChange={(e) => setNewSong({ ...newSong, writer: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Lead Singer</label>
                <input
                  type="text"
                  value={newSong.leadSinger}
                  onChange={(e) => setNewSong({ ...newSong, leadSinger: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
                <input
                  type="text"
                  value={newSong.category}
                  onChange={(e) => setNewSong({ ...newSong, category: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Lyrics</label>
                <textarea
                  value={newSong.lyrics}
                  onChange={(e) => setNewSong({ ...newSong, lyrics: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all h-32 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-colors">Cancel</button>
              <button
                onClick={() => handleCreateSong(newSong)}
                disabled={!newSong.title}
                className="flex-[2] py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 shadow-lg"
              >
                Add to Library
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
