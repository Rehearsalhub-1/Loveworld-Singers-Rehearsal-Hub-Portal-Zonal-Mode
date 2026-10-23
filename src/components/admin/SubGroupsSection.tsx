"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Users,
  Search,
  Clock,
  RefreshCw,
  CheckCircle,
  Plus,
  ShieldCheck,
  Mail,
  X,
  Trash2,
  UserPlus,
  Check,
  AlertCircle,
  Eye,
  UserCheck,
} from 'lucide-react';
import { useZoneSubGroups } from '@/hooks/useSubGroup';
import { useZone } from '@/hooks/useZone';
import { SubGroup } from '@/types/subgroup';
import { BackendAPI } from '@/lib/api-client';
import CustomLoader from '@/components/CustomLoader';
import { Toast } from '@/components/Toast';

// Sub-components
import { StatCard } from './subgroups/StatCard';
import { SubGroupRow } from './subgroups/SubGroupRow';
import { RejectModal } from './subgroups/RejectModal';
import { SubGroupDetailModal } from './subgroups/SubGroupDetailModal';

interface SubGroupsSectionProps {
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

interface ChurchMember {
  id: string;
  userId: string;
  name?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  userEmail?: string;
  avatarUrl?: string;
  voicePart?: string;
  designation?: string;
  role?: string;
}

export default function SubGroupsSection({ addToast }: SubGroupsSectionProps) {
  const { currentZone } = useZone();
  const { 
    subGroups, 
    activeSubGroups, 
    pendingCount, 
    isLoading, 
    approveSubGroup, 
    rejectSubGroup,
    createChurch,
    assignCoordinator,
    getChurchMembers,
    addChurchMember,
    removeChurchMember,
    refresh
  } = useZoneSubGroups();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'all'>('active');
  const [selectedSubGroup, setSelectedSubGroup] = useState<SubGroup | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Create Church Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newChurchName, setNewChurchName] = useState('');
  const [newChurchCode, setNewChurchCode] = useState('');
  const [isCreatingChurch, setIsCreatingChurch] = useState(false);

  // Assign Coordinator Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Manage Roster Modal
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [churchMembers, setChurchMembers] = useState<ChurchMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [zoneDirectory, setZoneDirectory] = useState<any[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');
  const [showAddSingerPicker, setShowAddSingerPicker] = useState(false);
  const [actionSingerId, setActionSingerId] = useState<string | null>(null);

  // If there are pending requests and no active churches, or user just switched, set sensible tab
  useEffect(() => {
    if (pendingCount > 0 && activeSubGroups.length === 0) {
      setActiveTab('pending');
    }
  }, [pendingCount, activeSubGroups.length]);

  // Statistics
  const stats = [
    { label: 'Churches & Groups', value: subGroups.length, icon: <Building2 className="w-4 h-4" />, color: 'purple' as const },
    { label: 'Active Assemblies', value: activeSubGroups.length, icon: <CheckCircle className="w-4 h-4" />, color: 'green' as const },
    { label: 'Pending Requests', value: pendingCount, icon: <Clock className="w-4 h-4" />, color: 'orange' as const, pulse: pendingCount > 0 },
  ];

  // Filtered groups
  const filteredGroups = subGroups.filter(sg => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      sg.name.toLowerCase().includes(q) ||
      (sg.code && sg.code.toLowerCase().includes(q)) ||
      (sg.coordinatorName && sg.coordinatorName.toLowerCase().includes(q)) ||
      (sg.coordinatorEmail && sg.coordinatorEmail.toLowerCase().includes(q));
    
    if (activeTab === 'pending') return matchesSearch && sg.status === 'pending';
    if (activeTab === 'active') return matchesSearch && (sg.status === 'active' || !sg.status);
    return matchesSearch;
  });

