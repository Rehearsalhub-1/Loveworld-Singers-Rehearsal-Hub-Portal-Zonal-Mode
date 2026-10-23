"use client";

import React, { useMemo, useState } from 'react';
import { 
  Search, 
  Plus,
  Edit,
  Trash2,
  Tag,
  X,
  FolderOpen
} from "lucide-react";
import { Toast } from '../Toast';
import MediaSelectionModal from '../MediaSelectionModal';
import { useAdminTheme } from './AdminThemeProvider';
import { sanitizeImageUrl } from '@/utils/image-utils';

interface PageCategory {
  id: string;
  name: string;
  description: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PageCategoriesSectionProps {
  pageCategories: PageCategory[];
  pages: any[]; // Add pages to count how many pages are in each category
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onCategoryClick?: (categoryName: string) => void; // Callback when category is clicked
  onPageClick?: (page: any) => void; // Callback when a page is clicked
  showPageCategoryModal: boolean;
  setShowPageCategoryModal: (show: boolean) => void;
  editingPageCategory: PageCategory | null;
  setEditingPageCategory: (category: PageCategory | null) => void;
  newPageCategoryName: string;
  setNewPageCategoryName: (name: string) => void;
  newPageCategoryDescription: string;
  setNewPageCategoryDescription: (description: string) => void;
  newPageCategoryImage: string;
  setNewPageCategoryImage: (image: string) => void;
  showDeletePageCategoryDialog: boolean;
  setShowDeletePageCategoryDialog: (show: boolean) => void;
  pageCategoryToDelete: PageCategory | null;
  setPageCategoryToDelete: (category: PageCategory | null) => void;
  handleAddPageCategory: () => void;
  handleEditPageCategory: (category: PageCategory) => void;
  handleUpdatePageCategory: () => void;
  handleDeletePageCategory: (category: PageCategory) => void;
  confirmDeletePageCategory: () => void;
  cancelDeletePageCategory: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

export default function PageCategoriesSection(props: PageCategoriesSectionProps) {
  const { theme } = useAdminTheme();
  
  const {
    pageCategories,
    pages,
    searchTerm,
    setSearchTerm,
    onCategoryClick,
    onPageClick,
    showPageCategoryModal,
    setShowPageCategoryModal,
    editingPageCategory,
    setEditingPageCategory,
    newPageCategoryName,
    setNewPageCategoryName,
    newPageCategoryDescription,
    setNewPageCategoryDescription,
    newPageCategoryImage,
    setNewPageCategoryImage,
    showDeletePageCategoryDialog,
    setShowDeletePageCategoryDialog,
    pageCategoryToDelete,
    setPageCategoryToDelete,
    handleAddPageCategory,
    handleEditPageCategory,
    handleUpdatePageCategory,
    handleDeletePageCategory,
    confirmDeletePageCategory,
    cancelDeletePageCategory,
    addToast
  } = props;

  // UI state
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  
  // UI state
  const [selectedCategory, setSelectedCategory] = useState<PageCategory | null>(null);

  // Computed data
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return pageCategories;
    
    const term = searchTerm.toLowerCase();
    return (pageCategories || []).filter(category => 
      (category?.name || '').toLowerCase().includes(term) || 
      (category?.description || '').toLowerCase().includes(term)
    );
  }, [pageCategories, searchTerm]);

