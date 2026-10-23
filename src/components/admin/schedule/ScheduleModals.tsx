"use client";

import React from 'react';
import { X, Music, Sparkles, Heart, User, Calendar, Plus, RefreshCw } from 'lucide-react';
import { ScheduleCategory, ScheduleSong } from '@/types/schedule';

const ICON_OPTIONS = [
  { name: 'Music', icon: Music },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Heart', icon: Heart },
  { name: 'User', icon: User },
  { name: 'Calendar', icon: Calendar },
];

const COLOR_OPTIONS = [
  { label: 'Purple', color: 'bg-purple-100', iconColor: 'text-purple-600' },
  { label: 'Indigo', color: 'bg-indigo-100', iconColor: 'text-indigo-600' },
  { label: 'Pink', color: 'bg-pink-100', iconColor: 'text-pink-600' },
  { label: 'Amber', color: 'bg-amber-100', iconColor: 'text-amber-600' },
  { label: 'Emerald', color: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  { label: 'Blue', color: 'bg-blue-100', iconColor: 'text-blue-600' },
  { label: 'Rose', color: 'bg-rose-100', iconColor: 'text-rose-600' },
];

interface ScheduleModalsProps {
  // Category Modal
  showCatForm: boolean;
  setShowCatForm: (show: boolean) => void;
  catForm: any;
  setCatForm: (form: any) => void;
  editingCat: ScheduleCategory | null;
  savingCat: boolean;
  onSaveCat: () => void;

  // New Schedule Modal
  showNewScheduleModal: boolean;
  setShowNewScheduleModal: (show: boolean) => void;
  newScheduleDate: string;
  setNewScheduleDate: (date: string) => void;
  onConfirmNewSchedule: () => void;
  isDailyView: boolean;

  // Rename List Modal
  showRenameListModal: boolean;
  setShowRenameListModal: (show: boolean) => void;
  renameListValue: string;
  setRenameListValue: (val: string) => void;
  onConfirmRename: () => void;

  themeColor: string;
}

export const ScheduleModals: React.FC<ScheduleModalsProps> = ({
  showCatForm,
  setShowCatForm,
  catForm,
  setCatForm,
  editingCat,
  savingCat,
  onSaveCat,
  showNewScheduleModal,
  setShowNewScheduleModal,
  newScheduleDate,
  setNewScheduleDate,
  onConfirmNewSchedule,
  isDailyView,
  showRenameListModal,
  setShowRenameListModal,
  renameListValue,
  setRenameListValue,
  onConfirmRename,
  themeColor
}) => {
  return (
    <>
      {/* Category Modal */}
      {showCatForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">{editingCat ? 'Edit Category' : 'New Category'}</h3>
                <button onClick={() => setShowCatForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Label</label>
                  <input type="text" value={catForm.label} onChange={e => setCatForm({ ...catForm, label: e.target.value })} placeholder="e.g. Easter Program" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Description</label>
                  <textarea value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} placeholder="What's this category for?" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium h-20 resize-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Icon & Theme</label>
                  <div className="flex flex-wrap gap-2">
                    {ICON_OPTIONS.map(opt => (
                      <button key={opt.name} onClick={() => setCatForm({ ...catForm, icon: opt.name })} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${catForm.icon === opt.name ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}><opt.icon className="w-5 h-5" /></button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {COLOR_OPTIONS.map(opt => (
                      <button key={opt.label} onClick={() => setCatForm({ ...catForm, color: opt.color, iconColor: opt.iconColor })} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${catForm.color === opt.color ? 'ring-2 ring-offset-2 ring-slate-900' : ''} ${opt.color}`}><div className={`w-4 h-4 rounded-full ${opt.iconColor.replace('text-', 'bg-')}`} /></button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button onClick={onSaveCat} disabled={savingCat || !catForm.label} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">{savingCat ? <RefreshCw className="w-4 h-4 animate-spin" /> : editingCat ? 'Save Changes' : 'Create Category'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Schedule Modal */}
      {showNewScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-2">{isDailyView ? 'Select Date' : 'List Name'}</h3>
              <p className="text-sm text-slate-500 mb-8">{isDailyView ? 'Choose a date for the new program schedule.' : 'Enter a title for this new list.'}</p>
              <div className="space-y-6">
                <input type={isDailyView ? "date" : "text"} value={newScheduleDate} onChange={e => setNewScheduleDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all" />
                <div className="flex gap-3">
                  <button onClick={() => setShowNewScheduleModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">CANCEL</button>
                  <button onClick={onConfirmNewSchedule} disabled={!newScheduleDate} className="flex-2 py-4 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50" style={{ backgroundColor: themeColor }}>CONTINUE</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename List Modal */}
      {showRenameListModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Rename List</h3>
              <p className="text-sm text-slate-500 mb-8">Enter a new name for this list.</p>
              <div className="space-y-6">
                <input type="text" value={renameListValue} onChange={e => setRenameListValue(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none" autoFocus />
                <div className="flex gap-3">
                  <button onClick={() => setShowRenameListModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">CANCEL</button>
                  <button onClick={onConfirmRename} disabled={!renameListValue} className="flex-2 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50">RENAME</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
