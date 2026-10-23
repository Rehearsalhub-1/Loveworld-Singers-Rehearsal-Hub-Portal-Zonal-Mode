"use client";

import React from 'react';
import { Loader2, ChevronDown, Plus, Edit } from 'lucide-react';
import { PraiseNightSong } from '@/types/supabase';
import { useScheduleManager } from '@/hooks/useScheduleManager';

// Modularized Components
import { ScheduleCategoryGrid } from './schedule/ScheduleCategoryGrid';
import { ScheduleProgramEditor } from './schedule/ScheduleProgramEditor';
import { ScheduleHistoryAccordion } from './schedule/ScheduleHistoryAccordion';
import { ScheduleModals } from './schedule/ScheduleModals';

// Toast sub-component
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
      {message}
    </div>
  );
}

interface ScheduleManagerSectionProps {
  allSongs?: PraiseNightSong[];
}

export default function ScheduleManagerSection({ allSongs = [] }: ScheduleManagerSectionProps) {
  const sm = useScheduleManager(allSongs);
  const themeColor = sm.currentZone?.themeColor || '#9333ea';

  if (sm.loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
      {sm.toast && <Toast message={sm.toast.message} type={sm.toast.type} />}

      {/* Root Categories View */}
      {sm.viewMode === 'categories' && (
        <ScheduleCategoryGrid
          categories={sm.categories}
          canEdit={sm.canEdit}
          themeColor={themeColor}
          onCategoryClick={(cat) => {
            sm.setSelectedCategory(cat);
            sm.setViewMode('category-detail');
            sm.loadSongs(cat.id);
          }}
          onAddCategory={() => {
            sm.setEditingCat(null);
            sm.setCatForm({ label: '', description: '', icon: 'Music', color: 'bg-purple-100', iconColor: 'text-purple-600', parentId: null });
            sm.setShowCatForm(true);
          }}
          onEditCategory={(cat) => {
            sm.setEditingCat(cat);
            sm.setCatForm({ label: cat.label, description: cat.description, icon: cat.icon, color: cat.color, iconColor: cat.iconColor, parentId: cat.parentId || null });
            sm.setShowCatForm(true);
          }}
          onDeleteCategory={sm.deleteCat}
        />
      )}

      {/* Detail View (Accordion or Editor) */}
      {sm.viewMode === 'category-detail' && sm.selectedCategory && (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                <button
                  onClick={() => {
                    if (sm.expandedDate) {
                      sm.setExpandedDate(null);
                      sm.setCurrentDate('');
                    } else if (sm.selectedCategory?.parentId) {
                      const parent = sm.categories.find(c => c.id === sm.selectedCategory!.parentId);
                      if (parent) sm.setSelectedCategory(parent);
                    } else {
                      sm.setViewMode('categories');
                      sm.setSelectedCategory(null);
                    }
                  }}
                  className="w-9 h-9 md:w-10 md:h-10 flex-shrink-0 rounded-full bg-white shadow-sm border border-slate-200 transition-all flex items-center justify-center text-slate-500 hover:text-indigo-600 active:scale-90"
                >
                  <ChevronDown className="w-5 h-5 rotate-90" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-sm md:text-lg font-bold text-slate-800 flex items-center gap-2 truncate uppercase tracking-tight">
                    {sm.expandedDate
                      ? (sm.isDailyView ? (sm.program?.program || 'Schedule Editor') : (sm.program?.date || 'Mini Category Editor'))
                      : sm.selectedCategory.label}
                    {sm.expandedDate && !sm.isDailyView && sm.canEdit && (
                      <button
                        onClick={() => { sm.setRenameListValue(sm.program?.date || ''); sm.setShowRenameListModal(true); }}
                        className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </h3>
                  <p className="text-[10px] md:text-sm text-slate-500 truncate">
                    {sm.expandedDate ? `Back to ${sm.selectedCategory.label}` : (sm.selectedCategory.description || (sm.isDailyView ? 'History of all created schedules' : ''))}
                  </p>
                </div>
              </div>

              {/* Desktop Buttons */}
              {!sm.expandedDate && (
                <div className="hidden sm:flex items-center gap-2">
                  {sm.canEdit && (
                    <button 
                      onClick={() => { sm.setEditingCat(null); sm.setCatForm({ ...sm.catForm, parentId: sm.selectedCategory?.id || null }); sm.setShowCatForm(true); }} 
                      className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 px-4 py-2 rounded-full transition-all shadow-sm border border-slate-200 uppercase tracking-wider"
                    >
                      <Plus className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">Folder</span>
                    </button>
                  )}
                  <button 
                    onClick={() => { sm.setNewScheduleDate(sm.isDailyView ? new Date().toISOString().split('T')[0] : ''); sm.setShowNewScheduleModal(true); }} 
                    className="flex items-center justify-center gap-1.5 text-sm font-bold text-white px-5 py-2.5 rounded-full transition-all shadow-lg active:scale-95 uppercase tracking-wider" 
                    style={{ backgroundColor: themeColor }}
                  >
                    <Plus className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">{sm.isDailyView ? 'New Schedule' : 'New List'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Buttons - Staggered/Full width */}
            {!sm.expandedDate && (
              <div className="flex sm:hidden items-center gap-2 w-full">
                {sm.canEdit && (
                  <button 
                    onClick={() => { sm.setEditingCat(null); sm.setCatForm({ ...sm.catForm, parentId: sm.selectedCategory?.id || null }); sm.setShowCatForm(true); }} 
                    className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-700 bg-white px-3 py-2.5 rounded-xl shadow-sm border border-slate-200 uppercase tracking-wider"
                  >
                    <Plus className="w-3.5 h-3.5" /> <span>Folder</span>
                  </button>
                )}
                <button 
                  onClick={() => { sm.setNewScheduleDate(sm.isDailyView ? new Date().toISOString().split('T')[0] : ''); sm.setShowNewScheduleModal(true); }} 
                  className="flex-[1.5] flex items-center justify-center gap-1.5 text-[10px] font-bold text-white px-3 py-2.5 rounded-xl shadow-lg uppercase tracking-wider" 
                  style={{ backgroundColor: themeColor }}
                >
                  <Plus className="w-3.5 h-3.5" /> <span>{sm.isDailyView ? 'New Schedule' : 'New List'}</span>
                </button>
              </div>
            )}
          </div>

            <ScheduleCategoryGrid
              categories={sm.categories}
              canEdit={sm.canEdit}
              themeColor={themeColor}
              onCategoryClick={(cat) => {
                sm.setSelectedCategory(cat);
                sm.loadSongs(cat.id);
              }}
              onAddCategory={() => {}}
              onEditCategory={(cat) => {
                sm.setEditingCat(cat);
                sm.setCatForm({ label: cat.label, description: cat.description, icon: cat.icon, color: cat.color, iconColor: cat.iconColor, parentId: cat.parentId || null });
                sm.setShowCatForm(true);
              }}
              onDeleteCategory={sm.deleteCat}
              parentId={sm.selectedCategory.id}
            />

            {sm.expandedDate ? (
            sm.editorLoading ? (
              <div className="flex items-center justify-center py-20 bg-white rounded-3xl border border-slate-100"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
            ) : (
              <ScheduleProgramEditor
                program={sm.program}
                programForm={sm.programForm}
                setProgramForm={sm.setProgramForm}
                spreadsheetData={sm.spreadsheetData}
                setSpreadsheetData={sm.setSpreadsheetData}
                canEdit={sm.canEdit}
                isSaving={sm.savingProgram}
                onSave={sm.saveProgram}
                themeColor={themeColor}
                isDailyView={sm.isDailyView}
              />
            )
          ) : (
            <ScheduleHistoryAccordion
              programs={sm.allPrograms.filter(p => (sm.isDailyView ? !p.categoryId : p.categoryId === sm.selectedCategory?.id))}
              expandedDate={sm.expandedDate}
              onToggleExpand={async (prog) => {
                sm.setExpandedDate(prog.date);
                sm.setCurrentDate(prog.date);
                sm.loadEditorData(prog.date, prog.categoryId);
              }}
              onDelete={sm.deleteProgramHandler}
              canEdit={sm.canEdit}
              themeColor={themeColor}
              isDailyView={sm.isDailyView}
            />
          )}
        </>
      )}

      {/* Modals */}
      <ScheduleModals
        showCatForm={sm.showCatForm}
        setShowCatForm={sm.setShowCatForm}
        catForm={sm.catForm}
        setCatForm={sm.setCatForm}
        editingCat={sm.editingCat}
        savingCat={sm.savingCat}
        onSaveCat={sm.saveCat}
        showNewScheduleModal={sm.showNewScheduleModal}
        setShowNewScheduleModal={sm.setShowNewScheduleModal}
        newScheduleDate={sm.newScheduleDate}
        setNewScheduleDate={sm.setNewScheduleDate}
        onConfirmNewSchedule={sm.confirmCreateSchedule}
        isDailyView={sm.isDailyView}
        showRenameListModal={sm.showRenameListModal}
        setShowRenameListModal={sm.setShowRenameListModal}
        renameListValue={sm.renameListValue}
        setRenameListValue={sm.setRenameListValue}
        onConfirmRename={sm.handleRenameList}
        themeColor={themeColor}
      />
    </div>
  );
}
