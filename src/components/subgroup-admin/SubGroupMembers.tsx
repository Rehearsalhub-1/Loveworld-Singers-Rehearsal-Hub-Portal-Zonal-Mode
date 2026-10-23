"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  X,
  Mail,
  Phone,
  Trash2,
  Check,
  ChevronRight,
  Shield,
  Clock,
  Globe,
  Filter,
  Zap,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Building2,
  Tag,
  Star,
  Download,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { BackendAPI, unwrap } from '@/lib/api-client';
import { useZone } from '@/hooks/useZone';
import { useAuth } from '@/hooks/useAuth';
import CustomLoader from '@/components/CustomLoader';

interface SubGroupMembersProps {
  subGroupId: string;
  zoneId: string;
}

interface Member {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  joinedAt?: any;
  createdAt?: any;
  profile_image_url?: string;
  designation?: string;
  administration?: string;
  church?: string;
  role?: string;
  is_active?: boolean;
}

// Stats Card Component
function StatCard({
  label,
  value,
  icon,
  color,
  pulse
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'purple' | 'green' | 'blue' | 'orange';
  pulse?: boolean;
}) {
  const colors = {
    purple: 'border-purple-500 bg-purple-50/50 text-purple-600',
    green: 'border-emerald-500 bg-emerald-50/50 text-emerald-600',
    blue: 'border-blue-500 bg-blue-50/50 text-blue-600',
    orange: 'border-orange-500 bg-orange-50/50 text-orange-600'
  };

  const iconColors = {
    purple: 'bg-purple-500 text-white shadow-purple-200',
    green: 'bg-emerald-500 text-white shadow-emerald-200',
    blue: 'bg-blue-500 text-white shadow-blue-200',
    orange: 'bg-orange-500 text-white shadow-orange-200'
  };

  return (
    <div className={`flex-shrink-0 w-[160px] lg:w-auto lg:flex-1 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm transition-all hover:shadow-md border-l-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${iconColors[color]}`}>
          {icon}
        </div>
        {pulse && (
          <div className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
        )}
      </div>
      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.1em] mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl lg:text-3xl font-black text-slate-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ label, color, icon }: { label: string; color: string; icon?: React.ReactNode }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    slate: 'bg-slate-50 text-slate-500 border-slate-200'
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${colors[color] || colors.slate}`}>
      {icon}
      {label}
    </div>
  );
}

// Info Field Component
function InfoField({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-sm font-bold text-slate-700 truncate">{value || 'Not provided'}</p>
      </div>
    </div>
  );
}

// Editable Field Component
function EditableField({ label, value, isEditing, onChange, icon }: { label: string; value: string; isEditing: boolean; onChange: (val: string) => void; icon?: React.ReactNode }) {
  if (!isEditing) return <InfoField label={label} value={value} icon={icon || <Tag className="w-4 h-4" />} />;
  
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${icon ? 'pl-10' : 'px-4'} py-3 bg-white border-2 border-indigo-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all`}
        />
      </div>
    </div>
  );
}

