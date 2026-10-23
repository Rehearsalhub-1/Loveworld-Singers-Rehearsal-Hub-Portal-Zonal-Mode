"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  UserX,
  UserMinus,
  Edit,
  Trash2,
  X,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Shield,
  Zap,
  Filter,
  Check,
  RefreshCw,
  Download,
  Building2,
  MapPin,
  Star,
  Tag,
  Copy,
  Music,
  ChevronDown,
  Globe,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { useAdminTheme } from './admin/AdminThemeProvider';
import { BackendAPI, unwrap } from '@/lib/api-client';
import { useZone } from '@/hooks/useZone';
import { useAuth } from '@/hooks/useAuth';
import { isHQAdmin } from '@/config/roles';
import { isHQGroup, ZONES, Zone } from '@/config/zones';
import CustomLoader from './CustomLoader';

// In-memory cache for members data
const CACHE_TTL = 30 * 1000; // 30 seconds
interface MembersCache {
  data: Member[];
  timestamp: number;
  zoneId: string;
  filterZone: string;
}
const membersCache = new Map<string, MembersCache>();

function getCacheKey(zoneId: string, filterZone: string): string {
  return `${zoneId}_${filterZone}`;
}

export interface Member {
  id: string; // User ID
  membershipId?: string; // Membership record ID
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  phone?: string;
  gender?: string;
  birthday?: string;
  region?: string;
  church?: string;
  designation?: string;
  voicePart?: string;
  administration?: string;
  profile_image_url?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  groups?: string[];
  role?: string;
  zoneId?: string;
  zoneName?: string;
  // Feature access toggles
  can_access_pre_rehearsal?: boolean;
  has_hq_access?: boolean;
  canAnnotate?: boolean;
  canSeeArchive?: boolean;
  canAccessOngoingRehearsals?: boolean;
  canAccessAudioLab?: boolean;
  canAccessMedia?: boolean;
  canSubmitSong?: boolean;
  canAccessGroups?: boolean;
  isPlaceholder?: boolean;
}

/**
 * Normalizes member records from any backend route (/members/zone, /members/hq, /profiles/directory, /members)
 */
function shapeMemberRecord(m: any, defaultZoneId?: string, defaultZoneName?: string): Member {
  const userObj = m.user || m.profile || {};
  const rawRoleStr = (m.rawRole || m.role || userObj.role || 'member').toLowerCase();
  const isAdmin = Boolean(
    m.isAdmin ||
    rawRoleStr.includes('admin') ||
    rawRoleStr.includes('coord') ||
    rawRoleStr === 'org_admin' ||
    rawRoleStr === 'group_admin'
  );
  const role = isAdmin ? 'coordinator' : 'member';

  const rawFirstName =
    m.firstName ||
    m.first_name ||
    userObj.firstName ||
    userObj.first_name ||
    (m.displayName ? m.displayName.split(' ')[0] : '') ||
    (m.userName ? m.userName.split(' ')[0] : '') ||
    (m.name ? m.name.split(' ')[0] : '') ||
    (userObj.name ? userObj.name.split(' ')[0] : '');

  const rawLastName =
    m.lastName ||
    m.last_name ||
    userObj.lastName ||
    userObj.last_name ||
    (m.displayName ? m.displayName.split(' ').slice(1).join(' ') : '') ||
    (m.userName ? m.userName.split(' ').slice(1).join(' ') : '') ||
    (m.name ? m.name.split(' ').slice(1).join(' ') : '') ||
    (userObj.name ? userObj.name.split(' ').slice(1).join(' ') : '');

  const rawEmail =
    m.email ||
    m.userEmail ||
    userObj.email ||
    userObj.userEmail ||
    '';

  const isPlaceholderEmail = rawEmail.includes('placeholder.rehearsalhub.com');
  const email = isPlaceholderEmail ? '' : rawEmail;

  let first_name = (rawFirstName || '').trim();
  let last_name = (rawLastName || '').trim();

  // Handle fallback names cleanly
  if (!first_name && !last_name) {
    if (email) {
      const handle = email.split('@')[0];
      const cleaned = handle.replace(/[._-]+/g, ' ').replace(/\d+$/, '').trim();
      first_name = cleaned
        ? cleaned.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
        : handle;
    } else {
      const shortId = (m.userId || userObj.id || m.id || '').slice(-4).toUpperCase();
      first_name = 'Singer';
      last_name = `(${shortId})`;
    }
  }

  const id = m.userId || userObj.id || m.id;
  const membershipId = m.membershipId || m.id;
  const phone = m.phone || m.phone_number || userObj.phone || userObj.phone_number || '';
  const church = m.church || m.churchName || m.group?.name || userObj.group?.name || userObj.church || '';
  const designation = (m.voicePart || m.designation || userObj.voicePart || userObj.designation || '').trim();
  const zoneId = m.organizationId || m.zoneId || defaultZoneId || '';
  const zoneName = m.organization?.name || m.zoneName || defaultZoneName || '';
  const isActive = m.status !== 'INACTIVE' && m.status !== 'inactive' && m.is_active !== false && m.isActive !== false;

  const isPlaceholder = isPlaceholderEmail || (first_name.toLowerCase() === 'singer' && !email && !phone);

  return {
    id,
    membershipId,
    first_name,
    last_name,
    middle_name: (m.middle_name || userObj.middle_name || '').trim(),
    email,
    phone,
    gender: m.gender || userObj.gender || '',
    birthday: m.birthday || userObj.birthday || '',
    region: m.region || userObj.region || '',
    church,
    designation,
    voicePart: designation,
    administration: (m.administration || userObj.administration || '').trim(),
    profile_image_url: m.profile_image_url || m.avatarUrl || userObj.avatarUrl || userObj.profile_image_url || '',
    created_at: m.joinedAt || m.createdAt || m.created_at || userObj.created_at || new Date().toISOString(),
    updated_at: m.updatedAt || m.updated_at || userObj.updated_at || new Date().toISOString(),
    is_active: isActive,
    groups: m.groups || userObj.groups || [],
    role,
    zoneId,
    zoneName,
    isPlaceholder,
    // Access passes
    can_access_pre_rehearsal: Boolean(m.can_access_pre_rehearsal ?? m.canAccessPreRehearsal ?? userObj.can_access_pre_rehearsal ?? userObj.canAccessPreRehearsal),
    has_hq_access: Boolean(m.has_hq_access ?? m.hasHqAccess ?? userObj.has_hq_access ?? userObj.hasHqAccess),
    canAnnotate: Boolean(m.canAnnotate ?? m.can_annotate ?? userObj.canAnnotate ?? userObj.can_annotate),
    canSeeArchive: Boolean(m.canSeeArchive ?? m.canAccessArchive ?? m.can_access_archive ?? userObj.canSeeArchive ?? userObj.canAccessArchive),
    canAccessOngoingRehearsals: m.can_access_ongoing !== false && m.canAccessOngoing !== false && userObj.can_access_ongoing !== false && userObj.canAccessOngoing !== false,
    canAccessAudioLab: Boolean(m.canAccessAudioLab ?? userObj.canAccessAudioLab),
    canAccessMedia: Boolean(m.canAccessMedia ?? userObj.canAccessMedia),
    canSubmitSong: Boolean(m.canSubmitSong ?? userObj.canSubmitSong ?? true),
    canAccessGroups: Boolean(m.canAccessGroups ?? userObj.canAccessGroups ?? true),
  };
}

