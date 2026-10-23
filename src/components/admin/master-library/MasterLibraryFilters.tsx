"use client";

import React from 'react';
import { Search, Filter, ChevronDown, Music, ArrowUpDown, Plus } from 'lucide-react';
import { MasterProgram } from '@/types/master-library';

interface MasterLibraryFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  selectedLeadSinger: string;
  setSelectedLeadSinger: (singer: string) => void;
  isLeadSingerDropdownOpen: boolean;
  setIsLeadSingerDropdownOpen: (open: boolean) => void;
  leadSingers: string[];
  selectedProgramId: string;
  setSelectedProgramId: (id: string) => void;
  isProgramsDropdownOpen: boolean;
  setIsProgramsDropdownOpen: (open: boolean) => void;
  programs: MasterProgram[];
  canManage: boolean;
  setShowCreateProgramModal: (show: boolean) => void;
  setShowOrderProgramsModal: (show: boolean) => void;
  handleDeleteProgram: (id: string) => void;
}

export const MasterLibraryFilters: React.FC<MasterLibraryFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  sortOrder,
  setSortOrder,
  selectedLeadSinger,
  setSelectedLeadSinger,
  isLeadSingerDropdownOpen,
  setIsLeadSingerDropdownOpen,
  leadSingers,
  selectedProgramId,
  setSelectedProgramId,
  isProgramsDropdownOpen,
  setIsProgramsDropdownOpen,
  programs,
  canManage,
  setShowCreateProgramModal,
  setShowOrderProgramsModal,
  handleDeleteProgram
}) => {
  return (
    <div className="mb-6 space-y-4 px-4 lg:px-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search songs by title, writer, or lead singer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
          {/* Sort Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 px-3 lg:px-4 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-medium hover:border-purple-300 transition-all shadow-sm"
            title={sortOrder === 'asc' ? 'Sort Z-A' : 'Sort A-Z'}
          >
            <Filter className="w-4 h-4 text-purple-500" />
            <span className="hidden sm:inline">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
          </button>

          {/* Lead Singer Filter */}
          <div className="relative">
            <button
              onClick={() => setIsLeadSingerDropdownOpen(!isLeadSingerDropdownOpen)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all shadow-sm border ${selectedLeadSinger
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{selectedLeadSinger || 'Lead Singer'}</span>
              <span className="sm:hidden">{selectedLeadSinger ? selectedLeadSinger.split(' ')[0] : 'Singer'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isLeadSingerDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLeadSingerDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsLeadSingerDropdownOpen(false)}
                />
                <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-20 min-w-[220px] max-h-[300px] overflow-y-auto">
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Filter by Lead Singer</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedLeadSinger('')
                      setIsLeadSingerDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!selectedLeadSinger
                      ? 'bg-purple-50 text-purple-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    All Lead Singers
                  </button>
                  {leadSingers.map(singer => (
                    <button
                      key={singer}
                      onClick={() => {
                        setSelectedLeadSinger(singer)
                        setIsLeadSingerDropdownOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedLeadSinger === singer
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      {singer}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Programs Filter */}
          <div className="relative">
            <button
              onClick={() => setIsProgramsDropdownOpen(!isProgramsDropdownOpen)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all shadow-sm border ${selectedProgramId
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                }`}
            >
              <Music className="w-4 h-4" />
              <span className="truncate max-w-[100px]">{selectedProgramId ? programs.find(p => p.id === selectedProgramId)?.name : 'Programs'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isProgramsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProgramsDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsProgramsDropdownOpen(false)}
                />
                <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-20 min-w-[220px] max-h-[300px] overflow-y-auto">
                  <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Filter by Program</p>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setShowOrderProgramsModal(true);
                            setIsProgramsDropdownOpen(false);
                          }}
                          className="p-1 hover:bg-slate-200 rounded text-amber-600"
                          title="Reorder Programs"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setShowCreateProgramModal(true);
                            setIsProgramsDropdownOpen(false);
                          }}
                          className="p-1 hover:bg-slate-200 rounded text-purple-600"
                          title="Create Program"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProgramId('')
                      setIsProgramsDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!selectedProgramId
                      ? 'bg-violet-50 text-violet-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    All Songs
                  </button>
                  {programs.map(program => (
                    <div key={program.id} className="relative group">
                      <button
                        onClick={() => {
                          setSelectedProgramId(program.id)
                          setIsProgramsDropdownOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedProgramId === program.id
                          ? 'bg-violet-50 text-violet-700 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                          }`}
                      >
                        <span className="truncate pr-6 block">{program.name}</span>
                        <span className="ml-2 text-[10px] text-slate-400">({program.songIds?.length || 0})</span>
                      </button>
                      {canManage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProgram(program.id);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Program"
                        >
                          <Plus className="w-3.5 h-3.5 rotate-45" /> {/* Use Plus rotated for Trash or search for Trash */}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
