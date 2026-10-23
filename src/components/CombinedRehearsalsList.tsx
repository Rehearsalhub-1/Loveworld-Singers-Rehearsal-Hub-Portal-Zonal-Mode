/**
 * Combined Rehearsals List Component
 * Phase 4: Shows both zone and sub-group rehearsals with clear labels
 * Only renders if user belongs to at least one sub-group
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, ChevronRight, Building2, Users, Filter } from 'lucide-react';
import { useMemberRehearsals, CombinedRehearsal } from '@/hooks/useMemberRehearsals';
import RehearsalScopeBadge from './RehearsalScopeBadge';
import { useZone } from '@/hooks/useZone';
import { useSubGroup } from '@/hooks/useSubGroup';

interface CombinedRehearsalsListProps {
  maxItems?: number;
  showFilter?: boolean;
  hideIfEmpty?: boolean;
  onRehearsalClick?: (rehearsal: CombinedRehearsal) => void;
}

export default function CombinedRehearsalsList({
  maxItems,
  showFilter = true,
  hideIfEmpty = false,
  onRehearsalClick
}: CombinedRehearsalsListProps) {
  const { currentZone } = useZone();
  const { memberSubGroups, isLoading: subGroupLoading } = useSubGroup();
  const {
    rehearsals,
    zoneRehearsals,
    subGroupRehearsals,
    loading,
    error,
    filter,
    setFilter,
    refresh
  } = useMemberRehearsals();

  const zoneColor = currentZone?.themeColor || '#9333EA';

    const hasSubGroupMembership = memberSubGroups.length > 0;

  // Don't render anything if user is not a member of any sub-group
  if (!subGroupLoading && !hasSubGroupMembership) {
    return null;
  }

  // Still loading sub-group membership - don't show anything yet
  if (subGroupLoading || loading) {
    return null;
  }

  if (error) {
    return null;
  }

  // Limit items if maxItems is specified
  const displayRehearsals = maxItems ? rehearsals.slice(0, maxItems) : rehearsals;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-slate-700 mb-3 px-1">My Group Rehearsals</h2>
      <div className="space-y-4">
      {/* Filter Tabs - Only show when user has BOTH zone and sub-group rehearsals */}
      {showFilter && zoneRehearsals.length > 0 && subGroupRehearsals.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'all'
                ? 'text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={filter === 'all' ? { backgroundColor: zoneColor } : {}}
          >
            <Filter className="w-3.5 h-3.5" />
            All ({rehearsals.length})
          </button>
          
          <button
            onClick={() => setFilter('zone')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'zone'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Zone ({zoneRehearsals.length})
          </button>
          
          <button
            onClick={() => setFilter('subgroup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'subgroup'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            My Groups ({subGroupRehearsals.length})
          </button>
        </div>
      )}

      {/* Rehearsals List */}
      {displayRehearsals.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No rehearsals found</p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-2 text-sm underline"
              style={{ color: zoneColor }}
            >
              View all rehearsals
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayRehearsals.map((rehearsal) => (
            <RehearsalCard
              key={`${rehearsal.scope}-${rehearsal.id}`}
              rehearsal={rehearsal}
              zoneColor={zoneColor}
              onClick={onRehearsalClick}
              showScopeBadge={subGroupRehearsals.length > 0}
            />
          ))}
        </div>
      )}

      {/* Show more link */}
      {maxItems && rehearsals.length > maxItems && (
        <Link
          href="/pages/rehearsals"
          className="block text-center text-sm font-medium py-2"
          style={{ color: zoneColor }}
        >
          View all {rehearsals.length} rehearsals →
        </Link>
      )}
      </div>
    </div>
  );
}

// Individual Rehearsal Card
function RehearsalCard({
  rehearsal,
  zoneColor,
  onClick,
  showScopeBadge = true
}: {
  rehearsal: CombinedRehearsal;
  zoneColor: string;
  onClick?: (rehearsal: CombinedRehearsal) => void;
  showScopeBadge?: boolean;
}) {
  const href = `/pages/praise-night?page=${rehearsal.id}`;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(rehearsal);
    }
  };

  return (
    <Link href={href} onClick={handleClick}>
      <div className="bg-white/70 backdrop-blur-sm border-0 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:bg-white/90 transition-all duration-300 active:scale-[0.98] group ring-1 ring-black/5">
        <div className="flex items-start gap-3">
          {/* Date Badge */}
          <div
            className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: showScopeBadge && rehearsal.scope === 'subgroup' ? '#9333EA' : zoneColor }}
          >
            <span className="text-[10px] font-medium uppercase">
              {new Date(rehearsal.date).toLocaleDateString('en-US', { month: 'short' })}
            </span>
            <span className="text-lg font-bold leading-none">
              {new Date(rehearsal.date).getDate()}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 text-sm truncate">
                {rehearsal.name}
              </h3>
              {showScopeBadge && (
                <RehearsalScopeBadge
                  scope={rehearsal.scope}
                  label={rehearsal.scope === 'subgroup' ? rehearsal.subGroupName : undefined}
                  size="sm"
                />
              )}
            </div>
            
            {rehearsal.location && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{rehearsal.location}</span>
              </div>
            )}
            
            {rehearsal.description && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                {rehearsal.description}
              </p>
            )}
          </div>

          {/* Arrow */}
          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors flex-shrink-0">
            <ChevronRight className="w-3 h-3 text-gray-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
