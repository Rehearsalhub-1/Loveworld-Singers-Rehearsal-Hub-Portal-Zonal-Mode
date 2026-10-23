"use client";

import React, { useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  FileText, 
  ShoppingCart, 
  Settings,
  Bookmark,
  ChevronRight,
  Filter,
  Download,
  Printer,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronDown,
  Edit,
  Trash2,
  Play,
  Pause,
  Music,
  Tag,
  X,
  Check,
  Save,
  ExternalLink,
  RefreshCw,
  Send,
  Users
} from "lucide-react";
import { Category, PraiseNightSong } from '../../types/supabase';
import { Toast } from '../Toast';
import { useAdminTheme } from './AdminThemeProvider';

interface CategoriesSectionProps {
  allCategories: Category[];
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
  showCategoryModal: boolean;
  setShowCategoryModal: (show: boolean) => void;
  editingCategory: Category | null;
  setEditingCategory: (category: Category | null) => void;
  newPageCategoryName: string;
  setNewPageCategoryName: (name: string) => void;
  showDeleteCategoryDialog: boolean;
  setShowDeleteCategoryDialog: (show: boolean) => void;
  categoryToDelete: Category | null;
  setCategoryToDelete: (category: Category | null) => void;
  handleAddCategory: () => void;
  handleEditCategory: (categoryName: string) => void;
  handleUpdateCategory: () => void;
  handleDeleteCategory: (category: Category) => void;
  confirmDeleteCategory: () => void;
  cancelDeleteCategory: () => void;
  handleEditCategoryContent: (content: any) => void;
  handleDeleteCategoryContent: (id: string) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

export default function CategoriesSection(props: CategoriesSectionProps) {
  const { theme } = useAdminTheme();
  
  const {
    allCategories,
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
    showCategoryModal,
    setShowCategoryModal,
    editingCategory,
    setEditingCategory,
    newPageCategoryName,
    setNewPageCategoryName,
    showDeleteCategoryDialog,
    categoryToDelete,
    handleAddCategory,
    handleEditCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    confirmDeleteCategory,
    cancelDeleteCategory,
    handleEditCategoryContent,
    handleDeleteCategoryContent,
    addToast
  } = props;

  // Helper function to check if a category is from the database
  const isDbCategory = (category: Category) => {
    // Categories from songs have IDs like "song-cat-{name}"
    return !category.id.toString().startsWith('song-cat-');
  };

  // Get all available categories from Supabase songs only
  const allAvailableCategories = useMemo(() => {
    
    if (!allSongs || allSongs.length === 0) {
      return [];
    }
    
    // Get unique categories from songs
    const songCategories = [...new Set(allSongs.map(song => song.category))].filter(Boolean);
    
    // Convert to Category objects
    const categories: Category[] = songCategories.map((categoryName, index) => ({
      id: String(index + 1),
      name: categoryName,
      description: `Songs in ${categoryName} category`,
      icon: 'Music',
      color: '#3B82F6',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    return categories;
  }, [allSongs]);

  // Combine database categories with song-based categories
  const combinedCategories = useMemo(() => {
    
    const combined = [...(allCategories || []), ...allAvailableCategories];
    
    // Remove duplicates based on name
    const uniqueCategories = combined.filter((category, index, self) => 
      index === self.findIndex(c => c.name === category.name)
    );
    
    return uniqueCategories;
  }, [allCategories, allAvailableCategories]);

  // Filter songs based on current filters FIRST
  const filteredSongs = useMemo(() => {
    let songs = allSongs || [];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      songs = songs.filter(song =>
        (song?.title || '').toLowerCase().includes(term) ||
        (song?.category || '').toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      songs = songs.filter(song => song?.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      songs = songs.filter(song => (song?.category || '') === categoryFilter);
    }

    return songs;
  }, [allSongs, searchTerm, statusFilter, categoryFilter]);

  // Get filtered songs for each category (respects all filters)
  const getCategorySongs = (categoryName: string) => {
    return filteredSongs.filter(song => (song?.category || '') === categoryName);
  };

  // Filter categories based on search and whether they have songs after filtering
  const filteredCategories = useMemo(() => {
    let categories = combinedCategories || [];

    // Filter by category name search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      categories = categories.filter(category =>
        (category?.name || '').toLowerCase().includes(term)
      );
    }

    // If a specific category is selected in the filter, only show that category
    if (categoryFilter !== 'all') {
      categories = categories.filter(category => category?.name === categoryFilter);
    }

    // If status filter is applied, only show categories that have songs with that status
    if (statusFilter !== 'all') {
      categories = categories.filter(category => {
        const categorySongs = (allSongs || []).filter(song => (song?.category || '') === category?.name);
        return categorySongs.some(song => song?.status === statusFilter);
      });
    }

    return categories;
  }, [combinedCategories, searchTerm, categoryFilter, statusFilter, allSongs]);

  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white lg:bg-transparent">
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full">
        {/* Header - Hidden on mobile (shown in AdminMobileHeader) */}
        <div className="hidden lg:block flex-shrink-0 p-6 mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 flex-1">Categories</h1>
            {filteredCategories.length > 0 && (
              <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                {filteredCategories.length}
              </span>
            )}
            <button
              onClick={() => {
                setEditingCategory(null);
                setNewPageCategoryName('');
                setShowCategoryModal(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 ${theme.primary} text-white rounded-lg ${theme.primaryHover} transition-colors font-medium text-sm`}
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>
        </div>
        
        {/* Mobile Add Button - Floating */}
        <button
          onClick={() => {
            setEditingCategory(null);
            setNewPageCategoryName('');
            setShowCategoryModal(true);
          }}
          className={`lg:hidden fixed bottom-20 right-4 z-[45] w-14 h-14 ${theme.primary} text-white rounded-full shadow-lg ${theme.primaryHover} transition-all active:scale-95 flex items-center justify-center`}
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Search and Filters */}
        <div className="flex-shrink-0 p-4 lg:px-6 lg:py-0 lg:mb-4 space-y-3 border-b lg:border-0 border-slate-100">
          <div className="flex flex-col gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-slate-50 lg:bg-white"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filters - Horizontal scroll on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'heard' | 'unheard')}
                className="flex-shrink-0 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                <option value="all">All Status</option>
                <option value="heard">Heard</option>
                <option value="unheard">Unheard</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-shrink-0 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white min-w-[140px]"
              >
                <option value="all">All Categories</option>
                {combinedCategories.map(category => (
                  <option key={category.name} value={category.name}>{category.name}</option>
                ))}
              </select>

              {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setCategoryFilter('all');
                  }}
                  className="flex-shrink-0 px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 text-sm font-medium flex items-center gap-2 bg-white"
                  title="Clear all filters"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="flex-1 overflow-auto p-4 lg:p-6 lg:pt-0">
        {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 pb-20 lg:pb-4">
            {filteredCategories.map((category) => {
              const categorySongs = getCategorySongs(category.name);
              const heardSongs = categorySongs.filter(song => song.status === 'heard').length;
              const unheardSongs = categorySongs.filter(song => song.status === 'unheard').length;
              const isFromDb = isDbCategory(category);
              const progress = categorySongs.length > 0 ? (heardSongs / categorySongs.length) * 100 : 0;

              return (
                <div
                  key={category.id}
                  className={`group bg-white border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-purple-200 active:scale-[0.98] lg:active:scale-100 ${
                    isFromDb ? 'border-slate-200' : 'border-amber-200'
                  }`}
                >
                  {/* Card Header - Compact */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isFromDb 
                          ? 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-md shadow-purple-200' 
                          : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-200'
                      }`}>
                        <Tag className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate text-sm lg:text-base">{category.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          {!isFromDb && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700">
                              Auto
                            </span>
                          )}
                          <span className="text-xs text-slate-500">{categorySongs.length} songs</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span>Progress</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stats Row - Compact */}
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-xs font-semibold text-green-700">{heardSongs}</span>
                        <span className="text-[10px] text-green-600">heard</span>
                      </div>
                      <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-50 rounded-lg">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <span className="text-xs font-semibold text-yellow-700">{unheardSongs}</span>
                        <span className="text-[10px] text-yellow-600">pending</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions - Show on hover (desktop) or always (mobile) */}
                  <div className="px-4 pb-4 flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditCategory(category.name)}
                      disabled={!isFromDb}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isFromDb
                          ? 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 active:scale-95'
                          : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      disabled={!isFromDb}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isFromDb
                          ? 'bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600 active:scale-95'
                          : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>

                  {/* Songs Preview - Collapsible on mobile */}
                  {categorySongs.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50/50">
                      <div className="divide-y divide-slate-100">
                        {categorySongs.slice(0, 2).map((song, index) => (
                          <div key={index} className="px-4 py-2 flex items-center gap-2">
                            <Music className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-xs text-slate-600 truncate flex-1">{song.title}</span>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              song.status === 'heard' ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                          </div>
                        ))}
                        {categorySongs.length > 2 && (
                          <div className="px-4 py-2 text-center">
                            <span className="text-[10px] text-slate-400 font-medium">+{categorySongs.length - 2} more</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full pb-20 lg:pb-0">
            <div className="text-center px-6 py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Tag className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Categories Found</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
                {searchTerm ? 'No categories match your search.' : 'Get started by creating your first category.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setNewPageCategoryName('');
                    setShowCategoryModal(true);
                  }}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 ${theme.primary} text-white rounded-xl ${theme.primaryHover} transition-all active:scale-95 font-medium shadow-sm`}
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