export default function SubGroupMembers({ subGroupId, zoneId }: SubGroupMembersProps) {
  const { currentZone } = useZone();
  const { profile: currentUserProfile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [zoneMembers, setZoneMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedForAdd, setSelectedForAdd] = useState<string[]>([]);
  const [displayLimit, setDisplayLimit] = useState(50);
  
  // Profile Detail Modal
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Member>>({});
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'settings'>('info');
  const [savingProfile, setSavingProfile] = useState(false);

  const themeColor = currentZone?.themeColor || '#9333ea';

  useEffect(() => {
    loadMembers();
  }, [subGroupId]);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const raw = unwrap<any[]>(await BackendAPI.subgroups.members(subGroupId));
      setMembers(raw.map((m: any) => {
        const u = m.user || m.profile || m;
        const firstName = (u.firstName || u.first_name || '').trim();
        const lastName = (u.lastName || u.last_name || '').trim();
        const name = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : (u.name || u.displayName || 'Unknown');
        return {
          ...m,
          ...u,
          id: u.id || m.userId || m.id,
          name,
          first_name: firstName,
          last_name: lastName,
          email: u.email || m.email,
          phone: u.phone || m.phone,
          joinedAt: m.joinedAt || m.createdAt || new Date()
        };
      }));
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadZoneMembers = async () => {
    try {
      const allZoneMembers = unwrap<any[]>(await BackendAPI.members.byZone(zoneId));
      const memberIds = members.map(m => m.id);
      setZoneMembers(allZoneMembers.filter((m: any) => !memberIds.includes(m.userId || m.id)));
    } catch (error) {
      console.error('Error loading zone members:', error);
    }
  };

  const handleSearchChange = async (val: string) => {
    setAddSearchTerm(val);
    if (isGlobalSearch) {
      if (val.trim().length === 0) {
        loadGlobalPreview();
        return;
      }
      
      setIsSearching(true);
      setDisplayLimit(50); // Reset limit on new search
      try {
        const results = unwrap<any[]>(await BackendAPI.profiles.getAll({ search: val }));
        const subgroupMemberIds = members.map(m => m.id);
        setGlobalResults(results.filter((r: any) => !subgroupMemberIds.includes(r.id)));
      } catch (error) {
        console.error('Global search error:', error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const loadGlobalPreview = async () => {
    setIsSearching(true);
    setDisplayLimit(50); // Reset limit on preview
    try {
      const results = unwrap<any[]>(await BackendAPI.profiles.getAll({ limit: 50 }));
      const subgroupMemberIds = members.map(m => m.id);
      setGlobalResults(results.filter((r: any) => !subgroupMemberIds.includes(r.id)));
    } catch (error) {
      console.error('Global preview error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenAdd = () => {
    setAddSearchTerm('');
    setIsGlobalSearch(false);
    setGlobalResults([]);
    loadZoneMembers();
    setShowAddModal(true);
  };

  const handleAddMembers = async () => {
    if (selectedForAdd.length === 0) return;
    setAdding(true);
    try {
      for (const userId of selectedForAdd) {
        await BackendAPI.subgroups.addMember(subGroupId, { userId });
      }
      setSelectedForAdd([]);
      setShowAddModal(false);
      loadMembers();
    } catch (error) {
      console.error('Error adding members:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove from group?')) return;
    try {
      await BackendAPI.subgroups.removeMember(subGroupId, memberId);
      loadMembers();
      if (selectedMember?.id === memberId) setSelectedMember(null);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedMember || !editForm) return;
    setSavingProfile(true);
    try {
      await BackendAPI.profiles.update(selectedMember.id, editForm);
      const updatedMember = { ...selectedMember, ...editForm, name: editForm.first_name ? `${editForm.first_name} ${editForm.last_name || ''}` : selectedMember.name };
      setMembers(prev => prev.map(m => m.id === selectedMember.id ? updatedMember : m));
      setSelectedMember(updatedMember);
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleAddSelection = (memberId: string) => {
    setSelectedForAdd(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const localZoneFiltered = zoneMembers.filter(m => {
    const displayName = m.profile?.first_name 
      ? `${m.profile.first_name} ${m.profile.last_name || ''}`
      : (m.userName || m.name || 'Unknown User');
    return displayName.toLowerCase().includes(addSearchTerm.toLowerCase()) || 
           (m.userEmail || m.email || '').toLowerCase().includes(addSearchTerm.toLowerCase());
  });

  const displayList = isGlobalSearch ? globalResults : localZoneFiltered;

  // Stats for the header
  const stats = useMemo(() => {
    return {
      total: members.length,
      active: members.filter(m => m.is_active !== false).length,
      coordinators: members.filter(m => m.role === 'coordinator').length,
      new: members.filter(m => {
        const joinDate = m.joinedAt?.toDate ? m.joinedAt.toDate() : new Date(m.joinedAt || 0);
        const today = new Date();
        return joinDate.toDateString() === today.toDateString();
      }).length
    };
  }, [members]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[400px]">
        <CustomLoader message="Loading personnel..." />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Admin Stats Header */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
        <StatCard
          label="Total"
          value={stats.total}
          icon={<Users className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={<Zap className="w-5 h-5" />}
          color="green"
          pulse
        />
        <StatCard
          label="Leads"
          value={stats.coordinators}
          icon={<ShieldCheck className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Today"
          value={stats.new}
          icon={<TrendingUp className="w-5 h-5" />}
          color="orange"
        />
      </div>

      {/* Search & Actions Bar - Dashboard Style */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
          <input
            type="text"
            placeholder="Search personnel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-[13px] font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-purple-600/10 focus:border-purple-600/30 transition-all shadow-sm"
          />
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-black text-xs shadow-xl shadow-slate-200 active:scale-95"
        >
          <UserPlus className="w-4.5 h-4.5" />
          <span>Add Personnel</span>
        </button>
      </div>

      {/* Members List - Responsive */}
      <div className="space-y-4">
        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personnel</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Role & Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-8 py-24 text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Users className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">No personnel found</p>
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr 
                      key={member.id} 
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedMember(member)}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white rounded-2xl flex items-center justify-center text-slate-500 font-black text-lg shadow-sm overflow-hidden">
                              {member.profile_image_url ? (
                                <img src={member.profile_image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                member.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-900 text-sm truncate group-hover:text-purple-600 transition-colors">{member.name}</p>
                            <p className="text-[11px] text-slate-400 font-bold truncate mt-0.5">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                           <StatusBadge label={member.role || 'Member'} color={member.role === 'coordinator' ? 'indigo' : 'slate'} />
                           {member.is_active !== false && <StatusBadge label="Active" color="emerald" />}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedMember(member); }}
                            className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveMember(member.id); }}
                            className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {filteredMembers.length === 0 ? (
            <div className="bg-white p-20 text-center rounded-[2rem] border border-slate-100 shadow-sm">
               <Users className="w-12 h-12 text-slate-100 mx-auto mb-4" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No personnel found</p>
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div 
                key={member.id} 
                onClick={() => setSelectedMember(member)}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-black text-lg flex-shrink-0 shadow-sm overflow-hidden">
                    {member.profile_image_url ? (
                      <img src={member.profile_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 text-[13px] truncate uppercase tracking-tight">{member.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5">{member.email}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                       <StatusBadge label={member.role || 'Member'} color="indigo" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveMember(member.id); }}
                  className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Members Modal - Premium Dashboard Style */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[130] p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-none sm:rounded-[3rem] w-full max-w-xl shadow-2xl flex flex-col h-full sm:max-h-[750px] overflow-hidden border border-slate-100 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            {/* Modal Header */}
            <div className="p-8 pb-6 border-b border-slate-50 shrink-0">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add Personnel</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">Select members to join your group</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-900 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Search Input */}
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-purple-600 transition-all" />
                  <input
                    type="text"
                    placeholder={isGlobalSearch ? "Type name or email to search ministry..." : "Search in your zone members..."}
                    value={addSearchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-8 focus:ring-purple-600/5 focus:border-purple-600/30 transition-all"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                       <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Global Toggle */}
                <div 
                   onClick={() => {
                     const nextState = !isGlobalSearch;
                     setIsGlobalSearch(nextState);
                     setAddSearchTerm('');
                     if (nextState) loadGlobalPreview();
                     else setGlobalResults([]);
                   }}
                   className="flex items-center justify-between p-4 bg-slate-50/30 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                   <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isGlobalSearch ? 'bg-purple-100 text-purple-600' : 'bg-white text-slate-400 border border-slate-100 shadow-sm'}`}>
                         <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none">Global Ministry Search</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 block">Find personnel from any zone</span>
                      </div>
                   </div>
                   <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isGlobalSearch ? 'bg-purple-600' : 'bg-slate-200'}`}>
                     <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${isGlobalSearch ? 'translate-x-5' : 'translate-x-0'}`} />
                   </div>
                </div>
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3 bg-slate-50/30 custom-scrollbar">
              {displayList.length === 0 && !isSearching ? (
                <div className="text-center py-20 text-slate-300">
                  <div className="w-20 h-20 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Filter className="w-10 h-10 opacity-20" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em]">{isGlobalSearch && addSearchTerm.length < 1 ? 'Start typing to search globally' : 'No personnel found'}</p>
                </div>
              ) : (
                displayList.slice(0, displayLimit).map((member) => {
                  const displayName = member.first_name 
                    ? `${member.first_name} ${member.last_name || ''}`.trim()
                    : (member.userName || member.display_name || member.name || 'Unknown User');
                  const isSelected = selectedForAdd.includes(member.id);
                  
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleAddSelection(member.id)}
                      className={`p-4 rounded-3xl border-2 cursor-pointer transition-all ${isSelected
                          ? 'border-purple-600 bg-purple-50/50 shadow-lg shadow-purple-600/5'
                          : 'border-white bg-white hover:border-slate-100 shadow-sm'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${isSelected
                            ? 'border-purple-600 bg-purple-600'
                            : 'border-slate-200'
                          }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
                        </div>
                        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 text-lg flex-shrink-0 shadow-sm overflow-hidden">
                            {member.profile_image_url ? (
                                <img src={member.profile_image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                displayName.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-sm truncate">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-bold truncate mt-0.5">{member.userEmail || member.email}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {isGlobalSearch && displayList.length > displayLimit && (
                <div className="pt-4 pb-2">
                   <button 
                     onClick={() => setDisplayLimit(prev => prev + 50)}
                     className="w-full py-4 bg-white border-2 border-slate-100 rounded-[2rem] text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:border-purple-600 hover:text-purple-600 transition-all flex items-center justify-center gap-2"
                   >
                     <RefreshCw className="w-4 h-4" />
                     Load More Personnel
                   </button>
                </div>
              )}
              {isSearching && (
                 <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Searching ministry database...</p>
                 </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="p-8 border-t border-slate-50 bg-white flex items-center justify-between shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected</span>
                <span className="text-xl font-black text-slate-900">{selectedForAdd.length} Personnel</span>
              </div>
              <button
                onClick={handleAddMembers}
                disabled={selectedForAdd.length === 0 || adding}
                className="px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl shadow-slate-200 active:scale-95 flex items-center gap-3"
              >
                {adding ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                {adding ? 'Processing...' : 'Confirm Addition'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Profile Modal - Slide-out Panel */}
      {selectedMember && (
        <div className="fixed inset-0 z-[150] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-500" onClick={() => { setSelectedMember(null); setIsEditingProfile(false); }} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col transform transition-transform duration-500 ease-out slide-in-from-right">
              {/* Profile Header */}
              <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <button 
                    onClick={() => { setSelectedMember(null); setIsEditingProfile(false); }}
                    className="w-12 h-12 flex items-center justify-center hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Personnel Profile</h2>
                </div>
                
                <div className="flex items-center gap-3">
                  {!isEditingProfile ? (
                    <>
                      <button
                        onClick={() => {
                            setEditForm({ ...selectedMember });
                            setIsEditingProfile(true);
                        }}
                        className="w-12 h-12 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-transparent hover:border-indigo-100"
                        title="Edit Profile"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(selectedMember.id)}
                        className="w-12 h-12 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsEditingProfile(false)}
                        className="px-6 py-3 text-xs font-black text-slate-500 hover:bg-slate-100 rounded-2xl transition-all uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="px-6 py-3 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 uppercase tracking-widest"
                      >
                        {savingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Identity Section */}
              <div className="p-10 pb-6 text-center border-b border-slate-50">
                <div className="relative inline-block mb-6">
                  <div className="w-28 h-28 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-200 overflow-hidden border-4 border-white">
                    {selectedMember.profile_image_url ? (
                      <img src={selectedMember.profile_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      selectedMember.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 border-4 border-white rounded-full shadow-lg" />
                </div>
                
                <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
                  {selectedMember.name}
                </h3>
                <p className="text-slate-400 font-bold text-sm mb-6">{selectedMember.email}</p>
                
                <div className="flex items-center justify-center gap-3">
                  <StatusBadge label={selectedMember.role || 'Member'} color="indigo" icon={<Shield className="w-3.5 h-3.5" />} />
                  {selectedMember.designation && (
                    <StatusBadge label={selectedMember.designation} color="emerald" icon={<Star className="w-3.5 h-3.5" />} />
                  )}
                </div>
              </div>

              {/* Detail Tabs */}
              <div className="flex p-3 gap-2 bg-slate-50/50 border-b border-slate-100">
                {[
                  { id: 'info', label: 'Identity', icon: <Users className="w-4 h-4" /> },
                  { id: 'activity', label: 'Activity', icon: <TrendingUp className="w-4 h-4" /> },
                  { id: 'settings', label: 'Access', icon: <ShieldCheck className="w-4 h-4" /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeTab === tab.id 
                        ? 'bg-white text-indigo-600 shadow-md border border-slate-100' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Content */}
              <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                {activeTab === 'info' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <section>
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6">Personal Information</h4>
                      <div className="grid grid-cols-1 gap-5">
                        <EditableField 
                          label="First Name" 
                          value={editForm.first_name || ''} 
                          isEditing={isEditingProfile} 
                          onChange={val => setEditForm(p => ({ ...p, first_name: val }))} 
                        />
                        <EditableField 
                          label="Last Name" 
                          value={editForm.last_name || ''} 
                          isEditing={isEditingProfile} 
                          onChange={val => setEditForm(p => ({ ...p, last_name: val }))} 
                        />
                        <InfoField label="Primary Email" value={selectedMember.email || 'Not provided'} icon={<Mail className="w-4 h-4" />} />
                        <EditableField 
                          label="Phone Number" 
                          value={editForm.phone || ''} 
                          isEditing={isEditingProfile} 
                          onChange={val => setEditForm(p => ({ ...p, phone: val }))} 
                          icon={<Phone className="w-4 h-4" />}
                        />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6">Ministry Details</h4>
                      <div className="grid grid-cols-1 gap-5">
                        <EditableField 
                          label="Church" 
                          value={editForm.church || ''} 
                          isEditing={isEditingProfile} 
                          onChange={val => setEditForm(p => ({ ...p, church: val }))} 
                          icon={<Building2 className="w-4 h-4" />}
                        />
                        <EditableField 
                          label="Designation" 
                          value={editForm.designation || ''} 
                          isEditing={isEditingProfile} 
                          onChange={val => setEditForm(p => ({ ...p, designation: val }))} 
                          icon={<Tag className="w-4 h-4" />}
                        />
                        <EditableField 
                          label="Administration" 
                          value={editForm.administration || ''} 
                          isEditing={isEditingProfile} 
                          onChange={val => setEditForm(p => ({ ...p, administration: val }))} 
                          icon={<Star className="w-4 h-4" />}
                        />
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-10 animate-in fade-in duration-500">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-6 border-2 border-slate-100 border-dashed">
                      <Clock className="w-10 h-10" />
                    </div>
                    <h5 className="text-slate-900 font-black text-lg mb-2">No Recent Activity</h5>
                    <p className="text-slate-400 text-sm font-medium max-w-[200px] mx-auto">Rehearsal attendance and song submissions will appear here.</p>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                     <section className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <ShieldCheck className="w-4 h-4 text-indigo-600" />
                           Account Access
                        </h4>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                           Manage the administrative permissions for this member within the subgroup.
                        </p>
                        <button className="w-full py-4 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black text-slate-700 uppercase tracking-widest hover:border-indigo-100 hover:text-indigo-600 transition-all shadow-sm">
                           Grant Admin Privileges
                        </button>
                     </section>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
