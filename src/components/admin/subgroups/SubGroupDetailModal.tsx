import React, { useState } from 'react';
import { X, Check, CheckCircle, Info, User as UserIcon, Mail, Copy, Calendar, RefreshCw, XCircle, Sparkles } from 'lucide-react';
import { SubGroup } from '@/types/subgroup';
import { TYPE_ICONS, TYPE_LABELS, STATUS_CONFIG } from './SubGroupConstants';

interface SubGroupDetailModalProps {
  subGroup: SubGroup;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
  processing: boolean;
}

export function SubGroupDetailModal({
  subGroup,
  onApprove,
  onReject,
  onClose,
  processing
}: SubGroupDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const statusConfig = (subGroup.status && STATUS_CONFIG[subGroup.status]) || STATUS_CONFIG.active;
  const typeKey = (subGroup.type && TYPE_ICONS[subGroup.type]) ? subGroup.type : 'church';
  const typeLabel = TYPE_LABELS[typeKey] || 'Church Choir';
  const typeIcon = TYPE_ICONS[typeKey];

  const copyEmail = () => {
    if (!subGroup.coordinatorEmail) return;
    navigator.clipboard.writeText(subGroup.coordinatorEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Slide-over Panel */}
      <div className="absolute inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out">
        {/* Header/Banner Area */}
        <div className={`relative h-32 flex-shrink-0 ${
          subGroup.status === 'active' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
          subGroup.status === 'pending' ? 'bg-gradient-to-br from-orange-500 to-amber-600' :
          'bg-gradient-to-br from-slate-500 to-slate-600'
        }`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all backdrop-blur-md z-10"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="absolute -bottom-10 left-8">
            <div className="w-24 h-24 rounded-[2.5rem] bg-white p-1 shadow-xl">
              <div className={`w-full h-full rounded-[2.2rem] flex items-center justify-center text-white ${
                subGroup.status === 'active' ? 'bg-emerald-500' :
                subGroup.status === 'pending' ? 'bg-orange-500' : 'bg-indigo-500'
              }`}>
                {React.isValidElement(typeIcon) && React.cloneElement(typeIcon as React.ReactElement<any>, { className: "w-10 h-10" })}
              </div>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="pt-14 pb-4 px-8 border-b border-slate-50 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black text-slate-900 truncate tracking-tight">{subGroup.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusConfig.color}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{typeLabel}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
          {/* Quick Stats Grid */}
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100/50 group hover:bg-white hover:shadow-md transition-all">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Est. Capacity</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 leading-none">{subGroup.estimatedMembers}</span>
              </div>
            </div>
            <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100/50 group hover:bg-white hover:shadow-md transition-all">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Members</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 leading-none">{subGroup.memberIds?.length || 0}</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
          </section>

          {/* Description */}
          <section>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Purpose & Mission
            </h4>
            <div className="p-6 rounded-[2rem] bg-indigo-50/30 border border-indigo-100/50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <Sparkles className="w-16 h-16 text-indigo-600" />
              </div>
              <p className="text-slate-600 leading-relaxed text-[15px] italic whitespace-pre-wrap relative z-10">
                "{subGroup.description || 'Commitment to excellence in ministry through subgroup activities and shared rehearsal goals.'}"
              </p>
            </div>
          </section>

          {/* Coordinator Section */}
          <section>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Administrative Head
            </h4>
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-100">
                  {subGroup.coordinatorName?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="text-base font-black text-slate-900 tracking-tight">{subGroup.coordinatorName}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sub-Group Coordinator</p>
                </div>
              </div>
              
              {subGroup.coordinatorEmail && (
                <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-600 truncate max-w-[200px]">{subGroup.coordinatorEmail}</span>
                  </div>
                  <button
                    onClick={copyEmail}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      copied ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          </section>
          
          {subGroup.status === 'rejected' && subGroup.rejectionReason && (
            <section className="animate-in slide-in-from-bottom-2 duration-300">
              <div className="p-6 rounded-[2rem] bg-rose-50 border border-rose-100">
                <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-3">Rejection Feedback</h4>
                <p className="text-rose-700 font-medium italic text-sm leading-relaxed">
                  "{subGroup.rejectionReason}"
                </p>
              </div>
            </section>
          )}

          <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest py-4 border-t border-slate-50">
            <Calendar className="w-3.5 h-3.5" />
            <span>Requested on {new Date(subGroup.createdAt || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-100 bg-white flex flex-col gap-3">
          {subGroup.status === 'pending' ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onApprove}
                disabled={processing}
                className="flex-1 h-14 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-[1.25rem] hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-emerald-200 disabled:opacity-50"
              >
                {processing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5 stroke-[3px]" />}
                Approve Sub-Group
              </button>
              <button
                onClick={onReject}
                disabled={processing}
                className="flex-1 h-14 bg-rose-50 text-rose-600 font-black uppercase tracking-widest rounded-[1.25rem] hover:bg-rose-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest rounded-[1.25rem] hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
            >
              Close Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
