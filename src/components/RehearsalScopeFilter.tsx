/**
 * Rehearsal Scope Filter Component
 * Phase 4: Allows members to filter between zone and sub-group rehearsals
 */

'use client';

import React from 'react';
import { Users, Building2, Layers } from 'lucide-react';

interface RehearsalScopeFilterProps {
  filter: 'all' | 'zone' | 'subgroup';
  onFilterChange: (filter: 'all' | 'zone' | 'subgroup') => void;
  zoneName?: string;
  subGroupCount?: number;
}

export default function RehearsalScopeFilter({
  filter,
  onFilterChange,
  zoneName = 'Zone',
  subGroupCount = 0
}: RehearsalScopeFilterProps) {
  const filters = [
    { id: 'all' as const, label: 'All', icon: Layers },
    { id: 'zone' as const, label: zoneName, icon: Building2 },
    { id: 'subgroup' as const, label: 'My Groups', icon: Users, count: subGroupCount }
  ];

  return (
    <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
      {filters.map(({ id, label, icon: Icon, count }) => (
        <button
          key={id}
          onClick={() => onFilterChange(id)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all
            ${filter === id
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }
          `}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
          {count !== undefined && count > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
