"use client";

import React from 'react';
import { Calendar, ChevronDown, ChevronUp, Trash2, Edit, RefreshCw } from 'lucide-react';
import { ScheduleProgram } from '@/types/schedule';

interface ScheduleHistoryAccordionProps {
  programs: ScheduleProgram[];
  expandedDate: string | null;
  onToggleExpand: (prog: ScheduleProgram) => void;
  onDelete: (date: string, categoryId?: string) => void;
  canEdit: boolean;
  themeColor: string;
  isDailyView: boolean;
}

export const ScheduleHistoryAccordion: React.FC<ScheduleHistoryAccordionProps> = ({
  programs,
  expandedDate,
  onToggleExpand,
  onDelete,
  canEdit,
  themeColor,
  isDailyView
}) => {
  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
        <Calendar className="w-12 h-12 text-slate-200 mb-4" />
        <p className="text-slate-400 font-medium">No history found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {programs.map((prog) => {
        const isExpanded = expandedDate === prog.date;
        return (
          <div key={prog.id || prog.date} className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 hover:border-purple-200">
            <div
              onClick={() => onToggleExpand(prog)}
              className="px-4 md:px-6 py-4 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="w-10 h-10 flex-shrink-0 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-purple-600 group-hover:bg-purple-50 transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{isDailyView ? new Date(prog.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : prog.date}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{prog.program || 'Untitled Schedule'} • {prog.time || 'No Time'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 ml-2">
                {canEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(prog.date, prog.categoryId); }}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-purple-600' : 'text-slate-400'}`}>
                  <ChevronDown className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
