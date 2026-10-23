"use client";

import React from 'react';
import { Library, Music, Download, BarChart3, Plus, Upload } from 'lucide-react';
import { MasterSong } from '@/types/master-library';

interface MasterLibraryHeaderProps {
  stats: {
    totalSongs: number;
    totalImports: number;
    mostImported: MasterSong[];
  };
  canManage: boolean;
  setShowCreateModal: (show: boolean) => void;
  setShowPublishModal: (show: boolean) => void;
}

export const MasterLibraryHeader: React.FC<MasterLibraryHeaderProps> = ({
  stats,
  canManage,
  setShowCreateModal,
  setShowPublishModal
}) => {
  return (
    <>
      {/* Mobile Stats Header */}
      <div className="lg:hidden bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Library className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-xs">Master Library</p>
              <p className="text-white font-bold text-lg">{stats.totalSongs} songs</p>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2.5 bg-white/20 text-white rounded-xl transition-colors active:scale-95"
                title="Create New Song"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowPublishModal(true)}
                className="p-2.5 bg-white/20 text-white rounded-xl transition-colors active:scale-95"
                title="Import from Internal"
              >
                <Upload className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 lg:p-6 pb-0 lg:pb-0">
        {/* Header - Desktop Only */}
        <div className="hidden lg:block mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Library className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Master Library</h1>
                <p className="text-slate-500 text-sm">
                  {canManage
                    ? 'Publish songs for zones to access'
                    : 'Browse and import songs to your zone'}
                </p>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create New
                </button>
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Import from Internal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 mb-4 lg:mb-6 scrollbar-hide">
          <div className="flex-shrink-0 w-[140px] lg:w-auto bg-white rounded-2xl lg:rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 lg:p-2 bg-purple-100 rounded-xl lg:rounded-lg">
                <Music className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalSongs}</p>
                <p className="text-xs lg:text-sm text-slate-500 whitespace-nowrap">Songs</p>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 w-[140px] lg:w-auto bg-white rounded-2xl lg:rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 lg:p-2 bg-green-100 rounded-xl lg:rounded-lg">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalImports}</p>
                <p className="text-xs lg:text-sm text-slate-500 whitespace-nowrap">Imports</p>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 w-[140px] lg:w-auto bg-white rounded-2xl lg:rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 lg:p-2 bg-blue-100 rounded-xl lg:rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.mostImported[0]?.importCount || 0}
                </p>
                <p className="text-xs lg:text-sm text-slate-500 whitespace-nowrap">Top Imports</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