  return (
    <div className="flex-1 overflow-auto bg-white lg:bg-gradient-to-br lg:from-slate-50 lg:via-white lg:to-purple-50">
      {/* Mobile Stats Header */}
      <div className="lg:hidden bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-xs">Page Categories</p>
              <p className="text-white font-bold text-lg">{filteredCategories.length}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 lg:p-6 pb-24 lg:pb-6">
        <div className="max-w-6xl mx-auto">
          {/* Header - Desktop Only */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Page Categories</h1>
              <p className="text-slate-600 mt-1">
                Manage page categories for better organization
                {filteredCategories.length > 0 && (
                  <span className={`ml-2 ${theme.text} font-medium`}>
                    ({filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'})
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPageCategory(null);
                setNewPageCategoryName('');
                setNewPageCategoryDescription('');
                setNewPageCategoryImage('');
                setShowPageCategoryModal(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 ${theme.primary} text-white rounded-lg ${theme.primaryHover} transition-colors font-medium`}
            >
              <Plus className="w-4 h-4" />
              Add Page Category
            </button>
          </div>
          
          {/* Mobile Add Button - Floating */}
          <button
            onClick={() => {
              setEditingPageCategory(null);
              setNewPageCategoryName('');
              setNewPageCategoryDescription('');
              setNewPageCategoryImage('');
              setShowPageCategoryModal(true);
            }}
            className={`lg:hidden fixed bottom-20 right-4 z-[45] w-14 h-14 ${theme.primary} text-white rounded-full shadow-lg ${theme.primaryHover} transition-all active:scale-95 flex items-center justify-center`}
          >
            <Plus className="w-6 h-6" />
          </button>

          {/* Search */}
          <div className="mb-4 lg:mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search page categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-slate-50 lg:bg-white lg:max-w-md text-sm"
              />
            </div>
          </div>

          {/* Show pages in selected category */}
          {selectedCategory ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Pages in "{selectedCategory.name}"</h3>
                <p className="text-sm text-slate-500">{selectedCategory.description}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Total pages loaded: {pages.length} | With this category: {pages.filter(p => p.pageCategory === selectedCategory.name).length}
                </p>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                ← Back to Categories
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages
                .filter(page => {
                  const matches = page.pageCategory === selectedCategory.name;
                  if (!matches) {
                  } else {
                  }
                  return matches;
                })
                .map(page => (
                  <div
                    key={page.id}
                    onClick={() => onPageClick?.(page)}
                    className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                      <img
                        src={sanitizeImageUrl(page.bannerImage, 'banner')}
                        alt={page.name}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                      <h4 className="font-semibold text-slate-900 mb-1">{page.name}</h4>
                    <p className="text-sm text-slate-500">{page.date}</p>
                    <p className="text-sm text-slate-500">{page.location}</p>
                    <div className="mt-2">
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${page.category === 'ongoing' ? 'bg-green-100 text-green-800' :
                          page.category === 'pre-rehearsal' ? 'bg-yellow-100 text-yellow-800' :
                          page.category === 'archive' ? 'bg-gray-100 text-gray-800' :
                          'bg-slate-100 text-slate-800'}
                      `}>
                        {page.category}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
            
            {pages.filter(page => page.pageCategory === selectedCategory.name).length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500">No pages in this category yet.</p>
              </div>
            )}
          </div>
        ) : (
          /* Categories List */
          filteredCategories.length > 0 ? (
          <>
            {/* Mobile List View */}
            <div className="lg:hidden divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {filteredCategories.map((category) => {
                const pageCount = pages.filter(page => page.pageCategory === category.name).length;
                return (
                  <div 
                    key={category.id} 
                    className="flex items-center gap-3 p-4 active:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {/* Category Image/Icon */}
                    <div className="flex-shrink-0">
                      {sanitizeImageUrl(category.image, 'icon') ? (
                        <img 
                          src={sanitizeImageUrl(category.image, 'banner')} 
                          alt={category.name}
                          className="w-14 h-14 rounded-xl object-cover ring-2 ring-white shadow-sm"
                        />
                      ) : (
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center ring-2 ring-white shadow-sm`}>
                          <Tag className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[15px] text-slate-900 truncate">{category.name}</h3>
                      <p className="text-sm text-slate-500 truncate">{category.description || 'No description'}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 ${theme.primaryLight} ${theme.text} text-[10px] font-semibold rounded-full`}>
                        {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                      </span>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditPageCategory(category); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 active:scale-95 transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePageCategory(category); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Desktop Grid View */}
            <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((category) => {
                const pageCount = pages.filter(page => page.pageCategory === category.name).length;
                return (
                <div key={category.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1 cursor-pointer" 
                      onClick={() => setSelectedCategory(category)}
                      title="Click to view pages in this category"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className={`w-4 h-4 ${theme.text}`} />
                        <h3 className="font-semibold text-slate-900">{category.name}</h3>
                        <span className={`px-2 py-0.5 ${theme.primaryLight} ${theme.text} text-xs font-medium rounded-full`}>
                          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                        </span>
                      </div>
                      {sanitizeImageUrl(category.image, 'icon') && (
                        <img 
                          src={sanitizeImageUrl(category.image, 'banner')} 
                          alt={category.name}
                          className="w-full h-24 object-cover rounded mb-2"
                        />
                      )}
                      <p className="text-sm text-slate-500">{category.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditPageCategory(category)}
                        className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Edit category"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePageCategory(category)}
                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </>
        ) : (
          /* No categories found */
          <div className="text-center py-12">
            <Tag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Page Categories Found</h3>
            <p className="text-slate-500 mb-4">
              {searchTerm ? 'No page categories match your search.' : 'Get started by creating your first page category.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => {
                  setEditingPageCategory(null);
                  setNewPageCategoryName('');
                  setNewPageCategoryDescription('');
                  setShowPageCategoryModal(true);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 ${theme.primary} text-white rounded-lg ${theme.primaryHover} transition-colors font-medium`}
              >
                <Plus className="w-4 h-4" />
                Add Page Category
              </button>
            )}
          </div>
        )
        )}
        </div>
      </div>

      {/* Add/Edit Page Category Modal */}
      {showPageCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPageCategory ? 'Edit Page Category' : 'Add Page Category'}
              </h3>
              <button
                onClick={() => {
                  setShowPageCategoryModal(false);
                  setEditingPageCategory(null);
                  setNewPageCategoryName('');
                  setNewPageCategoryDescription('');
                  setNewPageCategoryImage('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPageCategoryName}
                  onChange={(e) => setNewPageCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newPageCategoryDescription}
                  onChange={(e) => setNewPageCategoryDescription(e.target.value)}
                  placeholder="Enter category description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Image
                </label>

                {/* Browse Library Button */}
                <button
                  type="button"
                  onClick={() => setShowMediaLibrary(true)}
                  className={`w-full px-4 py-3 ${theme.primaryLight} ${theme.bgHover} ${theme.text} font-medium rounded-lg border-2 ${theme.border} hover:border-${theme.border.split('-')[1]}-400 transition-all duration-200 flex items-center justify-center gap-2`}
                >
                  <FolderOpen className="w-5 h-5" />
                  {newPageCategoryImage ? 'Change Image' : 'Browse Library'}
                </button>

                {newPageCategoryImage && (
                  <div className="mt-3">
                    <img
                      src={newPageCategoryImage}
                      alt="Category image preview"
                      className="w-full h-32 object-cover rounded-lg border-2 border-purple-200 shadow-sm"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-600 truncate flex-1">
                        {newPageCategoryImage.includes('cloudinary') ? 'From Media Library' : 'Category image'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setNewPageCategoryImage('')}
                        className="text-xs text-red-600 hover:text-red-700 font-medium ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Select an image from your media library
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPageCategoryModal(false);
                  setEditingPageCategory(null);
                  setNewPageCategoryName('');
                  setNewPageCategoryDescription('');
                  setNewPageCategoryImage('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingPageCategory) {
                    handleUpdatePageCategory();
                  } else {
                    handleAddPageCategory();
                  }
                }}
                className={`flex-1 px-4 py-2 text-white ${theme.primary} ${theme.primaryHover} rounded-lg font-medium transition-colors`}
              >
                {editingPageCategory ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Modal for Category Image Selection */}
      <MediaSelectionModal
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onFileSelect={(file) => {
          setNewPageCategoryImage(file.url);
          setShowMediaLibrary(false);
        }}
        allowedTypes={['image']}
        title="Select Category Image"
      />

      {/* Delete Confirmation Dialog */}
      {showDeletePageCategoryDialog && pageCategoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Page Category</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete the page category:
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900">{pageCategoryToDelete.name}</p>
                <p className="text-sm text-gray-500">{pageCategoryToDelete.description}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelDeletePageCategory}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePageCategory}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
