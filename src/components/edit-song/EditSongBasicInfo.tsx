"use client";

import React from 'react';
import { History, Plus, Check, X } from 'lucide-react';
import { Category } from '@/types/supabase';

interface EditSongBasicInfoProps {
  songTitle: string;
  setSongTitle: (value: string) => void;
  songCategories: string[];
  setSongCategories: (categories: string[]) => void;
  setSongCategory: (category: string) => void;
  songStatus: 'heard' | 'unheard';
  setSongStatus: (status: 'heard' | 'unheard') => void;
  songPraiseNight: string;
  setSongPraiseNight: (value: string) => void;
  categories: Category[];
  praiseNightCategories: any[];
  inputClasses: string;
  handlePaste: (e: React.ClipboardEvent, currentValue: string, setValue: (value: string) => void) => void;
  handleCreateHistory: (type: any) => void;
  songImageUrl: string;
  setSongImageUrl: (value: string) => void;
  handleOpenMediaSelectorForPart: (part: string) => void;
}

export const EditSongBasicInfo: React.FC<EditSongBasicInfoProps> = ({
  songTitle,
  setSongTitle,
  songCategories,
  setSongCategories,
  setSongCategory,
  songStatus,
  setSongStatus,
  songPraiseNight,
  setSongPraiseNight,
  categories,
  praiseNightCategories,
  inputClasses,
  handlePaste,
  handleCreateHistory,
  songImageUrl,
  setSongImageUrl,
  handleOpenMediaSelectorForPart
}) => {
  const [newCatInput, setNewCatInput] = React.useState('');
  const [showAddCat, setShowAddCat] = React.useState(false);

  // Combine categories from props with any categories currently attached to the song
  const allCategoryNames = React.useMemo(() => {
    const names = new Set<string>();
    categories.forEach(c => {
      if (c?.name && c.name.trim()) names.add(c.name.trim());
    });
    songCategories.forEach(c => {
      if (typeof c === 'string' && c.trim()) names.add(c.trim());
    });
    return Array.from(names);
  }, [categories, songCategories]);

  const isChecked = (name: string) => {
    return songCategories.some(sc => sc.trim().toLowerCase() === name.trim().toLowerCase());
  };

  const toggleCategory = (name: string) => {
    const trimmed = name.trim();
    if (isChecked(trimmed)) {
      const next = songCategories.filter(sc => sc.trim().toLowerCase() !== trimmed.toLowerCase());
      setSongCategories(next);
      setSongCategory(next[0] || '');
    } else {
      const next = [...songCategories, trimmed];
      setSongCategories(next);
      setSongCategory(next[0] || '');
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (!isChecked(trimmed)) {
      const next = [...songCategories, trimmed];
      setSongCategories(next);
      setSongCategory(next[0] || '');
    }
    setNewCatInput('');
    setShowAddCat(false);
  };

  return (
    <div className="bg-slate-50 rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h4 className="text-base sm:text-lg font-semibold text-slate-900">Song Details</h4>
        <button
          onClick={() => handleCreateHistory('song-details')}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors"
        >
          <History className="w-3 h-3" />
          Add History
        </button>
      </div>
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Song Title *
          </label>
          <input
            type="text"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            onPaste={(e) => handlePaste(e, songTitle, setSongTitle)}
            dir="ltr"
            style={{ textAlign: 'left', direction: 'ltr' }}
            className={`${inputClasses} text-lg font-medium`}
            placeholder="Enter song title"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Categories * (Select one or more)
              </label>
              {!showAddCat ? (
                <button
                  type="button"
                  onClick={() => setShowAddCat(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Category
                </button>
              ) : null}
            </div>

            {showAddCat && (
              <div className="flex items-center gap-1.5 mb-2.5">
                <input
                  type="text"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  placeholder="Category name (e.g. Warfare, Anthem)"
                  className="flex-1 px-3 py-1.5 text-xs border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-2.5 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddCat(false); setNewCatInput(''); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="border-2 border-slate-300 rounded-lg p-2.5 bg-white max-h-48 overflow-y-auto space-y-1">
              {/* None / Uncategorized Option */}
              <button
                type="button"
                onClick={() => {
                  setSongCategories([]);
                  setSongCategory('');
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
                  songCategories.length === 0
                    ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                  songCategories.length === 0 ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400'
                }`}>
                  {songCategories.length === 0 && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
                <span>None (Uncategorized)</span>
              </button>

              {allCategoryNames.map(catName => {
                const checked = isChecked(catName);
                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => toggleCategory(catName)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
                      checked
                        ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                      checked ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-400'
                    }`}>
                      {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span className="truncate">{catName}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 text-xs text-slate-500">
              Selected: <span className="font-medium text-slate-700">{songCategories.length > 0 ? songCategories.join(', ') : 'None (Uncategorized)'}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={songStatus}
              onChange={(e) => setSongStatus(e.target.value as 'heard' | 'unheard')}
              className={inputClasses}
            >
              <option value="heard">Heard</option>
              <option value="unheard">Unheard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Praise Night
          </label>
          <select
            value={songPraiseNight}
            onChange={(e) => setSongPraiseNight(e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-600 focus:shadow-xl focus:bg-purple-50 transition-all duration-200"
          >
            <option value="">Select Praise Night</option>
            {praiseNightCategories.map(praiseNight => (
              <option key={praiseNight.id} value={praiseNight.name}>{praiseNight.name}</option>
            ))}
          </select>
        </div>

        {/* Song Artwork */}
        <div className="pt-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Song Artwork
          </label>
          <div className="flex items-center gap-4">
            {songImageUrl ? (
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-2 border-slate-200">
                <img src={songImageUrl} alt="Song Artwork" className="w-full h-full object-cover" />
                <button
                  onClick={() => setSongImageUrl('')}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 mb-1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <span className="text-xs text-slate-400">No Image</span>
              </div>
            )}
            <div className="flex-1">
              <button
                onClick={() => handleOpenMediaSelectorForPart('image')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Select Artwork
              </button>
              <p className="text-xs text-slate-500 mt-2 max-w-sm">
                This image will be used as the song's cover art in the mobile app.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
