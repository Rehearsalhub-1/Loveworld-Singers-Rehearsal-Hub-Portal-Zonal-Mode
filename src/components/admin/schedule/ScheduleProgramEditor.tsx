"use client";

import React from 'react';
import { Save, Loader2, Edit, RefreshCw, MessageSquare, FileText } from 'lucide-react';
import { ScheduleProgram, SpreadsheetData } from '@/types/schedule';
import SpreadsheetEditor from '../SpreadsheetEditor';

interface ScheduleProgramEditorProps {
  program: ScheduleProgram | null;
  programForm: { program: string; date: string; time: string; dailyTarget: string };
  setProgramForm: (form: any) => void;
  spreadsheetData: SpreadsheetData | undefined;
  setSpreadsheetData: (data: SpreadsheetData) => void;
  canEdit: boolean;
  isSaving: boolean;
  onSave: (grid?: SpreadsheetData) => void;
  themeColor: string;
  isDailyView: boolean;
}

export const ScheduleProgramEditor: React.FC<ScheduleProgramEditorProps> = ({
  program,
  programForm,
  setProgramForm,
  spreadsheetData,
  setSpreadsheetData,
  canEdit,
  isSaving,
  onSave,
  themeColor,
  isDailyView
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      {/* Program Info Form */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Program Name</label>
            <input
              type="text"
              value={programForm.program || programForm.date || ''}
              onChange={e => setProgramForm({ ...programForm, program: e.target.value })}
              placeholder="e.g. Sunday Service"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              disabled={!canEdit}
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Scheduled Date</label>
            <input
              type="date"
              value={programForm.date || ''}
              onChange={e => setProgramForm({ ...programForm, date: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Call Time</label>
            <input
              type="time"
              value={programForm.time || ''}
              onChange={e => setProgramForm({ ...programForm, time: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Daily Target</label>
            <input
              type="text"
              value={programForm.dailyTarget || ''}
              onChange={e => setProgramForm({ ...programForm, dailyTarget: e.target.value })}
              placeholder="e.g. 50 Songs"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              disabled={!canEdit}
            />
          </div>
        </div>
        {canEdit && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => onSave()}
              disabled={isSaving}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet Component */}
      <div className="p-0 min-h-[500px]">
        <SpreadsheetEditor
          initialData={spreadsheetData}
          onChange={(newData) => {
            setSpreadsheetData(newData);
            // Auto-save logic handled by hook if needed
          }}
          readOnly={!canEdit}
        />
      </div>
    </div>
  );
};
