"use client";

import React from 'react';
import { Plus, Music, Sparkles, Heart, User, Calendar, Edit, Trash2 } from 'lucide-react';
import { ScheduleCategory } from '@/types/schedule';

export const ICON_OPTIONS = [
  { name: 'Music', icon: Music },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Heart', icon: Heart },
  { name: 'User', icon: User },
  { name: 'Calendar', icon: Calendar },
];

interface ScheduleCategoryGridProps {
  categories: ScheduleCategory[];
  canEdit: boolean;
  themeColor: string;
  onCategoryClick: (cat: ScheduleCategory) => void;
  onAddCategory: () => void;
  onEditCategory: (cat: ScheduleCategory) => void;
  onDeleteCategory: (id: string) => void;
  parentId?: string | null; // Added filter
}

export const ScheduleCategoryGrid: React.FC<ScheduleCategoryGridProps> = ({
  categories,
  canEdit,
  themeColor,
  onCategoryClick,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  parentId = null // Default to root
}) => {
  const filteredCategories = categories.filter(c => (c.parentId || null) === parentId);

  if (filteredCategories.length === 0 && parentId) return null; // Don't show grid if empty and inside a folder

  return (
    <div className="space-y-6">
      {!parentId && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Schedule Manager</h3>
            <p className="text-sm text-slate-500">Manage daily schedules and song lists</p>
          </div>
          {canEdit && (
            <button
              onClick={onAddCategory}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-medium text-white px-5 py-2.5 rounded-full transition-colors shadow-sm"
              style={{ backgroundColor: themeColor }}
            >
              <Plus className="w-4 h-4" /> New Category
            </button>
          )}
        </div>
      )}

      {parentId && filteredCategories.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-4 rounded-full bg-indigo-500" />
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sub-Folders</h4>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map(cat => {
          const IconComp = ICON_OPTIONS.find(o => o.name === cat.icon)?.icon || Music;
          return (
            <div
              key={cat.id}
              onClick={() => onCategoryClick(cat)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${cat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <IconComp className={`w-6 h-6 ${cat.iconColor}`} />
                </div>
                {canEdit && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditCategory(cat); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat.id); }}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">{cat.label}</h4>
              <p className="text-xs text-slate-500 line-clamp-2">{cat.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
