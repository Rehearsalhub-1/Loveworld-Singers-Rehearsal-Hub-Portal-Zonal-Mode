"use client";

import React from 'react';
import {
  FileText,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Music,
  Plus,
  CheckSquare,
  Square,
  ChevronDown
} from 'lucide-react';
import { MasterSong, MasterProgram } from '@/types/master-library';

interface MasterLibrarySongTableProps {
  songs: MasterSong[];
  canManage: boolean;
  selectedSongIds: Set<string>;
  setSelectedSongIds: (ids: Set<string>) => void;
  onSongClick: (song: MasterSong) => void;
  onEditClick: (song: MasterSong) => void;
  onDeleteClick: (id: string) => void;
  onImportClick: (song: MasterSong) => void;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  // Bulk actions
  isAssigningToProgram: boolean;
  setIsAssigningToProgram: (assigning: boolean) => void;
  setSongsToAssign: (songs: MasterSong[]) => void;
  programs: MasterProgram[];
  handleToggleSongInProgram: (songId: string, programId: string) => void;
}

export const MasterLibrarySongTable: React.FC<MasterLibrarySongTableProps> = ({
  songs,
  canManage,
  selectedSongIds,
  setSelectedSongIds,
  onSongClick,
  onEditClick,
  onDeleteClick,
  onImportClick,
  currentPage,
  totalPages,
  setCurrentPage,
  isLoadingMore,
  hasMore,
  onLoadMore,
  isAssigningToProgram,
  setIsAssigningToProgram,
  setSongsToAssign,
  programs,
  handleToggleSongInProgram
}) => {
  const [openDropdownId, setOpenDropdownId] = React.useState<string | null>(null);

  const toggleAll = () => {
    if (selectedSongIds.size === songs.length) {
      setSelectedSongIds(new Set());
    } else {
      setSelectedSongIds(new Set(songs.map(s => s.id)));
    }
  };

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedSongIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSongIds(newSet);
  };

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 mx-4 lg:mx-6">
        <Music className="w-16 h-16 text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">No songs found matching your filters</p>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {canManage && (
                <th className="px-4 py-4 w-10">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-purple-600">
                    {selectedSongIds.size === songs.length ? <CheckSquare className="w-5 h-5 text-purple-600" /> : <Square className="w-5 h-5" />}
                  </button>
                </th>
              )}
              <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Song Detail</th>
              <th className="hidden md:table-cell px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Category</th>
              <th className="hidden lg:table-cell px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Imports</th>
              <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {songs.map(song => (
              <tr key={song.id} className="hover:bg-slate-50 transition-colors group">
                {canManage && (
                  <td className="px-4 py-4">
                    <button onClick={() => toggleOne(song.id)} className="text-slate-400 hover:text-purple-600">
                      {selectedSongIds.has(song.id) ? <CheckSquare className="w-5 h-5 text-purple-600" /> : <Square className="w-5 h-5" />}
                    </button>
                  </td>
                )}
                <td className="px-4 lg:px-6 py-4" onClick={() => onSongClick(song)}>
                  <div className="flex flex-col cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-1">{song.title}</span>
                      {song.isHQOnly && (
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[9px] font-black rounded uppercase tracking-wider whitespace-nowrap">HQ ONLY</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 line-clamp-1">{song.writer || 'Unknown Writer'} • {song.leadSinger || 'Unknown Singer'}</span>
                    <div className="flex md:hidden mt-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">{song.category || 'Other'}</span>
                    </div>
                  </div>
                </td>
                <td className="hidden md:table-cell px-6 py-4 text-center">
                  <span className="px-3 py-1 bg-purple-50 text-purple-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {song.category || 'Other'}
                  </span>
                </td>
                <td className="hidden lg:table-cell px-6 py-4 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-slate-700">{song.importCount || 0}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">Zones</span>
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-4">
                  <div className="flex items-center justify-end gap-1 sm:gap-2">
                    {canManage ? (
                      <>
                        {/* Programs Dropdown for Single Song */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === song.id ? null : song.id);
                            }}
                            className={`p-2 rounded-lg transition-all ${openDropdownId === song.id ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-600'}`}
                            title="Add to Program"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          {openDropdownId === song.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-20" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                }} 
                              />
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-30 min-w-[180px] p-2">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 pb-2 border-b border-slate-100 mb-1">Add to Program</p>
                                {programs.length === 0 ? (
                                  <p className="text-[10px] text-slate-400 px-2 py-2">No programs created</p>
                                ) : (
                                  <div className="max-h-[200px] overflow-y-auto relative z-30">
                                    {programs.map(p => {
                                      const isIn = p.songIds?.includes(song.id);
                                      return (
                                        <button
                                          key={p.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleSongInProgram(song.id, p.id);
                                          }}
                                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${isIn ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                          <span className="truncate pr-2">{p.name}</span>
                                          {isIn && <div className="w-1.5 h-1.5 bg-violet-600 rounded-full flex-shrink-0" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <button onClick={() => onEditClick(song)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-amber-100 hover:text-amber-600 transition-all" title="Edit">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDeleteClick(song.id)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-all" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => onImportClick(song)} className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm text-xs font-bold whitespace-nowrap">
                        <Download className="w-3.5 h-3.5" />
                        IMPORT
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination & Load More */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pb-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:border-purple-300 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${currentPage === pageNum ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-purple-300 shadow-sm'}`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && <span className="text-slate-400 px-1">...</span>}
          </div>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:border-purple-300 transition-colors shadow-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {hasMore && (
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:border-purple-300 transition-all shadow-sm flex items-center gap-2 text-sm"
          >
            {isLoadingMore ? (
              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Load More from Database
          </button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {canManage && selectedSongIds.size > 0 && (
        <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in zoom-in slide-in-from-bottom-10 duration-500 w-[95%] max-w-fit">
          <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 px-4 md:px-8 py-3 md:py-5 rounded-2xl md:rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex items-center gap-3 md:gap-8 text-white">
            <div className="flex items-center gap-2 md:gap-4 pr-3 md:pr-8 border-r border-white/10">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center text-xs md:text-sm font-black shadow-lg">
                {selectedSongIds.size}
              </div>
              <div className="hidden sm:block">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-tight">Selected</p>
                <p className="text-xs font-black text-white">Bulk Actions</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <div className="relative group/bulk">
                <button
                  onClick={() => {
                    const selectedSongs = songs.filter(s => selectedSongIds.has(s.id));
                    setSongsToAssign(selectedSongs);
                    setIsAssigningToProgram(!isAssigningToProgram);
                  }}
                  className={`px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold tracking-widest uppercase transition-all flex items-center gap-2 md:gap-3 ${isAssigningToProgram ? 'bg-violet-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  <Music className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden xs:inline">Add to Program</span>
                  <span className="xs:hidden">Program</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isAssigningToProgram ? 'rotate-180' : ''}`} />
                </button>

                {isAssigningToProgram && (
                  <div className="absolute bottom-full left-0 mb-4 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl p-2 min-w-[200px]">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest p-2 border-b border-white/5 mb-1">Select Program</p>
                    <div className="max-h-[200px] overflow-y-auto">
                      {programs.length === 0 ? (
                        <p className="text-[10px] text-white/60 p-2">No programs found</p>
                      ) : (
                        programs.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              const selectedSongs = songs.filter(s => selectedSongIds.has(s.id));
                              // We use the bulk action handler from parent
                              // (In this case, we'll need to pass the programId back)
                              // I'll call a hypothetical 'handleBulkAddToProgram(p.id)'
                              // Which I'll ensure is in the props
                            }}
                            className="w-full text-left px-4 py-2.5 rounded-xl text-xs text-white/80 hover:bg-white/10 transition-colors flex items-center justify-between"
                          >
                            {p.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedSongIds(new Set())}
                className="px-3 md:px-6 py-2 md:py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold tracking-widest uppercase transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
