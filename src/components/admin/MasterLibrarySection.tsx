"use client";

import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import CustomLoader from '@/components/CustomLoader';
import { MasterSongDetailSheet } from './MasterSongDetailSheet';
import { MasterEditSongModal } from './MasterEditSongModal';
import { useMasterLibrary } from '@/hooks/useMasterLibrary';

// Modularized Components
import { MasterLibraryHeader } from './master-library/MasterLibraryHeader';
import { MasterLibraryFilters } from './master-library/MasterLibraryFilters';
import { MasterLibrarySongTable } from './master-library/MasterLibrarySongTable';
import { MasterLibraryModals } from './master-library/MasterLibraryModals';

interface MasterLibrarySectionProps {
  isHQAdmin?: boolean;
}

export default function MasterLibrarySection({ isHQAdmin = false }: MasterLibrarySectionProps) {
  const ml = useMasterLibrary(isHQAdmin);

  if (ml.loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <CustomLoader message="Loading Master Library..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-[600px] h-[600px] bg-indigo-100/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
        {/* Header & Stats */}
        <MasterLibraryHeader
          stats={ml.stats}
          canManage={ml.canManage}
          setShowCreateModal={ml.setShowCreateModal}
          setShowPublishModal={ml.setShowPublishModal}
        />

        {/* Filters */}
        <MasterLibraryFilters
          searchTerm={ml.searchTerm}
          setSearchTerm={ml.setSearchTerm}
          sortOrder={ml.sortOrder}
          setSortOrder={ml.setSortOrder}
          selectedLeadSinger={ml.selectedLeadSinger}
          setSelectedLeadSinger={ml.setSelectedLeadSinger}
          isLeadSingerDropdownOpen={ml.isLeadSingerDropdownOpen}
          setIsLeadSingerDropdownOpen={ml.setIsLeadSingerDropdownOpen}
          leadSingers={ml.leadSingers}
          selectedProgramId={ml.selectedProgramId}
          setSelectedProgramId={ml.setSelectedProgramId}
          isProgramsDropdownOpen={ml.isProgramsDropdownOpen}
          setIsProgramsDropdownOpen={ml.setIsProgramsDropdownOpen}
          programs={ml.programs}
          canManage={ml.canManage}
          setShowCreateProgramModal={ml.setShowCreateProgramModal}
          setShowOrderProgramsModal={ml.setShowOrderProgramsModal}
          handleDeleteProgram={ml.handleDeleteProgram}
        />

        {/* Song Table */}
        <MasterLibrarySongTable
          songs={ml.paginatedSongs}
          canManage={ml.canManage}
          selectedSongIds={ml.selectedSongIds}
          setSelectedSongIds={ml.setSelectedSongIds}
          onSongClick={(song) => {
            ml.setSelectedSong(song);
            ml.setShowDetailsModal(true);
          }}
          onEditClick={(song) => {
            ml.setSelectedSong(song);
            ml.setShowEditModal(true);
          }}
          onDeleteClick={ml.handleDelete}
          onImportClick={(song) => {
            ml.setSelectedSong(song);
            ml.setShowImportModal(true);
          }}
          currentPage={ml.currentPage}
          totalPages={ml.totalPages}
          setCurrentPage={ml.setCurrentPage}
          isLoadingMore={ml.isLoadingMore}
          hasMore={ml.hasMoreMasterSongs}
          onLoadMore={ml.loadMoreMasterSongs}
          isAssigningToProgram={ml.isAssigningToProgram}
          setIsAssigningToProgram={ml.setIsAssigningToProgram}
          setSongsToAssign={ml.setSongsToAssign}
          programs={ml.programs}
          handleToggleSongInProgram={ml.handleToggleSongInProgram}
        />

        {/* Modals Orchestrator */}
        <MasterLibraryModals
          showPublishModal={ml.showPublishModal}
          setShowPublishModal={ml.setShowPublishModal}
          availableForPublish={ml.availableForPublish}
          selectedForPublish={ml.selectedForPublish}
          setSelectedForPublish={ml.setSelectedForPublish}
          handlePublish={ml.handlePublish}
          publishing={ml.publishing}
          isLoadingMore={ml.isLoadingMore}
          hasMoreInternal={ml.hasMoreInternalSongs}
          onLoadMoreInternal={ml.loadMoreInternalSongs}
          showImportModal={ml.showImportModal}
          setShowImportModal={ml.setShowImportModal}
          selectedSong={ml.selectedSong}
          zonePraiseNights={ml.zonePraiseNights}
          selectedPraiseNight={ml.selectedPraiseNight}
          setSelectedPraiseNight={ml.setSelectedPraiseNight}
          handleImport={ml.handleImport}
          importing={ml.importing}
          showCreateProgramModal={ml.showCreateProgramModal}
          setShowCreateProgramModal={ml.setShowCreateProgramModal}
          handleCreateProgram={ml.handleCreateProgram}
          showOrderProgramsModal={ml.showOrderProgramsModal}
          setShowOrderProgramsModal={ml.setShowOrderProgramsModal}
          programs={ml.programs}
          handleUpdateProgramOrder={ml.handleUpdateProgramOrder}
          showCreateModal={ml.showCreateModal}
          setShowCreateModal={ml.setShowCreateModal}
          handleCreateSong={ml.handleCreateSong}
          isHQAdmin={isHQAdmin}
        />

        {/* Separate Components (Existing) */}
        {ml.selectedSong && (
          <>
            <MasterSongDetailSheet
              isOpen={ml.showDetailsModal}
              onClose={() => {
                ml.setShowDetailsModal(false);
                ml.setSelectedSong(null);
              }}
              song={ml.selectedSong}
            />
            <MasterEditSongModal
              isOpen={ml.showEditModal}
              onClose={() => {
                ml.setShowEditModal(false);
                ml.setSelectedSong(null);
              }}
              song={ml.selectedSong}
              onSongUpdated={ml.loadData}
              mode="edit"
            />
          </>
        )}

        {ml.showCreateModal && (
          <MasterEditSongModal
            isOpen={ml.showCreateModal}
            onClose={() => ml.setShowCreateModal(false)}
            onSongCreated={ml.loadData}
            mode="create"
          />
        )}

        {/* Toast Notification */}
        {ml.toast && (
          <div className={`fixed top-4 right-4 z-[10000] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-right-10 duration-300 ${ml.toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
            {ml.toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{ml.toast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
