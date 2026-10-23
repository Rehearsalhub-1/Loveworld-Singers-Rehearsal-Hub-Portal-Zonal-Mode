import React from 'react';
import { Users, Check, Eye, X } from 'lucide-react';
import { SubGroup } from '@/types/subgroup';
import { TYPE_ICONS, TYPE_LABELS, STATUS_CONFIG } from './SubGroupConstants';

interface SubGroupRowProps {
  subGroup: SubGroup;
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
  onManageMembers?: () => void;
  onAssignCoordinator?: () => void;
  processing: boolean;
}

export function SubGroupRow({
  subGroup,
  onApprove,
  onReject,
  onView,
  onManageMembers,
  onAssignCoordinator,
  processing
}: SubGroupRowProps) {
  const statusConfig = (subGroup.status && STATUS_CONFIG[subGroup.status]) || STATUS_CONFIG.active;
  const typeKey = (subGroup.type && TYPE_ICONS[subGroup.type]) ? subGroup.type : 'church';
  const typeIcon = TYPE_ICONS[typeKey];
  const typeLabel = TYPE_LABELS[typeKey] || 'Church Choir';
  const isPending = subGroup.status === 'pending';

  return (
    <div className="group bg-white hover:bg-slate-50/80 transition-all duration-300">
      {/* Main Row - Tappable */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer active:scale-[0.99] transition-transform"
        onClick={onView}
      >
        {/* Icon with gradient */}
        <div className={`w-14 h-14 lg:w-12 lg:h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${subGroup.status === 'active'
          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-100'
          : subGroup.status === 'pending'
            ? 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-100'
            : 'bg-gradient-to-br from-slate-400 to-slate-600 shadow-slate-100'
          }`}>
          <div className="text-white">
            {React.isValidElement(typeIcon) && React.cloneElement(typeIcon as React.ReactElement<any>, { className: "w-6 h-6" })}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-black text-slate-900 truncate tracking-tight text-base">{subGroup.name}</h3>
            {subGroup.code && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-md border border-slate-200">
                {subGroup.code}
              </span>
            )}
            {subGroup.status === 'active' && (
              <div className="flex-shrink-0 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm shadow-emerald-200">
                <Check className="text-white w-2.5 h-2.5 stroke-[4px]" />
              </div>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-400 truncate uppercase tracking-widest text-[10px]">
            {typeLabel} • <span className="text-slate-500 font-bold">{subGroup.coordinatorName || subGroup.coordinatorEmail || 'No Coordinator'}</span>
          </p>
          <div className="flex items-center gap-2.5 mt-2">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border border-black/5 ${statusConfig.color}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100/60 px-2.5 py-1 rounded-full border border-slate-100">
              <Users className="w-3 h-3 text-slate-400" />
              {subGroup.memberCount ?? subGroup.memberIds?.length ?? subGroup.estimatedMembers ?? 0} SINGERS
            </div>
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
          {isPending ? (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onApprove(); }}
                disabled={processing}
                className="h-10 px-4 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-100 flex items-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3px]" />
                Approve
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onReject(); }}
                disabled={processing}
                className="h-10 px-4 bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 border border-red-100"
              >
                <X className="w-4 h-4 stroke-[3px]" />
                Reject
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {onManageMembers && (
                <button
                  onClick={(e) => { e.stopPropagation(); onManageMembers(); }}
                  className="h-9 px-3 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                  title="Manage choir members"
                >
                  <Users className="w-3.5 h-3.5" />
                  Roster
                </button>
              )}
              {onAssignCoordinator && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAssignCoordinator(); }}
                  className="h-9 px-3 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                  title="Appoint coordinator"
                >
                  <Check className="w-3.5 h-3.5" />
                  Coordinator
                </button>
              )}
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-purple-600 hover:bg-purple-50 border border-slate-100 rounded-xl transition-all active:scale-90 bg-white"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Action Bar */}
      {isPending ? (
        <div className="lg:hidden flex items-center justify-end gap-2 px-4 py-2.5 bg-slate-50/50 border-t border-slate-100">
          <button
            onClick={(e) => { e.stopPropagation(); onApprove(); }}
            disabled={processing}
            className="flex-1 h-10 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5 stroke-[3px]" />
            Approve
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReject(); }}
            disabled={processing}
            className="flex-1 h-10 bg-red-100 text-red-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5 stroke-[3px]" />
            Reject
          </button>
        </div>
      ) : (
        <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-slate-50/50 border-t border-slate-100">
          {onManageMembers && (
            <button
              onClick={(e) => { e.stopPropagation(); onManageMembers(); }}
              className="flex-1 h-9 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Roster
            </button>
          )}
          {onAssignCoordinator && (
            <button
              onClick={(e) => { e.stopPropagation(); onAssignCoordinator(); }}
              className="flex-1 h-9 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Coordinator
            </button>
          )}
        </div>
      )}
    </div>
  );
}
