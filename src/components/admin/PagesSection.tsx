"use client";

import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  FileText,
  Plus,
  ChevronLeft,
  Edit,
  Trash2,
  Music,
  ArrowDownUp
} from "lucide-react";
import { PraiseNightSong, PraiseNight, Category } from '../../types/supabase';
import { Toast } from '../Toast';
import { useAdminTheme } from './AdminThemeProvider';
import CustomLoader from '@/components/CustomLoader';
import { normalizeSearchString } from '@/utils/string-utils';
import CloneFromMasterModal from './CloneFromMasterModal';

interface PagesSectionProps {
  allPraiseNights: PraiseNight[] | null;
  loading: boolean;
  selectedPage: PraiseNight | null;
  setSelectedPage: (page: PraiseNight | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  allSongs: PraiseNightSong[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: 'all' | 'heard' | 'unheard';
  setStatusFilter: (filter: 'all' | 'heard' | 'unheard') => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  showPageModal: boolean;
  setShowPageModal: (show: boolean) => void;
  editingPage: PraiseNight | null;
  setEditingPage: (page: PraiseNight | null) => void;
  newPageName: string;
  setNewPageName: (name: string) => void;
  newPageDate: string;
  setNewPageDate: (date: string) => void;
  newPageLocation: string;
  setNewPageLocation: (location: string) => void;
  newPageDescription: string;
  setNewPageDescription: (description: string) => void;
  newPageCategory: 'unassigned' | 'pre-rehearsal' | 'ongoing' | 'archive';
  setNewPageCategory: (category: 'unassigned' | 'pre-rehearsal' | 'ongoing' | 'archive') => void;
  newPagePageCategory: string; // New prop
  setNewPagePageCategory: (pageCategory: string) => void; // New prop
  newPageDays: number;
  setNewPageDays: (days: number) => void;
  newPageHours: number;
  setNewPageHours: (hours: number) => void;
  newPageMinutes: number;
  setNewPageMinutes: (minutes: number) => void;
  newPageSeconds: number;
  setNewPageSeconds: (seconds: number) => void;
  newPageBannerImage: string;
  setNewPageBannerImage: (image: string) => void;
  newPageBannerFile: File | null;
  setNewPageBannerFile: (file: File | null) => void;
  isCreatingPage: boolean;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  pageToDelete: PraiseNight | null;
  setPageToDelete: (page: PraiseNight | null) => void;
  showCategoryOrderModal: boolean;
  setShowCategoryOrderModal: (show: boolean) => void;
  handleAddPage: () => void;
  handleEditPage: (page: PraiseNight) => void;
  handleUpdatePage: () => void;
  handleDeletePage: (page: PraiseNight) => void;
  confirmDeletePage: () => void;
  cancelDeletePage: () => void;
  handleEditSong: (song: PraiseNightSong) => void;
  handleDeleteSong: (song: PraiseNightSong) => void;
  handleToggleSongStatus: (song: PraiseNightSong) => void;
  handleToggleSongActive: (song: PraiseNightSong) => void;
  allCategories: Category[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  // Page Category Sorting Props
  pageCategories: any[];
  showPageCategoryOrderModal: boolean;
  setShowPageCategoryOrderModal: (show: boolean) => void;
  handleUpdatePageCategoryOrder: (updatedCategories: any[]) => Promise<void>;
}

export default function PagesSection(props: PagesSectionProps) {
  const { theme } = useAdminTheme();

  // UI state
  const [pagesDisplayLimit, setPagesDisplayLimit] = useState(10);
  const [showCloneModal, setShowCloneModal] = useState(false);

  const {
    allPraiseNights,
    loading,
    selectedPage,
    setSelectedPage,
    selectedCategory,
    setSelectedCategory,
    allSongs,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    showPageModal,
    setShowPageModal,
    editingPage,
    newPageName,
    setNewPageName,
    newPageDate,
    setNewPageDate,
    newPageLocation,
    setNewPageLocation,
    newPageDescription,
    setNewPageDescription,
    newPageCategory,
    setNewPageCategory,
    newPagePageCategory, // New prop
    setNewPagePageCategory, // New prop
    newPageDays,
    setNewPageDays,
    newPageHours,
    setNewPageHours,
    newPageMinutes,
    setNewPageMinutes,
    newPageSeconds,
    setNewPageSeconds,
    newPageBannerImage,
    setNewPageBannerImage,
    newPageBannerFile,
    setNewPageBannerFile,
    isCreatingPage,
    showDeleteDialog,
    pageToDelete,
    showCategoryOrderModal,
    setShowCategoryOrderModal,
    handleAddPage,
    handleEditPage,
    handleUpdatePage,
    handleDeletePage,
    confirmDeletePage,
    cancelDeletePage,
    handleEditSong,
    handleDeleteSong,
    handleToggleSongStatus,
    handleToggleSongActive,
    allCategories,
    addToast,
    setShowPageCategoryOrderModal
  } = props;

  // Computed data
  const pages = useMemo(() => {
    if (loading) {
      return [];
    }

    if (!allPraiseNights) {
      return [];
    }

    return [...allPraiseNights].sort((a, b) => {
      // Prioritize 'ongoing' category
      if (a.category === 'ongoing' && b.category !== 'ongoing') return -1;
      if (a.category !== 'ongoing' && b.category === 'ongoing') return 1;

      // Secondary sort by Date (descending - newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [allPraiseNights, loading]);

  // Computed data
  const filteredPages = useMemo(() => {
    // Reset pagination when filter changes
    setPagesDisplayLimit(10);

    if (!searchTerm) return pages;

    const query = normalizeSearchString(searchTerm);
    if (!query) return pages;

    // Filter by page category name or page name
    return pages.filter(page =>
      normalizeSearchString(page.pageCategory).includes(query) ||
      normalizeSearchString(page.name).includes(query)
    );
  }, [pages, searchTerm]);

  // Get page categories for filtering
  const pageCategories = useMemo(() => {
    const categories = filteredPages.map(page => ({
      id: page.id,
      name: page.name,
      description: 'Praise Night Event',
      date: page.date,
      location: page.location,
      icon: 'Music',
      color: '#8B5CF6',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      countdown: page.countdown
    }));

    return categories;
  }, [filteredPages]);

  // Get available song categories for filtering
  const availableCategories = useMemo(() => {
    if (!selectedPage) return [];

    // Match songs by page ID
    const pageSongs = allSongs.filter(song => {
      const songPraiseNightId = song.praiseNightId;
      const pageId = selectedPage.id;
      return songPraiseNightId === pageId || songPraiseNightId === pageId.toString();
    });
    const categories = [...new Set(pageSongs.map(song => song.category))];

    return categories;
  }, [allSongs, selectedPage]);

  // Filter and paginate songs
  const filteredSongs = useMemo(() => {
    if (!selectedPage) return [];

    return allSongs
      .filter(song => {
        // Match songs by page ID
        const songPraiseNightId = song.praiseNightId;
        const pageId = selectedPage.id;
        return songPraiseNightId === pageId || songPraiseNightId === pageId.toString();
      })
      .filter(song => {
        const query = normalizeSearchString(searchTerm);
        if (!query) return true;

        const matchesSearch =
          normalizeSearchString(song.title).includes(query) ||
          normalizeSearchString(song.writer).includes(query) ||
          normalizeSearchString(song.leadSinger).includes(query) ||
          normalizeSearchString(song.lyrics).includes(query) ||
          normalizeSearchString(song.solfas).includes(query) ||
          normalizeSearchString(song.key).includes(query) ||
          normalizeSearchString(song.tempo).includes(query) ||
          (song.comments && Array.isArray(song.comments) && song.comments.some(c => normalizeSearchString(c.text).includes(query)));

        const matchesStatus = statusFilter === 'all' || song.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || song.category === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort((a, b) => {
        // Sort by creation date to maintain consistent numbering
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
  }, [allSongs, selectedPage, searchTerm, statusFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white h-full">
        <CustomLoader message="Loading pages and songs..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full">
      {/* Pages List - Hidden on mobile when page is selected */}
      <div className={`w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col h-full ${selectedPage ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header - Hidden on mobile (shown in AdminMobileHeader) */}
        <div className="hidden lg:block p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Pages</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPageCategoryOrderModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                title="Sort Page Types"
              >
                <ArrowDownUp className="w-4 h-4" />
                <span className="hidden sm:inline">Sort Types</span>
              </button>
              <button
                onClick={() => {
                  setNewPageName('');
                  setNewPageDate('');
                  setNewPageLocation('');
                  setNewPageDescription('');
                  setNewPageCategory('unassigned');
                  setNewPageDays(0);
                  setNewPageHours(0);
                  setNewPageMinutes(0);
                  setNewPageSeconds(0);
                  setNewPageBannerImage('');
                  setNewPageBannerFile(null);
                  setShowPageModal(true);
                }}
                className={`flex items-center gap-2 px-3 py-2 ${theme.primary} text-white rounded-lg ${theme.primaryHover} transition-colors text-sm font-medium`}
              >
                <Plus className="w-4 h-4" />
                Add Page
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Mobile Search & Add */}
        <div className="lg:hidden p-4 border-b border-slate-100 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Mobile Add Button - Floating */}
        <button
          onClick={() => {
            setNewPageName('');
            setNewPageDate('');
            setNewPageLocation('');
            setNewPageDescription('');
            setNewPageCategory('unassigned');
            setNewPageDays(0);
            setNewPageHours(0);
            setNewPageMinutes(0);
            setNewPageSeconds(0);
            setNewPageBannerImage('');
            setNewPageBannerFile(null);
            setShowPageModal(true);
          }}
          className={`lg:hidden fixed bottom-20 right-4 z-[45] w-14 h-14 ${theme.primary} text-white rounded-full shadow-lg ${theme.primaryHover} transition-all active:scale-95 flex items-center justify-center`}
        >
          <Plus className="w-6 h-6" />
        </button>

        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="p-3 lg:p-4 space-y-2 lg:space-y-3">
            {filteredPages.slice(0, pagesDisplayLimit).map((page) => (
              <div
                key={page.id}
                onClick={() => {
                  setSelectedPage(page);
                  setSelectedCategory(null);
                  setCurrentPage(1);
                }}
                className={`
                  p-3 lg:p-4 rounded-2xl lg:rounded-lg border cursor-pointer transition-all duration-200 active:scale-[0.98] lg:active:scale-100
                  ${selectedPage?.id === page.id
                    ? `${theme.bg} ${theme.border} shadow-sm`
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{page.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{page.date}</p>
                    <p className="text-sm text-slate-500">{page.location}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${page.category === 'ongoing' ? 'bg-green-100 text-green-800' :
                          page.category === 'pre-rehearsal' ? 'bg-yellow-100 text-yellow-800' :
                            page.category === 'archive' ? 'bg-gray-100 text-gray-800' :
                              'bg-blue-100 text-blue-800'}
                      `}>
                        {page.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        {(() => {
                          const count = page.songCount !== undefined && page.songCount !== null
                            ? page.songCount
                            : allSongs.filter(song => {
                              const songPageId = song.praiseNightId || (song as any).praisenightid || (song as any).praisenight_id || (song as any).pageId;
                              return songPageId === page.id || songPageId === page.id.toString();
                            }).length;

                          return count > 0 ? `${count} songs` : null;
                        })()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPage(page);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePage(page);
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Load More Button for Pages */}
            {filteredPages.length > pagesDisplayLimit && (
              <div className="pt-2 pb-1">
                <button
                  onClick={() => setPagesDisplayLimit(prev => prev + 10)}
                  className={`w-full py-2.5 ${theme.text} hover:bg-purple-50 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2 border border-slate-200 bg-white`}
                >
                  <FileText className="w-4 h-4" />
                  Load More ({filteredPages.length - pagesDisplayLimit} remaining)
                </button>
              </div>
            )}

            {/* Show count */}
            {filteredPages.length > 0 && (
              <div className="text-center text-xs text-slate-500 pt-1">
                Showing {Math.min(pagesDisplayLimit, filteredPages.length)} of {filteredPages.length} pages
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Hidden on mobile when no page selected */}
      <div className={`flex-1 flex flex-col h-full ${!selectedPage ? 'hidden lg:flex' : 'flex'}`}>
        {selectedPage ? (
          <>
            {/* Mobile Header - Only visible on mobile */}
            <div className="lg:hidden sticky top-0 z-[40] bg-white/95 backdrop-blur-lg border-b border-slate-100">
              <div className="px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => setSelectedPage(null)}
                  className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
                  aria-label="Back to pages"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-semibold text-slate-900 truncate">{selectedPage.name}</h1>
                  <p className="text-xs text-slate-500 truncate">{selectedPage.date} • {selectedPage.location}</p>
                </div>
                <button
                  onClick={() => handleEditSong({
                    id: '',
                    title: '',
                    status: 'unheard',
                    category: selectedCategory || '',
                    praiseNightId: selectedPage?.id || '',
                    leadSinger: '',
                    writer: '',
                    conductor: '',
                    key: '',
                    tempo: '',
                    leadKeyboardist: '',
                    leadGuitarist: '',
                    drummer: '',
                    comments: [],
                    audioFile: '',
                    history: []
                  })}
                  className={`p-2.5 ${theme.primary} text-white rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm`}
                  aria-label="Add song"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowCloneModal(true)}
                  className={`p-2.5 bg-white border border-slate-300 text-purple-700 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm`}
                  title="Clone from Master Library"
                  aria-label="Clone song"
                >
                  <Music className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Desktop Page Header */}
            <div className="hidden lg:block bg-white border-b border-slate-200 p-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedPage(null)}
                    className="lg:hidden p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{selectedPage.name}</h1>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="w-4 h-4" />
                        {selectedPage.date}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <FileText className="w-4 h-4" />
                        {selectedPage.location}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleEditSong({
                      id: '',
                      title: '',
                      status: 'unheard',
                      category: selectedCategory || '',
                      praiseNightId: selectedPage?.id || '',
                      leadSinger: '',
                      writer: '',
                      conductor: '',
                      key: '',
                      tempo: '',
                      leadKeyboardist: '',
                      leadGuitarist: '',
                      drummer: '',
                      comments: [],
                      audioFile: '',
                      history: []
                    })}
                    className={`flex items-center gap-2 px-4 py-2 ${theme.primary} text-white rounded-lg ${theme.primaryHover} transition-colors font-medium`}
                  >
                    <Plus className="w-4 h-4" />
                    Add Song
                  </button>
                  <button
                    onClick={() => setShowCloneModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-purple-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    <Music className="w-4 h-4" />
                    Clone Master
                  </button>
                  <button
                    onClick={() => setShowCategoryOrderModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                    title="Reorder Categories"
                  >
                    <ArrowDownUp className="w-4 h-4" />
                    Sort Categories
                  </button>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white border-b border-slate-200 p-4 lg:p-6 flex-shrink-0">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search songs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'heard' | 'unheard')}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="heard">Heard</option>
                    <option value="unheard">Unheard</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {availableCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Songs Content */}
            <div className="flex-1 flex flex-col min-h-0">
              {filteredSongs.length > 0 ? (
                <>
                  {/* Songs Table - Desktop Only */}
                  <div className="hidden lg:block flex-1 overflow-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-medium text-slate-900 w-12">#</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-900">Song</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-900">Category</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-900">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-900">Active</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-900">Lead Singer</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-900">Writer</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-900">Conductor</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-900">Key</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-900">Tempo</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSongs
                          .slice(startIndex, startIndex + itemsPerPage)
                          .map((song, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-slate-50">
                              <td className="py-4 px-4 text-xs font-bold text-slate-400">
                                {startIndex + index + 1}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 ${theme.primaryLight} rounded-lg flex items-center justify-center`}>
                                    <Music className={`w-5 h-5 ${theme.text}`} />
                                  </div>
                                  <div>
                                    <div className="font-medium text-slate-900">{song.title}</div>
                                    <div className="text-sm text-gray-500">
                                      {song.leadKeyboardist} • {song.leadGuitarist} • {song.drummer}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-blue-800 whitespace-nowrap">
                                  {song.category}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <button
                                  onClick={() => handleToggleSongStatus(song)}
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${song.status === 'heard'
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                    }`}
                                >
                                  {song.status === 'heard' ? 'Heard' : 'Unheard'}
                                </button>
                              </td>
                              <td className="py-4 px-4">
                                <button
                                  onClick={() => handleToggleSongActive(song)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${(song as any).isActive
                                    ? theme.primary
                                    : 'bg-gray-200'
                                    }`}
                                  title={(song as any).isActive ? 'Active (Users see blinking border)' : 'Click to make active'}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(song as any).isActive ? 'translate-x-6' : 'translate-x-1'
                                      }`}
                                  />
                                </button>
                              </td>
                              <td className="py-4 px-4 text-sm text-slate-900">{song.leadSinger}</td>
                              <td className="py-4 px-4 text-sm text-slate-900">{song.writer}</td>
                              <td className="py-4 px-4 text-sm text-slate-900">{song.conductor}</td>
                              <td className="py-4 px-4 text-sm text-slate-900">{song.key}</td>
                              <td className="py-4 px-4 text-sm text-slate-900">{song.tempo}</td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditSong(song)}
                                    className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSong(song)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Songs Cards - Mobile Only */}
                  <div className="lg:hidden flex-1 overflow-auto bg-white">
                    {/* Song count */}
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                      <p className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{filteredSongs.length}</span> songs
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {filteredSongs
                        .slice(startIndex, startIndex + itemsPerPage)
                        .map((song, index) => (
                          <div key={index} className="bg-white">
                            {/* Main Row - Tappable */}
                            <div
                              className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 transition-colors"
                              onClick={() => handleEditSong(song)}
                            >
                              {/* Song Icon & Index */}
                              <div className="relative">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${song.status === 'heard'
                                  ? 'from-green-400 to-emerald-500'
                                  : 'from-purple-400 to-pink-500'
                                  } flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                  <Music className="w-6 h-6 text-white" />
                                </div>
                                <div className="absolute -top-1 -left-1 w-5 h-5 bg-slate-900 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                  {startIndex + index + 1}
                                </div>
                              </div>

                              {/* Song Info */}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-[15px] text-slate-900 truncate">{song.title}</h3>
                                <p className="text-sm text-slate-500 truncate">
                                  {song.leadSinger || song.writer || 'No artist info'}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                    {song.category}
                                  </span>
                                  {song.key && (
                                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                      Key: {song.key}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Status */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSongStatus(song);
                                }}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${song.status === 'heard'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                                  }`}
                              >
                                {song.status === 'heard' ? ' Heard' : 'Unheard'}
                              </button>
                            </div>

                            {/* Quick Actions Bar */}
                            <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50 border-t border-slate-100">
                              <div className="flex items-center gap-3">
                                {song.tempo && (
                                  <span className="text-xs text-slate-500">
                                    <span className="font-medium">{song.tempo}</span> BPM
                                  </span>
                                )}
                                {song.conductor && (
                                  <span className="text-xs text-slate-500 truncate max-w-[100px]">
                                     {song.conductor}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleSongActive(song);
                                  }}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${(song as any).isActive
                                    ? 'bg-green-500 text-white'
                                    : 'bg-slate-200 text-slate-600'
                                    }`}
                                >
                                  {(song as any).isActive ? '● Live' : '○ Off'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSong(song);
                                  }}
                                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Pagination Controls - Responsive */}
                  {totalPages > 1 && (
                    <div className="bg-white border-t border-slate-200 px-3 py-3 lg:px-6 lg:py-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        {/* Mobile: Compact count | Desktop: Full text */}
                        <div className="text-xs sm:text-sm text-slate-500 sm:text-slate-700">
                          <span className="sm:hidden">
                            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredSongs.length)} of {filteredSongs.length}
                          </span>
                          <span className="hidden sm:inline">
                            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredSongs.length)} of {filteredSongs.length} songs
                          </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                          >
                            Prev
                          </button>

                          {/* Desktop: Show all pages */}
                          <div className="hidden sm:flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${currentPage === page
                                  ? `${theme.primary} text-white`
                                  : 'text-slate-500 bg-white border border-slate-300 hover:bg-slate-50'
                                  }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>

                          {/* Mobile: Show current/total */}
                          <div className="sm:hidden flex items-center">
                            <span className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg">
                              {currentPage}/{totalPages}
                            </span>
                          </div>

                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No content in this category yet.</p>
                    <p className="text-sm">Click "Add Song" to get started.</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Select a Page</h3>
              <p className="text-slate-500">Choose a page from the sidebar to view and manage its songs.</p>
            </div>
          </div>
        )}
      </div>

      {/* Clone From Master Modal */}
      {selectedPage && (
        <CloneFromMasterModal
          isOpen={showCloneModal}
          onClose={() => setShowCloneModal(false)}
          onClone={handleEditSong}
          praiseNightId={selectedPage.id}
          defaultCategory={availableCategories.length > 0 ? availableCategories[0] : ''}
        />
      )}
    </div>
  );
}