  const handleApprove = async (id: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await approveSubGroup(id);
      if (result.success) {
        addToast({ message: 'Church approved and activated successfully!', type: 'success' });
      } else {
        addToast({ message: `Error: ${result.error}`, type: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = (subGroup: SubGroup) => {
    setSelectedSubGroup(subGroup);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedSubGroup || !rejectReason.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await rejectSubGroup(selectedSubGroup.id, rejectReason);
      if (result.success) {
        addToast({ message: 'Church request declined.', type: 'info' });
        setIsRejectModalOpen(false);
        setIsDetailModalOpen(false);
        setSelectedSubGroup(null);
      } else {
        addToast({ message: `Error: ${result.error}`, type: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const openDetailModal = (subGroup: SubGroup) => {
    setSelectedSubGroup(subGroup);
    setIsDetailModalOpen(true);
  };

  // ── Create Church Handler ──────────────────────────────────────────────
  const handleCreateChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChurchName.trim() || !newChurchCode.trim()) {
      addToast({ message: 'Please enter church name and code.', type: 'error' });
      return;
    }
    setIsCreatingChurch(true);
    try {
      const res = await createChurch(newChurchName.trim(), newChurchCode.trim());
      if (res.success) {
        addToast({ message: `Church "${newChurchName}" created successfully!`, type: 'success' });
        setIsCreateModalOpen(false);
        setNewChurchName('');
        setNewChurchCode('');
        setActiveTab('active');
      } else {
        addToast({ message: res.error || 'Failed to create church', type: 'error' });
      }
    } finally {
      setIsCreatingChurch(false);
    }
  };

  // ── Assign Coordinator Handler ────────────────────────────────────────
  const openAssignModal = (church: SubGroup) => {
    setSelectedSubGroup(church);
    setCoordinatorEmail(church.coordinatorEmail || '');
    setIsAssignModalOpen(true);
  };

  const handleAssignCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubGroup || !coordinatorEmail.trim()) {
      addToast({ message: 'Please enter a coordinator email.', type: 'error' });
      return;
    }
    setIsAssigning(true);
    try {
      const res = await assignCoordinator(selectedSubGroup.id, coordinatorEmail.trim().toLowerCase());
      if (res.success) {
        addToast({ message: 'Church coordinator appointed successfully!', type: 'success' });
        setIsAssignModalOpen(false);
        setCoordinatorEmail('');
        setSelectedSubGroup(null);
      } else {
        addToast({ message: res.error || 'Failed to appoint coordinator', type: 'error' });
      }
    } finally {
      setIsAssigning(false);
    }
  };

  // ── Manage Roster Handlers ───────────────────────────────────────────
  const openRosterModal = async (church: SubGroup) => {
    setSelectedSubGroup(church);
    setIsRosterModalOpen(true);
    setLoadingMembers(true);
    setShowAddSingerPicker(false);
    setDirectorySearch('');

    try {
      const res = await getChurchMembers(church.id);
      setChurchMembers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setChurchMembers([]);
    } finally {
      setLoadingMembers(false);
    }

    // Pre-load zone directory for quick addition
    setLoadingDirectory(true);
    try {
      const dirRes: any = await BackendAPI.profiles.directory({
        zoneId: church.zoneId || currentZone?.id,
        limit: 500,
      }).catch(() => null);
      const list = Array.isArray(dirRes) ? dirRes : (dirRes?.data || []);
      setZoneDirectory(list);
    } catch {
      setZoneDirectory([]);
    } finally {
      setLoadingDirectory(false);
    }
  };

  const handleAddSingerToChurch = async (userId: string) => {
    if (!selectedSubGroup) return;
    setActionSingerId(userId);
    try {
      const res = await addChurchMember(selectedSubGroup.id, userId);
      if (res.success) {
        addToast({ message: 'Singer added to church choir roster!', type: 'success' });
        const membersRes = await getChurchMembers(selectedSubGroup.id);
        setChurchMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
        refresh();
      } else {
        addToast({ message: res.error || 'Failed to add singer', type: 'error' });
      }
    } finally {
      setActionSingerId(null);
    }
  };

  const handleRemoveSingerFromChurch = async (userId: string) => {
    if (!selectedSubGroup) return;
    setActionSingerId(userId);
    try {
      const res = await removeChurchMember(selectedSubGroup.id, userId);
      if (res.success) {
        addToast({ message: 'Singer removed from church roster.', type: 'info' });
        setChurchMembers(prev => prev.filter(m => (m.userId || m.id) !== userId));
        refresh();
      } else {
        addToast({ message: res.error || 'Failed to remove singer', type: 'error' });
      }
    } finally {
      setActionSingerId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <CustomLoader size="lg" message="Loading churches & subgroups..." />
      </div>
    );
  }

  // Filtered directory for singer picker (excluding members already in this church)
  const existingUserIds = new Set(churchMembers.map(m => m.userId || m.id));
  const filteredDirectory = zoneDirectory.filter(singer => {
    const sId = singer.userId || singer.id;
    if (existingUserIds.has(sId)) return false;
    const q = directorySearch.toLowerCase();
    if (!q) return true;
    const name = (singer.name || singer.displayName || `${singer.firstName || ''} ${singer.lastName || ''}`).toLowerCase();
    const email = (singer.email || singer.userEmail || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 scrollbar-hide">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 lg:px-8 pt-5 lg:pt-8 pb-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Churches & Subgroups</h1>
              </div>
              <p className="text-sm font-medium text-gray-500 mt-1">
                Manage local church assemblies, coordinator appointments, and choir rosters.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-purple-200 transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3px]" />
                Add Church
              </button>
              <button
                onClick={refresh}
                className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors active:scale-95 flex-shrink-0"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
            {stats.map((stat, i) => (
              <StatCard key={i} {...stat} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          {/* Tabs */}
          <div className="flex bg-gray-200/70 p-1 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all capitalize flex items-center gap-1.5 ${
                activeTab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Churches Directory
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 rounded-full font-black">
                {activeSubGroups.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all capitalize flex items-center gap-1.5 ${
                activeTab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending Requests
              {pendingCount > 0 && (
                <span className="w-4 h-4 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all capitalize flex items-center gap-1.5 ${
                activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by church or coordinator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          {filteredGroups.length === 0 ? (
            <div className="py-20 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
                <Building2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-1">
                {activeTab === 'pending' ? 'No Pending Church Requests' : 'No Churches Found'}
              </h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : activeTab === 'pending'
                  ? 'All local church requests in your zone have been approved or resolved.'
                  : 'Get started by clicking "+ Add Church" to register a local church choir assembly.'}
              </p>
              {activeTab !== 'pending' && !searchQuery && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-purple-50 text-purple-700 text-xs font-bold rounded-xl hover:bg-purple-100 transition-all"
                >
                  Register Church Now
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredGroups.map((sg) => (
                <SubGroupRow
                  key={sg.id}
                  subGroup={sg}
                  onApprove={() => handleApprove(sg.id)}
                  onReject={() => openRejectModal(sg)}
                  onView={() => openDetailModal(sg)}
                  onManageMembers={() => openRosterModal(sg)}
                  onAssignCoordinator={() => openAssignModal(sg)}
                  processing={isProcessing}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE CHURCH MODAL ─────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Register New Church</h3>
                  <p className="text-xs text-slate-400">Add church assembly to zone directory</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChurch} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Church Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Christ Embassy Lekki"
                  value={newChurchName}
                  onChange={(e) => setNewChurchName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Church Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CELKK"
                  value={newChurchCode}
                  onChange={(e) => setNewChurchCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">Short unique code used for choir member identification.</p>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingChurch || !newChurchName.trim() || !newChurchCode.trim()}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2"
                >
                  {isCreatingChurch ? <CustomLoader size="sm" /> : 'Create Church'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN COORDINATOR MODAL ────────────────────────────────────── */}
      {isAssignModalOpen && selectedSubGroup && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Appoint Coordinator</h3>
                  <p className="text-xs text-slate-400">{selectedSubGroup.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignCoordinator} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Coordinator Member Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="coordinator@loveworldsingers.org"
                    value={coordinatorEmail}
                    onChange={(e) => setCoordinatorEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Enter the registered email of the singer. They will be granted Church Coordinator management access for this church.
                </p>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !coordinatorEmail.trim()}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  {isAssigning ? <CustomLoader size="sm" /> : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MANAGE ROSTER MODAL ─────────────────────────────────────────── */}
      {isRosterModalOpen && selectedSubGroup && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">{selectedSubGroup.name}</h3>
                    {selectedSubGroup.code && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black rounded-md">
                        {selectedSubGroup.code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choir Roster • {churchMembers.length} Singer{churchMembers.length === 1 ? '' : 's'} Enrolled
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddSingerPicker(!showAddSingerPicker)}
                  className={`h-9 px-3.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                    showAddSingerPicker
                      ? 'bg-slate-200 text-slate-800'
                      : 'bg-purple-600 text-white shadow-md shadow-purple-200 hover:bg-purple-700'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {showAddSingerPicker ? 'Close Picker' : 'Add Singer'}
                </button>
                <button
                  onClick={() => setIsRosterModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Singer Picker Drawer (Add Singer) */}
            {showAddSingerPicker && (
              <div className="p-4 bg-purple-50/70 border-b border-purple-100 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-900">
                    Add Singer from Zone Choir
                  </span>
                  <span className="text-[11px] font-medium text-purple-600">
                    {filteredDirectory.length} available
                  </span>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-400" />
                  <input
                    type="text"
                    placeholder="Search singers by name or email..."
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {loadingDirectory ? (
                    <div className="py-4 text-center text-xs text-purple-700">Loading directory...</div>
                  ) : filteredDirectory.length === 0 ? (
                    <div className="py-4 text-center text-xs text-purple-700/70">
                      No matching singers available to add.
                    </div>
                  ) : (
                    filteredDirectory.slice(0, 15).map((singer) => {
                      const singerId = singer.userId || singer.id;
                      const sName = singer.name || singer.displayName || `${singer.firstName || ''} ${singer.lastName || ''}`.trim() || 'Singer';
                      const sEmail = singer.email || singer.userEmail || '';
                      const sPart = singer.voicePart || singer.designation;
                      const isAdding = actionSingerId === singerId;

                      return (
                        <div
                          key={singerId}
                          className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-purple-100 hover:border-purple-300 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                              {sName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">{sName}</div>
                              <div className="text-[10px] text-slate-400 truncate">{sEmail}</div>
                            </div>
                            {sPart && (
                              <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-md uppercase">
                                {sPart}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleAddSingerToChurch(singerId)}
                            disabled={isAdding}
                            className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50"
                          >
                            {isAdding ? <CustomLoader size="sm" /> : <Plus className="w-3.5 h-3.5" />}
                            Add
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {loadingMembers ? (
                <div className="py-16 text-center">
                  <CustomLoader message="Loading church choir roster..." />
                </div>
              ) : churchMembers.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-14 h-14 bg-slate-100 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No singers enrolled in this church yet</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Click "Add Singer" above to assign singers from your zone directory to this church choir.
                  </p>
                </div>
              ) : (
                churchMembers.map((member) => {
                  const mId = member.userId || member.id;
                  const mName = member.name || member.displayName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Singer';
                  const mEmail = member.email || member.userEmail || '';
                  const mPart = member.voicePart || member.designation;
                  const isRemoving = actionSingerId === mId;

                  return (
                    <div
                      key={mId}
                      className="flex items-center justify-between p-3 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                          {mName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 truncate">{mName}</span>
                            {mPart && (
                              <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 text-[9px] font-bold rounded-md uppercase">
                                {mPart}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 truncate block">{mEmail}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveSingerFromChurch(mId)}
                        disabled={isRemoving}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Remove singer from church"
                      >
                        {isRemoving ? <CustomLoader size="sm" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Total Choir Members: <strong className="text-slate-800">{churchMembers.length}</strong>
              </span>
              <button
                onClick={() => setIsRosterModalOpen(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-300 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && selectedSubGroup && (
        <RejectModal
          subGroup={selectedSubGroup}
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onConfirm={handleReject}
          onClose={() => setIsRejectModalOpen(false)}
          processing={isProcessing}
        />
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedSubGroup && (
        <SubGroupDetailModal
          subGroup={selectedSubGroup}
          onApprove={() => handleApprove(selectedSubGroup.id)}
          onReject={() => openRejectModal(selectedSubGroup)}
          onClose={() => {
            setIsDetailModalOpen(false);
            if (!isRejectModalOpen) setSelectedSubGroup(null);
          }}
          processing={isProcessing}
        />
      )}
    </div>
  );
}