export default function Members() {
  const { currentZone } = useZone();
  const { theme } = useAdminTheme();
  const { profile: currentProfile } = useAuth();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZone, setFilterZone] = useState<string>('all'); // 'all' or zoneId
  const [voiceFilter, setVoiceFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // View Mode: 'directory' vs 'access_passes' (matching the admin mobile app)
  const [viewMode, setViewMode] = useState<'directory' | 'access_passes'>('directory');

  // Quick Grant by Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [grantEmailLoading, setGrantEmailLoading] = useState(false);

  // HQ Zone Dropdown state
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const zoneDropdownRef = useRef<HTMLDivElement>(null);

  const isUserHQ = isHQGroup(currentZone?.id) || isHQAdmin(currentProfile);

  // Close zone dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(event.target as Node)) {
        setZoneDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toast
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-2xl shadow-2xl z-[200] text-sm font-bold transition-all backdrop-blur-md flex items-center gap-2 ${
      type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-500/20' :
      type === 'error' ? 'bg-rose-600 text-white shadow-rose-500/20' :
      type === 'warning' ? 'bg-amber-600 text-white shadow-amber-500/20' :
      'bg-slate-900 text-white shadow-slate-900/30'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const copyToClipboard = (text: string, label: string, keyId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    showToast(`Copied ${label}`, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Main Data Loading: Retrieves all members in the selected zone or all zones
  const loadMembers = useCallback(async (forceRefresh = false) => {
    if (!currentZone) return;

    const cacheKey = getCacheKey(currentZone.id, filterZone);

    if (forceRefresh) {
      membersCache.delete(cacheKey);
    } else {
      const cached = membersCache.get(cacheKey);
      if (cached && cached.data.length > 0) {
        setMembers(cached.data);
      }
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return;
      }
      if (!cached || cached.data.length === 0) {
        setLoading(true);
      }
    }

    try {
      const targetZoneId = filterZone === 'all' ? (isUserHQ ? 'all' : currentZone.id) : filterZone;
      const isTargetHQ = isHQGroup(targetZoneId);
      const targetZoneObj = ZONES.find(z => z.id === targetZoneId);
      const zoneName = targetZoneObj?.name || (targetZoneId === 'all' ? 'All Zones' : currentZone.name);

      let rawList: any[] = [];

      // ── Scenario A: HQ Admin viewing All Zones ──────────────────────────
      if (targetZoneId === 'all') {
        // 1. Fetch live user directory (has all registered singers with real names & profiles)
        const dirRes: any = await BackendAPI.profiles.directory({ limit: 1000 }).catch(() => null);
        const dirData = Array.isArray(dirRes?.data) ? dirRes.data : (Array.isArray(dirRes) ? dirRes : []);
        rawList.push(...dirData);

        // 2. Fetch global members
        try {
          const globalRes: any = await BackendAPI.members.getAll({ scope: 'global', limit: 1000 });
          const globalData = Array.isArray(globalRes?.data) ? globalRes.data : (Array.isArray(globalRes) ? globalRes : []);
          rawList.push(...globalData);
        } catch {
          // If global scope restricted, fallback
          const allRes: any = await BackendAPI.members.getAll({ limit: 500 }).catch(() => null);
          const allData = Array.isArray(allRes?.data) ? allRes.data : (Array.isArray(allRes) ? allRes : []);
          rawList.push(...allData);
        }

        // 3. Include HQ members
        const hqRes: any = await BackendAPI.members.hq({ page: 1, limit: 100 }).catch(() => null);
        const hqData = Array.isArray(hqRes?.data) ? hqRes.data : (Array.isArray(hqRes) ? hqRes : []);
        rawList.push(...hqData);
      } else {
        // ── Scenario B: Specific Zone (or Zonal Admin's current zone) ──────
        // 1. Fetch directory by zone ID and invitationCode
        const dirParams: any = { zoneId: targetZoneId, zone_code: targetZoneId, limit: 1000 };
        const dirRes: any = await BackendAPI.profiles.directory(dirParams).catch(() => null);
        const dirData = Array.isArray(dirRes?.data) ? dirRes.data : (Array.isArray(dirRes) ? dirRes : []);
        rawList.push(...dirData);

        // If zone has an invitation code (e.g. ZONE001, ZONELAG1), also query by code
        if (targetZoneObj?.invitationCode && targetZoneObj.invitationCode !== targetZoneId) {
          const codeRes: any = await BackendAPI.profiles.directory({ zone_code: targetZoneObj.invitationCode, limit: 500 }).catch(() => null);
          const codeData = Array.isArray(codeRes?.data) ? codeRes.data : (Array.isArray(codeRes) ? codeRes : []);
          rawList.push(...codeData);
        }

        // 2. Fetch zone members from /members/zone/:zoneId
        let zoneData: any[] = [];
        for (let p = 1; p <= 5; p++) {
          try {
            const zRes: any = await BackendAPI.members.byZone(targetZoneId, { page: p, limit: 100 });
            const pageItems = Array.isArray(zRes?.data) ? zRes.data : (Array.isArray(zRes) ? zRes : []);
            zoneData.push(...pageItems);
            if (!zRes?.hasMore || pageItems.length < 100) break;
          } catch {
            break;
          }
        }
        rawList.push(...zoneData);

        // 3. Fallback: /members?zoneId=...
        const qRes: any = await BackendAPI.members.getAll({ zoneId: targetZoneId, limit: 500 }).catch(() => null);
        const qData = Array.isArray(qRes?.data) ? qRes.data : (Array.isArray(qRes) ? qRes : []);
        rawList.push(...qData);

        // If target zone is an HQ group, also fetch /members/hq
        if (isTargetHQ) {
          const hqRes: any = await BackendAPI.members.hq({ page: 1, limit: 100 }).catch(() => null);
          const hqData = Array.isArray(hqRes?.data) ? hqRes.data : (Array.isArray(hqRes) ? hqRes : []);
          rawList.push(...hqData);
        }
      }

      // 4. Normalize and Deduplicate
      const seenIds = new Set<string>();
      const realMembers: Member[] = [];
      const placeholderMembers: Member[] = [];

      for (const raw of rawList) {
        const shaped = shapeMemberRecord(raw, targetZoneId, zoneName);
        if (shaped.id && !seenIds.has(shaped.id)) {
          seenIds.add(shaped.id);
          if (shaped.isPlaceholder) {
            placeholderMembers.push(shaped);
          } else {
            realMembers.push(shaped);
          }
        }
      }

      // Real registered singers appear first; placeholders append at end
      const finalMembers = [...realMembers, ...placeholderMembers];
      setMembers(finalMembers);

      // Cache
      membersCache.set(cacheKey, {
        data: finalMembers,
        timestamp: Date.now(),
        zoneId: currentZone.id,
        filterZone
      });
    } catch (error) {
      console.error('Error loading members:', error);
      showToast('Could not load member directory. Please refresh.', 'warning');
    } finally {
      setLoading(false);
    }
  }, [currentZone, filterZone, isUserHQ]);

  useEffect(() => {
    if (currentZone) {
      loadMembers();
      setDisplayLimit(50);
    }
  }, [currentZone, filterZone, loadMembers]);

  // Statistics
  const memberStats = useMemo(() => {
    let active = 0;
    let coordinators = 0;
    let today = 0;
    const now = new Date();

    for (const m of members) {
      if (m.is_active) active++;
      if (m.role === 'coordinator') coordinators++;
      try {
        const d = new Date(m.created_at);
        if (d.toDateString() === now.toDateString()) today++;
      } catch {}
    }

    return {
      total: members.length,
      active,
      coordinators,
      today
    };
  }, [members]);

  // Search & Voice Filters
  const filteredMembers = useMemo(() => {
    let list = members;

    // Voice filter chip
    if (voiceFilter !== 'all') {
      const vf = voiceFilter.toLowerCase();
      if (vf === 'active') {
        list = list.filter(m => m.is_active);
      } else if (vf === 'coordinator') {
        list = list.filter(m => m.role === 'coordinator');
      } else {
        list = list.filter(m => (m.designation || m.voicePart || '').toLowerCase().includes(vf));
      }
    }

    // Search query
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(m => {
        const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
        return (
          fullName.includes(term) ||
          m.email?.toLowerCase().includes(term) ||
          m.phone?.toLowerCase().includes(term) ||
          m.church?.toLowerCase().includes(term) ||
          m.designation?.toLowerCase().includes(term) ||
          m.administration?.toLowerCase().includes(term) ||
          m.zoneName?.toLowerCase().includes(term)
        );
      });
    }

    return list;
  }, [members, voiceFilter, searchTerm]);

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Export CSV
  const exportMembers = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Voice Part / Designation', 'Church', 'Zone', 'Role', 'Status', 'Joined Date'],
      ...filteredMembers.map(member => [
        `"${member.first_name} ${member.last_name}"`,
        `"${member.email}"`,
        `"${member.phone || ''}"`,
        `"${member.designation || ''}"`,
        `"${member.church || ''}"`,
        `"${member.zoneName || ''}"`,
        `"${member.role || 'member'}"`,
        `"${member.is_active ? 'Active' : 'Inactive'}"`,
        `"${formatDate(member.created_at)}"`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members-${filterZone === 'all' ? 'all-zones' : (currentZone?.name || 'zone')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Members exported to CSV', 'success');
  };

  // Remove from zone handler
  const handleRemoveFromZone = async (member: Member) => {
    const zoneId = member.zoneId || currentZone?.id;
    const zoneName = member.zoneName || currentZone?.name || 'this zone';

    if (!confirm(`Remove ${member.first_name} ${member.last_name} from ${zoneName}?\n\nThis will remove their membership from this zone. Their account and profile will remain intact.`)) {
      return;
    }

    try {
      setLoading(true);
      await BackendAPI.profiles.removeFromZone(member.id, { zoneId });
      showToast(`${member.first_name} removed from ${zoneName}`, 'success');

      if (currentZone) {
        membersCache.delete(getCacheKey(currentZone.id, filterZone));
      }
      setSelectedMember(null);
      loadMembers(true);
    } catch (error: any) {
      console.error('Error removing member from zone:', error);
      showToast(error?.message || 'Failed to remove member from zone', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete account handler
  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`Are you sure you want to permanently delete ${member.first_name} ${member.last_name}?\n\nThis will remove their account and all associations permanently.`)) {
      return;
    }

    try {
      setLoading(true);
      await BackendAPI.profiles.delete(member.id);
      showToast(`${member.first_name} ${member.last_name} deleted`, 'success');

      if (currentZone) {
        membersCache.delete(getCacheKey(currentZone.id, filterZone));
      }
      setSelectedMember(null);
      loadMembers(true);
    } catch (error: any) {
      console.error('Error deleting member:', error);
      showToast(error?.message || 'Failed to delete member', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Quick toggle active status
  const handleToggleStatus = async (member: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = !member.is_active;
    try {
      await BackendAPI.profiles.update(member.id, {
        is_active: nextStatus,
        status: nextStatus ? 'ACTIVE' : 'INACTIVE',
      });
      const updated = { ...member, is_active: nextStatus };
      setMembers(prev => prev.map(m => m.id === member.id ? updated : m));
      showToast(`${member.first_name} marked as ${nextStatus ? 'Active' : 'Inactive'}`, 'success');
    } catch {
      showToast('Failed to toggle status', 'error');
    }
  };

  // Quick toggle access passes directly from table or cards
  const handleToggleMemberPass = async (
    member: Member,
    field: 'canSeeArchive' | 'can_access_pre_rehearsal' | 'canAnnotate' | 'canAccessOngoingRehearsals' | 'has_hq_access',
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();

    const currentValue = field === 'canAccessOngoingRehearsals'
      ? (member.canAccessOngoingRehearsals !== false)
      : Boolean(member[field]);
    const nextValue = !currentValue;

    const payload: Record<string, any> = {
      [field]: nextValue,
    };

    if (field === 'canSeeArchive') {
      payload.can_access_archive = nextValue;
      payload.canAccessArchive = nextValue;
      payload.canSeeArchive = nextValue;
    } else if (field === 'can_access_pre_rehearsal') {
      payload.can_access_pre_rehearsal = nextValue;
      payload.canAccessPreRehearsal = nextValue;
    } else if (field === 'canAnnotate') {
      payload.canAnnotate = nextValue;
      payload.can_annotate = nextValue;
    } else if (field === 'canAccessOngoingRehearsals') {
      payload.can_access_ongoing = nextValue;
      payload.canAccessOngoing = nextValue;
      payload.canAccessOngoingRehearsals = nextValue;
    } else if (field === 'has_hq_access') {
      payload.has_hq_access = nextValue;
      payload.hasHqAccess = nextValue;
    }

    payload.hiddenFeatures = {
      ...(field === 'canSeeArchive' ? { hideArchives: !nextValue } : {}),
      ...(field === 'can_access_pre_rehearsal' ? { hidePreRehearsal: !nextValue } : {}),
      ...(field === 'canAnnotate' ? { hideAnnotations: !nextValue } : {}),
      ...(field === 'canAccessOngoingRehearsals' ? { hideOngoing: !nextValue } : {}),
    };

    // Optimistic update
    const updated: Member = {
      ...member,
      [field]: nextValue,
      ...(field === 'canSeeArchive' ? { canSeeArchive: nextValue } : {}),
      ...(field === 'can_access_pre_rehearsal' ? { can_access_pre_rehearsal: nextValue } : {}),
      ...(field === 'canAnnotate' ? { canAnnotate: nextValue } : {}),
      ...(field === 'canAccessOngoingRehearsals' ? { canAccessOngoingRehearsals: nextValue } : {}),
      ...(field === 'has_hq_access' ? { has_hq_access: nextValue } : {}),
    };

    setMembers(prev => prev.map(m => m.id === member.id ? updated : m));
    if (selectedMember?.id === member.id) {
      setSelectedMember(updated);
    }

    try {
      await BackendAPI.profiles.update(member.id, payload);
      const passName = {
        canSeeArchive: 'Archive Access',
        can_access_pre_rehearsal: 'Pre-Rehearsal Access',
        canAnnotate: 'Live Annotation',
        canAccessOngoingRehearsals: 'Ongoing Rehearsals Room',
        has_hq_access: 'Global HQ Access',
      }[field];
      showToast(`${passName} ${nextValue ? 'granted' : 'revoked'} for ${member.first_name}`, 'success');
    } catch (err: any) {
      // Revert on error
      setMembers(prev => prev.map(m => m.id === member.id ? member : m));
      if (selectedMember?.id === member.id) {
        setSelectedMember(member);
      }
      showToast(err?.message || 'Failed to update access pass', 'error');
    }
  };

  // Quick grant full passes by entering singer email (like admin app)
  const handleGrantEmailPass = async () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) {
      showToast('Please enter a valid singer email address', 'warning');
      return;
    }

    setGrantEmailLoading(true);
    try {
      const res: any = await BackendAPI.profiles.directory({ search: trimmed, limit: 10 }).catch(() => null);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const matched = list.find((u: any) => (u.email || '').toLowerCase() === trimmed) || list[0];

      if (!matched?.id && !matched?.userId) {
        showToast(`No registered account found with email "${trimmed}"`, 'error');
        return;
      }

      const targetId = matched.id || matched.userId;
      const payload = {
        can_access_archive: true,
        canSeeArchive: true,
        canAccessArchive: true,
        can_access_ongoing: true,
        canAccessOngoing: true,
        can_access_pre_rehearsal: true,
        canAccessPreRehearsal: true,
        canAnnotate: true,
        can_annotate: true,
        hiddenFeatures: {
          hideArchives: false,
          hideOngoing: false,
          hidePreRehearsal: false,
          hideAnnotations: false,
        },
      };

      await BackendAPI.profiles.update(targetId, payload);
      showToast(`Full access passes granted to ${matched.firstName || matched.first_name || trimmed}`, 'success');
      setEmailModalOpen(false);
      setEmailInput('');
      loadMembers(true);
    } catch (err: any) {
      showToast(err?.message || 'Could not grant pass to this email', 'error');
    } finally {
      setGrantEmailLoading(false);
    }
  };

  // Filter zones list for HQ zone dropdown search
  const filteredZonesForDropdown = useMemo(() => {
    const q = zoneSearchQuery.toLowerCase().trim();
    if (!q) return ZONES.filter(z => z.id !== 'zone-boss');
    return ZONES.filter(z =>
      z.id !== 'zone-boss' &&
      (z.name.toLowerCase().includes(q) || z.invitationCode.toLowerCase().includes(q) || z.region.toLowerCase().includes(q))
    );
  }, [zoneSearchQuery]);

  const currentZoneDisplayName = useMemo(() => {
    if (filterZone === 'all') return 'All Zones (Global Personnel)';
    const found = ZONES.find(z => z.id === filterZone);
    return found ? found.name : (currentZone?.name || 'Selected Zone');
  }, [filterZone, currentZone]);

  return (
    <div className="flex-1 flex flex-col min-h-full bg-white lg:bg-slate-50">
      {/* ─── Top Header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 lg:px-8 py-5 lg:py-7 flex-shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-outfit">
              Members Directory
            </h1>
            <p className="text-xs lg:text-sm text-slate-400 mt-1 font-medium">
              Manage personnel, choir designations, voice parts, and access passes for{' '}
              <span className="font-bold text-slate-700">{currentZoneDisplayName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* View Mode Segmented Switch (matching admin app) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('directory')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'directory'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Directory</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('access_passes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'access_passes'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Access Passes</span>
              </button>
            </div>

            {viewMode === 'access_passes' && (
              <button
                type="button"
                onClick={() => setEmailModalOpen(true)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grant by Email</span>
              </button>
            )}

            <button
              onClick={() => loadMembers(true)}
              disabled={loading}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all active:scale-95 border border-slate-100 shadow-sm"
              title="Refresh List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
            </button>
            <button
              onClick={exportMembers}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs lg:text-sm transition-all flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Members"
            value={memberStats.total}
            icon={<Users className="w-4 h-4" />}
            color="purple"
          />
          <StatCard
            label="Active Now"
            value={memberStats.active}
            icon={<Zap className="w-4 h-4" />}
            color="green"
            pulse
          />
          <StatCard
            label="Coordinators"
            value={memberStats.coordinators}
            icon={<ShieldCheck className="w-4 h-4" />}
            color="blue"
          />
          <StatCard
            label="Joined Today"
            value={memberStats.today}
            icon={<TrendingUp className="w-4 h-4" />}
            color="orange"
          />
        </div>
      </div>

      {/* ─── Filter & Control Bar ────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 lg:px-8 py-4 flex-shrink-0 space-y-3">
        {/* Search Bar + HQ Zone Selector Combobox */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, designation, church, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* HQ Zone Dropdown (Searchable Combobox) */}
          {isUserHQ && (
            <div className="relative" ref={zoneDropdownRef}>
              <button
                type="button"
                onClick={() => setZoneDropdownOpen(!zoneDropdownOpen)}
                className="w-full sm:w-auto px-4 py-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-xl text-xs font-bold text-purple-900 flex items-center justify-between sm:justify-start gap-2 shadow-sm transition-all"
              >
                <Globe className="w-4 h-4 text-purple-600" />
                <span className="truncate max-w-[200px]">{currentZoneDisplayName}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-purple-600 transition-transform ${zoneDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {zoneDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] p-2 overflow-hidden animate-in fade-in duration-150">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search zone by name or code..."
                        value={zoneSearchQuery}
                        onChange={(e) => setZoneSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-purple-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto p-1 space-y-0.5">
                    {/* All Zones Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setFilterZone('all');
                        setZoneDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors ${
                        filterZone === 'all'
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-700 hover:bg-purple-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5" />
                        All Zones (Global Personnel)
                      </span>
                      {filterZone === 'all' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Headquarters & Regional Zones
                    </div>

                    {filteredZonesForDropdown.map((z) => {
                      const isSelected = filterZone === z.id;
                      return (
                        <button
                          key={z.id}
                          type="button"
                          onClick={() => {
                            setFilterZone(z.id);
                            setZoneDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : 'text-slate-700 hover:bg-purple-50'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate">{z.name}</p>
                            <p className={`text-[10px] font-medium ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                              {z.region} • {z.invitationCode}
                            </p>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Voice Part Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pt-1 pb-0.5">
          {[
            { id: 'all', label: `All (${members.length})` },
            { id: 'soprano', label: 'Soprano' },
            { id: 'alto', label: 'Alto' },
            { id: 'tenor', label: 'Tenor' },
            { id: 'bass', label: 'Bass' },
            { id: 'coordinator', label: 'Coordinators' },
            { id: 'active', label: 'Active Now' },
          ].map((chip) => {
            const isSelected = voiceFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setVoiceFilter(chip.id)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Members List Content ────────────────────────────────────────── */}
      <div className="flex-1 bg-slate-50/50 overflow-y-auto">
        {loading && members.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <CustomLoader message="Loading zone members..." />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex items-center justify-center p-16">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100 shadow-sm">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No Members Found</h3>
              <p className="text-xs text-slate-400 font-medium">
                {searchTerm || voiceFilter !== 'all'
                  ? 'No members match your search or filter parameters.'
                  : `No registered members found in ${currentZoneDisplayName}.`}
              </p>
              {(searchTerm || voiceFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setVoiceFilter('all');
                  }}
                  className="mt-4 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition-all"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="pb-24">
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white border-b border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Member</th>
                    <th className="px-6 py-4">Zone / Church</th>
                    {viewMode === 'directory' ? (
                      <>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Voice Part</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-4 text-center">Archive Pass</th>
                        <th className="px-4 py-4 text-center">Ongoing Pass</th>
                        <th className="px-4 py-4 text-center">Pre-Rehearsal</th>
                        <th className="px-4 py-4 text-center">Live Annotations</th>
                        {isHQAdmin(currentProfile) && (
                          <th className="px-4 py-4 text-center">Global HQ</th>
                        )}
                        <th className="px-4 py-4 text-right">Profile</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredMembers.slice(0, displayLimit).map((member) => (
                    <tr
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className="group hover:bg-purple-50/30 transition-all cursor-pointer"
                    >
                      {/* Member Identity */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            {member.profile_image_url ? (
                              <img
                                className="h-10 w-10 rounded-xl object-cover ring-2 ring-white border border-slate-200"
                                src={member.profile_image_url}
                                alt=""
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white">
                                {member.first_name?.[0] || 'S'}{member.last_name?.[0] || ''}
                              </div>
                            )}
                            {member.is_active && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors flex items-center gap-1.5">
                              {member.first_name} {member.last_name}
                              {member.role === 'coordinator' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                  COORD
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                              {member.email || (member.id ? `ID: ${member.id.substring(0, 8)}...` : 'Singer')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Zone / Church */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700">
                            {member.zoneName || 'Zonal Member'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[180px]">
                            {member.church || 'Unassigned Church'}
                          </span>
                        </div>
                      </td>

                      {viewMode === 'directory' ? (
                        <>
                          {/* Contact */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1 text-xs">
                              {member.email ? (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(member.email, 'Email', `email_${member.id}`);
                                  }}
                                  className="flex items-center gap-1.5 text-slate-600 hover:text-purple-600 transition-colors"
                                  title="Click to copy email"
                                >
                                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{member.email}</span>
                                  {copiedKey === `email_${member.id}` && <Check className="w-3 h-3 text-emerald-600" />}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">No email</span>
                              )}

                              {member.phone && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(member.phone || '', 'Phone', `phone_${member.id}`);
                                  }}
                                  className="flex items-center gap-1.5 text-slate-600 hover:text-purple-600 transition-colors"
                                  title="Click to copy phone"
                                >
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{member.phone}</span>
                                  {copiedKey === `phone_${member.id}` && <Check className="w-3 h-3 text-emerald-600" />}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Voice Part */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {member.designation || member.voicePart || 'Singer'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => handleToggleStatus(member, e)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                                member.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              }`}
                              title="Click to toggle status"
                            >
                              {member.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                              {member.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setSelectedMember(member)}
                                className="p-2 hover:bg-purple-50 text-slate-400 hover:text-purple-600 rounded-xl transition-all"
                                title="Edit Profile"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveFromZone(member)}
                                className="p-2 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-xl transition-all"
                                title="Remove from Zone"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMember(member)}
                                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                                title="Delete Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* 4 Feature Passes - Direct 1-Click Toggles */}
                          {/* Archive Pass */}
                          <td className="px-4 py-4 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleMemberPass(member, 'canSeeArchive', e)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                member.canSeeArchive
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                              title="Click to toggle Archive Visibility"
                            >
                              <span className={`w-2 h-2 rounded-full ${member.canSeeArchive ? 'bg-purple-600' : 'bg-slate-300'}`} />
                              {member.canSeeArchive ? 'Active' : 'Off'}
                            </button>
                          </td>

                          {/* Ongoing Pass */}
                          <td className="px-4 py-4 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleMemberPass(member, 'canAccessOngoingRehearsals', e)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                member.canAccessOngoingRehearsals !== false
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                              title="Click to toggle Ongoing Rehearsals Room"
                            >
                              <span className={`w-2 h-2 rounded-full ${member.canAccessOngoingRehearsals !== false ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                              {member.canAccessOngoingRehearsals !== false ? 'Active' : 'Off'}
                            </button>
                          </td>

                          {/* Pre-Rehearsal Pass */}
                          <td className="px-4 py-4 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleMemberPass(member, 'can_access_pre_rehearsal', e)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                member.can_access_pre_rehearsal
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                              title="Click to toggle Pre-Rehearsal Access"
                            >
                              <span className={`w-2 h-2 rounded-full ${member.can_access_pre_rehearsal ? 'bg-amber-600' : 'bg-slate-300'}`} />
                              {member.can_access_pre_rehearsal ? 'Active' : 'Off'}
                            </button>
                          </td>

                          {/* Live Annotations Pass */}
                          <td className="px-4 py-4 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleMemberPass(member, 'canAnnotate', e)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                member.canAnnotate
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                              title="Click to toggle Live Annotation Telestrator"
                            >
                              <span className={`w-2 h-2 rounded-full ${member.canAnnotate ? 'bg-blue-600' : 'bg-slate-300'}`} />
                              {member.canAnnotate ? 'Active' : 'Off'}
                            </button>
                          </td>

                          {/* Global HQ Access */}
                          {isHQAdmin(currentProfile) && (
                            <td className="px-4 py-4 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => handleToggleMemberPass(member, 'has_hq_access', e)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                  member.has_hq_access
                                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                                title="Click to toggle Global HQ Access"
                              >
                                <span className={`w-2 h-2 rounded-full ${member.has_hq_access ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                                {member.has_hq_access ? 'Active' : 'Off'}
                              </button>
                            </td>
                          )}

                          {/* Profile Drawer */}
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => setSelectedMember(member)}
                              className="px-3 py-1.5 text-xs font-bold text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                            >
                              Profile →
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Load More Button - Desktop */}
              {filteredMembers.length > displayLimit && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    className="px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm transition-all inline-flex items-center gap-2"
                  >
                    <Users className="w-4 h-4 text-purple-600" />
                    Load More Members ({filteredMembers.length - displayLimit} remaining)
                  </button>
                </div>
              )}
            </div>

            {/* Mobile View */}
            <div className="lg:hidden divide-y divide-slate-100 bg-white">
              {filteredMembers.slice(0, displayLimit).map((member) => (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {member.profile_image_url ? (
                        <img
                          className="h-11 w-11 rounded-full object-cover border border-slate-200"
                          src={member.profile_image_url}
                          alt=""
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                      )}
                      {member.is_active && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm truncate">
                            {member.first_name} {member.last_name}
                          </h3>
                          {member.role === 'coordinator' && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                              COORD
                            </span>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {member.designation || member.email || 'Singer'}
                      </p>
                      <p className="text-[11px] text-purple-600 font-medium truncate mt-0.5">
                        {member.church || member.zoneName}
                      </p>
                    </div>
                  </div>

                  {/* If in Access Passes mode: direct 4-toggle buttons row like MemberFeaturePassItem */}
                  {viewMode === 'access_passes' && (
                    <div
                      className="grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Archive */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleMemberPass(member, 'canSeeArchive', e)}
                        className={`py-1.5 px-1 rounded-xl text-[10px] font-bold text-center transition-all ${
                          member.canSeeArchive
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        Archive
                        <span className="block text-[8px] opacity-75">{member.canSeeArchive ? 'ON' : 'OFF'}</span>
                      </button>

                      {/* Ongoing */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleMemberPass(member, 'canAccessOngoingRehearsals', e)}
                        className={`py-1.5 px-1 rounded-xl text-[10px] font-bold text-center transition-all ${
                          member.canAccessOngoingRehearsals !== false
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        Ongoing
                        <span className="block text-[8px] opacity-75">{member.canAccessOngoingRehearsals !== false ? 'ON' : 'OFF'}</span>
                      </button>

                      {/* Pre-Reh */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleMemberPass(member, 'can_access_pre_rehearsal', e)}
                        className={`py-1.5 px-1 rounded-xl text-[10px] font-bold text-center transition-all ${
                          member.can_access_pre_rehearsal
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        Pre-Reh
                        <span className="block text-[8px] opacity-75">{member.can_access_pre_rehearsal ? 'ON' : 'OFF'}</span>
                      </button>

                      {/* Annotate */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleMemberPass(member, 'canAnnotate', e)}
                        className={`py-1.5 px-1 rounded-xl text-[10px] font-bold text-center transition-all ${
                          member.canAnnotate
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        Annotate
                        <span className="block text-[8px] opacity-75">{member.canAnnotate ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filteredMembers.length > displayLimit && (
                <div className="p-3 text-center">
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200"
                  >
                    Load More ({filteredMembers.length - displayLimit} remaining)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Profile Slide-out Drawer Modal ──────────────────────────────── */}
      {selectedMember && (
        <MemberProfileModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onMemberUpdate={(updated) => {
            setSelectedMember(updated);
            setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
            if (currentZone) {
              const cacheKey = getCacheKey(currentZone.id, filterZone);
              const cached = membersCache.get(cacheKey);
              if (cached) {
                const updatedData = cached.data.map(m => m.id === updated.id ? updated : m);
                membersCache.set(cacheKey, { ...cached, data: updatedData });
              }
            }
          }}
          onDeleteMember={handleDeleteMember}
          onRemoveFromZone={handleRemoveFromZone}
          showToast={showToast}
        />
      )}

      {/* ─── Add Email Pass Modal ────────────────────────────────────────── */}
      {emailModalOpen && (
        <AddEmailPassModal
          onClose={() => {
            setEmailModalOpen(false);
            setEmailInput('');
          }}
          email={emailInput}
          onChangeEmail={setEmailInput}
          onSubmit={handleGrantEmailPass}
          loading={grantEmailLoading}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card Component
// ─────────────────────────────────────────────────────────────────────────────
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
    <div className={`bg-white rounded-2xl p-4 border border-slate-100 shadow-sm transition-all hover:shadow-md border-l-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-md ${iconColors[color]}`}>
          {icon}
        </div>
        {pulse && (
          <div className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
        )}
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value.toLocaleString()}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Email Pass Modal (matching admin app AddEmailPassModal)
// ─────────────────────────────────────────────────────────────────────────────
function AddEmailPassModal({
  onClose,
  email,
  onChangeEmail,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  email: string;
  onChangeEmail: (val: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Grant Passes by Email</h3>
              <p className="text-xs text-slate-400">Instantly unlock singer features</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Enter the singer's registered email address to instantly grant them full access to{' '}
            <span className="font-bold text-purple-700">Archive</span>,{' '}
            <span className="font-bold text-emerald-700">Ongoing Rehearsals</span>,{' '}
            <span className="font-bold text-amber-700">Pre-Rehearsal</span>, and{' '}
            <span className="font-bold text-blue-700">Annotation</span>.
          </p>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Singer Account Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => onChangeEmail(e.target.value)}
              placeholder="singer@loveworldsingers.org"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || !email.trim()}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Grant Passes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Member Profile Drawer Modal
// ─────────────────────────────────────────────────────────────────────────────
function MemberProfileModal({
  member,
  onClose,
  onMemberUpdate,
  onDeleteMember,
  onRemoveFromZone,
  showToast
}: {
  member: Member;
  onClose: () => void;
  onMemberUpdate: (updatedMember: Member) => void;
  onDeleteMember: (member: Member) => void;
  onRemoveFromZone: (member: Member) => Promise<void>;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const { user: currentUser, profile: currentProfile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'access'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    first_name: member.first_name || '',
    last_name: member.last_name || '',
    phone: member.phone || '',
    church: member.church || '',
    designation: member.designation || member.voicePart || '',
    role: member.role || 'member',
  });

  useEffect(() => {
    setEditForm({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      phone: member.phone || '',
      church: member.church || '',
      designation: member.designation || member.voicePart || '',
      role: member.role || 'member',
    });
  }, [member]);

  // Save changes
  const handleSave = async () => {
    setLoading(true);
    try {
      const trimmedFirst = editForm.first_name.trim();
      const trimmedLast = editForm.last_name.trim();
      const trimmedPhone = editForm.phone.trim();
      const trimmedDesignation = editForm.designation.trim();
      const trimmedChurch = editForm.church.trim();

      const payload = {
        firstName: trimmedFirst,
        first_name: trimmedFirst,
        lastName: trimmedLast,
        last_name: trimmedLast,
        phone: trimmedPhone,
        phone_number: trimmedPhone,
        church: trimmedChurch,
        designation: trimmedDesignation,
        voicePart: trimmedDesignation,
        voice_part: trimmedDesignation,
        role: editForm.role,
      };

      await BackendAPI.profiles.update(member.id, payload);

      const updatedMember: Member = {
        ...member,
        first_name: trimmedFirst,
        last_name: trimmedLast,
        phone: trimmedPhone,
        church: trimmedChurch,
        designation: trimmedDesignation,
        voicePart: trimmedDesignation,
        role: editForm.role,
      };

      onMemberUpdate(updatedMember);
      setIsEditing(false);
      showToast('Member profile updated successfully', 'success');

      if (currentUser?.uid === member.id) {
        await refreshProfile();
      }
    } catch (error: any) {
      console.error('Error updating member:', error);
      showToast(error?.message || 'Failed to update member profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle access passes
  const togglePass = async (
    field: keyof Member,
    newValue: boolean,
    label: string
  ) => {
    try {
      const payload: Record<string, any> = {
        [field]: newValue,
      };

      if (field === 'canSeeArchive') {
        payload.can_access_archive = newValue;
        payload.canAccessArchive = newValue;
        payload.canSeeArchive = newValue;
      } else if (field === 'can_access_pre_rehearsal') {
        payload.can_access_pre_rehearsal = newValue;
        payload.canAccessPreRehearsal = newValue;
      } else if (field === 'canAnnotate') {
        payload.can_annotate = newValue;
        payload.canAnnotate = newValue;
      } else if (field === 'canAccessOngoingRehearsals') {
        payload.can_access_ongoing = newValue;
        payload.canAccessOngoing = newValue;
        payload.canAccessOngoingRehearsals = newValue;
      } else if (field === 'has_hq_access') {
        payload.hasHqAccess = newValue;
        payload.has_hq_access = newValue;
      }

      payload.hiddenFeatures = {
        ...(field === 'canSeeArchive' ? { hideArchives: !newValue } : {}),
        ...(field === 'can_access_pre_rehearsal' ? { hidePreRehearsal: !newValue } : {}),
        ...(field === 'canAnnotate' ? { hideAnnotations: !newValue } : {}),
        ...(field === 'canAccessOngoingRehearsals' ? { hideOngoing: !newValue } : {}),
      };

      await BackendAPI.profiles.update(member.id, payload);

      const updated: Member = {
        ...member,
        [field]: newValue,
        ...(field === 'canSeeArchive' ? { canSeeArchive: newValue } : {}),
        ...(field === 'can_access_pre_rehearsal' ? { can_access_pre_rehearsal: newValue } : {}),
        ...(field === 'canAnnotate' ? { canAnnotate: newValue } : {}),
        ...(field === 'canAccessOngoingRehearsals' ? { canAccessOngoingRehearsals: newValue } : {}),
        ...(field === 'has_hq_access' ? { has_hq_access: newValue } : {}),
      };
      onMemberUpdate(updated);
      showToast(`${label} ${newValue ? 'granted' : 'revoked'}`, 'success');
    } catch (err: any) {
      console.error('togglePass error:', err);
      showToast('Failed to update access pass', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-700 shadow-sm border border-transparent hover:border-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-900">Member Profile</h2>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Member Identity Top Card */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-white">
          <div className="relative flex-shrink-0">
            {member.profile_image_url ? (
              <img
                src={member.profile_image_url}
                alt=""
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-purple-100 shadow-md border border-slate-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white text-xl font-black shadow-md">
                {member.first_name?.[0] || 'S'}{member.last_name?.[0] || ''}
              </div>
            )}
            {member.is_active && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-black text-slate-900 truncate">
              {member.first_name} {member.last_name}
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">{member.email || 'No email registered'}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                {member.zoneName || 'Zonal Member'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {member.designation || member.voicePart || 'Singer'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-2 gap-1 bg-slate-50 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'info'
                ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab('access')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'access'
                ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Access Passes
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DETAILS */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm(p => ({ ...p, first_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-900 text-sm">
                    {member.first_name || '---'}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm(p => ({ ...p, last_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-900 text-sm">
                    {member.last_name || '---'}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-900 text-sm">
                    {member.phone || 'No phone recorded'}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Voice Part / Designation
                </label>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {['Soprano', 'Alto', 'Tenor', 'Bass', 'Musician'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setEditForm(p => ({ ...p, designation: preset }))}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            editForm.designation.toLowerCase() === preset.toLowerCase()
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={editForm.designation}
                      onChange={(e) => setEditForm(p => ({ ...p, designation: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-900 text-sm">
                    {member.designation || member.voicePart || 'Member'}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Local Church
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.church}
                    onChange={(e) => setEditForm(p => ({ ...p, church: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-900 text-sm">
                    {member.church || 'Unassigned'}
                  </div>
                )}
              </div>

              {/* Danger Zone Actions */}
              <div className="pt-6 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={() => onRemoveFromZone(member)}
                  className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-xs rounded-xl transition-all"
                >
                  Remove from {member.zoneName || 'Zone'}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteMember(member)}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-all"
                >
                  Permanently Delete Account
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ACCESS PASSES */}
          {activeTab === 'access' && (
            <div className="space-y-3">
              <AccessPassRow
                title="Pre-Rehearsal Access"
                description="Allow singer to view practice materials early"
                enabled={Boolean(member.can_access_pre_rehearsal)}
                color="indigo"
                onToggle={() => togglePass('can_access_pre_rehearsal', !member.can_access_pre_rehearsal, 'Pre-Rehearsal Access')}
              />

              <AccessPassRow
                title="Live Annotation Telestrator"
                description="Allow singer to use the drawing tools during streams"
                enabled={Boolean(member.canAnnotate)}
                color="orange"
                onToggle={() => togglePass('canAnnotate', !member.canAnnotate, 'Live Annotation')}
              />

              <AccessPassRow
                title="Archive Visibility Access"
                description="Allow singer to browse and view archived praise night songs"
                enabled={Boolean(member.canSeeArchive)}
                color="amber"
                onToggle={() => togglePass('canSeeArchive', !member.canSeeArchive, 'Archive Access')}
              />

              <AccessPassRow
                title="Ongoing Rehearsals Room"
                description="Allow singer into active rehearsal rooms"
                enabled={member.canAccessOngoingRehearsals !== false}
                color="emerald"
                onToggle={() => togglePass('canAccessOngoingRehearsals', !(member.canAccessOngoingRehearsals !== false), 'Ongoing Rehearsals')}
              />

              <AccessPassRow
                title="Submit Song Review"
                description="Allow singer to submit original compositions"
                enabled={member.canSubmitSong !== false}
                color="teal"
                onToggle={() => togglePass('canSubmitSong', !(member.canSubmitSong !== false), 'Song Submission')}
              />

              {isHQAdmin(currentProfile) && (
                <AccessPassRow
                  title="Global HQ Access"
                  description="Grant full access to Headquarters rehearsals & Master Library"
                  enabled={Boolean(member.has_hq_access)}
                  color="purple"
                  onToggle={() => togglePass('has_hq_access', !member.has_hq_access, 'Global HQ Access')}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AccessPassRow({
  title,
  description,
  enabled,
  color,
  onToggle
}: {
  title: string;
  description: string;
  enabled: boolean;
  color: 'indigo' | 'orange' | 'amber' | 'emerald' | 'teal' | 'purple';
  onToggle: () => void;
}) {
  const activeBg = {
    indigo: 'bg-indigo-600',
    orange: 'bg-orange-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-600',
    teal: 'bg-teal-600',
    purple: 'bg-purple-600',
  }[color];

  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${
          enabled ? activeBg : 'bg-slate-300'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white transition-all shadow-sm absolute top-1 ${
            enabled ? 'left-5' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}
