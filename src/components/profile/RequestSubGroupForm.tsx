"use client";

import React, { useState } from 'react';
import {
  UsersRound,
  Building2,
  GraduationCap,
  Users,
  Sparkles,
  MoreHorizontal,
  Send,
  X,
  CheckCircle,
  Clock,
  CreditCard,
  XCircle,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useSubGroup } from '@/hooks/useSubGroup';
import { useAuth } from '@/hooks/useAuth';
import { useZone } from '@/hooks/useZone';
import { SubGroupType, SubGroupStatus } from '@/types/subgroup';

const TYPE_OPTIONS: { value: SubGroupType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'church', label: 'Church Choir', icon: <Building2 className="w-5 h-5" />, description: 'A choir within a local church' },
  { value: 'campus', label: 'Campus Fellowship', icon: <GraduationCap className="w-5 h-5" />, description: 'University or college fellowship group' },
  { value: 'cell', label: 'Cell Group', icon: <Users className="w-5 h-5" />, description: 'Small group or home cell' },
  { value: 'youth', label: 'Youth Choir', icon: <Sparkles className="w-5 h-5" />, description: 'Youth ministry choir' },
  { value: 'other', label: 'Other', icon: <MoreHorizontal className="w-5 h-5" />, description: 'Other type of group' }
];

const STATUS_CONFIG: Record<SubGroupStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: { 
    label: 'Pending Approval', 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-100',
    icon: <Clock className="w-4 h-4" /> 
  },
  active: { 
    label: 'Active', 
    color: 'text-green-700', 
    bgColor: 'bg-green-100',
    icon: <CheckCircle className="w-4 h-4" /> 
  },
  rejected: { 
    label: 'Rejected', 
    color: 'text-red-700', 
    bgColor: 'bg-red-100',
    icon: <XCircle className="w-4 h-4" /> 
  }
};

export default function RequestSubGroupForm() {
  const { profile } = useAuth();
  const { currentZone } = useZone();
  const { userRequests, requestSubGroup, isLoading, refresh } = useSubGroup();
  
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'church' as SubGroupType,
    description: '',
    estimatedMembers: 10
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showToast('error', 'Please enter a group name');
      return;
    }
    
    if (!formData.description.trim()) {
      showToast('error', 'Please enter a description');
      return;
    }
    
    setSubmitting(true);
    
    const requesterName = profile?.first_name 
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Unknown';
    const requesterEmail = profile?.email || '';
    
    const result = await requestSubGroup(
      {
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim(),
        estimatedMembers: formData.estimatedMembers
      },
      requesterName,
      requesterEmail
    );
    
    setSubmitting(false);
    
    if (result.success) {
      showToast('success', 'Sub-group request submitted! Awaiting approval.');
      setShowForm(false);
      setFormData({ name: '', type: 'church', description: '', estimatedMembers: 10 });
    } else {
      showToast('error', result.error || 'Failed to submit request');
    }
  };

    const hasPendingRequest = userRequests.some(r => r.status === 'pending');

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 text-slate-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <UsersRound className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-900">Sub-Groups</h3>
            <p className="text-sm text-slate-500">
              {userRequests.length > 0 
                ? `${userRequests.length} request(s)` 
                : 'Create or join a sub-group'}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-200">
          {/* Existing Requests */}
          {userRequests.length > 0 && (
            <div className="p-4 space-y-3">
              <h4 className="text-sm font-medium text-slate-700">Your Requests</h4>
              {userRequests.map((request) => {
                const statusConfig = STATUS_CONFIG[request.status];
                return (
                  <div key={request.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{request.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {TYPE_OPTIONS.find(t => t.value === request.type)?.label}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>
                    {request.status === 'rejected' && request.rejectionReason && (
                      <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                        Reason: {request.rejectionReason}
                      </p>
                    )}
                    {/* Payment UI removed as subgroups are now immediate on approval */}
                  </div>
                );
              })}
            </div>
          )}

          {/* Request Button or Form */}
          {!showForm ? (
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => setShowForm(true)}
                disabled={hasPendingRequest}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Request New Sub-Group
              </button>
              {hasPendingRequest && (
                <p className="text-xs text-slate-500 text-center mt-2">
                  You already have a pending request
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-900">New Sub-Group Request</h4>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Christ Embassy Ikeja Choir"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Group Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Group Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: option.value }))}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        formData.type === option.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={formData.type === option.value ? 'text-purple-600' : 'text-slate-400'}>
                          {option.icon}
                        </span>
                        <span className={`text-sm font-medium ${formData.type === option.value ? 'text-purple-700' : 'text-slate-700'}`}>
                          {option.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Briefly describe your group and its purpose..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Estimated Members */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Estimated Members
                </label>
                <input
                  type="number"
                  min={5}
                  max={500}
                  value={formData.estimatedMembers}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedMembers: parseInt(e.target.value) || 10 }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-slate-500 mt-1">Minimum 5 members for group discounts</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>

              <p className="text-xs text-slate-500 text-center">
                Your request will be reviewed by the Zone Coordinator
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
