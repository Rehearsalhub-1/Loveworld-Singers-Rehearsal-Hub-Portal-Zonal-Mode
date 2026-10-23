'use client'

import { useZone } from '@/hooks/useZone'
import { useAuth } from '@/hooks/useAuth'
import {
  Users, Crown, Music, Calendar, TrendingUp,
  Link as LinkIcon, Copy, CheckCircle, CreditCard,
  Shield, BarChart3, Upload, QrCode, Sparkles,
  ArrowRight, Clock, FileText, List, Search, X, ChevronRight
} from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { BackendAPI, unwrap } from '@/lib/api-client'
import { useAdminTheme } from './AdminThemeProvider'
import { isHQGroup } from '@/config/zones'
import CustomLoader from '@/components/CustomLoader'

const getInviteLink = (code: string) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '')
  return `${origin}/auth?zone=${code}`
}

// Counter component
function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const start = ref.current;
    const diff = value - start;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(step);
      else ref.current = value;
    };

    requestAnimationFrame(step);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

// Greeting logic
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Time helpers
function timeAgo(dateInput: any): string {
  if (!dateInput) return '';
  let date: Date;
  try {
    if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
      date = dateInput.toDate();
    } else if (dateInput?.seconds != null) {
      date = new Date(dateInput.seconds * 1000);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else {
      return '';
    }
    if (!date || isNaN(date.getTime())) return '';
  } catch {
    return '';
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

// Avatar gradient helper
function getAvatarColor(name: string): string {
  const colors = [
    'from-purple-500 to-indigo-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-violet-500 to-purple-600',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface DashboardSectionProps {
  onSectionChange?: (section: string) => void;
}

export default function DashboardSection({ onSectionChange }: DashboardSectionProps = {}) {
  const { currentZone, userRole } = useZone()
  const isZoneCoordinator = userRole === 'zone_coordinator'
  const { profile } = useAuth()

  const [members, setMembers] = useState<any[]>([])
  const [recentPrograms, setRecentPrograms] = useState<any[]>([])
  const [totalMembersCount, setTotalMembersCount] = useState<number>(0)
  const [totalSongs, setTotalSongs] = useState(0)
  const [totalPraiseNights, setTotalPraiseNights] = useState(0)
  const [pendingSubmissions, setPendingSubmissions] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [memberSearch, setMemberSearch] = useState('')

  // Determine HQ scope matching mobile admin (adminStore.ts & useDashboardData.ts)
  const isHQ = Boolean(
    userRole === 'hq_admin' ||
    userRole === 'boss' ||
    profile?.role === 'hq_admin' ||
    profile?.role === 'admin' ||
    profile?.role === 'super_admin' ||
    profile?.hasHqAccess ||
    profile?.has_hq_access ||
    isHQGroup(currentZone?.id) ||
    currentZone?.region === 'Headquarters' ||
    currentZone?.isHq
  )

  const firstName = profile?.first_name || profile?.display_name?.split(' ')[0] || 'Admin';

  useEffect(() => {
    loadData()
  }, [currentZone?.id, isHQ])

  const loadData = async () => {
    if (!currentZone) return

    setIsLoading(true)
    const effectiveZoneId = currentZone.id || 'zone-001';
    setInviteLink(getInviteLink(currentZone.invitationCode || currentZone.id));

    // Scope queries matching mobile admin: rehearsalhub-admin/src/hooks/useDashboardData.ts
    const statsQuery = isHQ ? '' : `?zoneId=${encodeURIComponent(effectiveZoneId)}`;
    const programsQuery = isHQ ? '' : `?zoneId=${encodeURIComponent(effectiveZoneId)}`;

    try {
      // 1. Fetch Official Dashboard Stats, Programs, and Members in parallel (identical to mobile app)
      const [statsRes, programsRes, membersRes] = await Promise.all([
        BackendAPI.admin.dashboardStats(isHQ ? {} : { zoneId: effectiveZoneId }).catch(() => null),
        BackendAPI.programs.getAll(isHQ ? {} : { zoneId: effectiveZoneId }).catch(async () => {
          // Fallback to praiseNights if /programs returns empty or errors
          return BackendAPI.praiseNights.getAll(isHQ ? {} : { zoneId: effectiveZoneId }).catch(() => null);
        }),
        (async () => {
          // Mobile app rule: HQ admins hit /members/hq, zonal admins hit /members/zone/:zoneId
          if (isHQ) {
            const hqRes = await BackendAPI.members.hq().catch(() => null);
            if (hqRes?.data && Array.isArray(hqRes.data) && hqRes.data.length > 0) return hqRes;
            // Fallback to general members
            return BackendAPI.members.getAll().catch(() => null);
          } else {
            const zoneRes = await BackendAPI.members.byZone(effectiveZoneId).catch(() => null);
            if (zoneRes?.data && Array.isArray(zoneRes.data) && zoneRes.data.length > 0) return zoneRes;
            return BackendAPI.members.getAll({ zoneId: effectiveZoneId }).catch(() => null);
          }
        })(),
      ]);

      // 2. Process Members (using mobile app useDashboardData.ts normalization)
      const rawMembers = Array.isArray(membersRes?.data) ? membersRes.data : (Array.isArray(membersRes) ? membersRes : []);
      const shapedMembers = rawMembers.map((u: any) => {
        const userObj = u.user || u.profile || {};
        const rawFirstName =
          u.firstName ||
          u.first_name ||
          userObj.firstName ||
          userObj.first_name ||
          (u.displayName ? u.displayName.split(' ')[0] : '') ||
          (u.userName ? u.userName.split(' ')[0] : '') ||
          (u.name ? u.name.split(' ')[0] : '') ||
          (userObj.name ? userObj.name.split(' ')[0] : '');

        const rawLastName =
          u.lastName ||
          u.last_name ||
          userObj.lastName ||
          userObj.last_name ||
          (u.displayName ? u.displayName.split(' ').slice(1).join(' ') : '') ||
          (u.userName ? u.userName.split(' ').slice(1).join(' ') : '') ||
          (u.name ? u.name.split(' ').slice(1).join(' ') : '') ||
          (userObj.name ? userObj.name.split(' ').slice(1).join(' ') : '');

        const email =
          u.email ||
          u.userEmail ||
          userObj.email ||
          userObj.userEmail ||
          '';

        const first_name = rawFirstName || (email ? email.split('@')[0] : 'Singer');
        const last_name = rawLastName || '';
        const fullName = `${first_name} ${last_name}`.trim();

        return {
          id: u.userId || userObj.id || u.id || u.membershipId,
          name: fullName,
          userName: fullName,
          displayName: fullName,
          first_name,
          last_name,
          email,
          userEmail: email,
          designation: u.voicePart || u.designation || userObj.voicePart || '',
          role: u.role || 'member',
          church:
            u.church ||
            u.churchName ||
            u.group?.name ||
            u.subgroup?.name ||
            u.subGroup?.name ||
            userObj.group?.name ||
            '',
          joinedAt: u.joinedAt || u.createdAt || userObj.createdAt,
          avatarUrl: u.avatarUrl || u.avatar || userObj.avatarUrl || userObj.avatar,
          is_active:
            u.status !== 'INACTIVE' &&
            u.status !== 'inactive' &&
            u.is_active !== false &&
            u.isActive !== false,
        };
      });

      setMembers(shapedMembers);

      // 3. Process Programs (matching mobile app recentPrograms)
      const rawPrograms = Array.isArray(programsRes?.data) ? programsRes.data : (Array.isArray(programsRes) ? programsRes : []);
      const shapedPrograms = rawPrograms.map((p: any) => ({
        id: p.id,
        name: p.name || p.title || 'Untitled Program',
        date: p.date || '',
        category: p.category || p.stage || 'ongoing',
        status: p.status || p.category || 'ongoing',
        songCount: Array.isArray(p.songs) ? p.songs.length : (p.songCount || 0),
        bannerImage: p.bannerImage || p.banner_image || '',
      }));
      setRecentPrograms(shapedPrograms);

      // 4. Resolve Master Songs Count fallback if needed
      let resolvedSongsCount = 0;
      let resolvedPendingCount = 0;

      const officialStats = statsRes?.data || statsRes;

      if (officialStats?.totalSongs != null && Number(officialStats.totalSongs) > 0) {
        resolvedSongsCount = Number(officialStats.totalSongs);
      } else {
        const masterRes = await BackendAPI.masterSongs.getAll().catch(() => null);
        const rawSongs = Array.isArray(masterRes?.data) ? masterRes.data : (Array.isArray(masterRes) ? masterRes : []);
        resolvedSongsCount = rawSongs.length;
      }

      if (officialStats?.pendingSongs != null && Number(officialStats.pendingSongs) >= 0) {
        resolvedPendingCount = Number(officialStats.pendingSongs);
      } else {
        const pendingRes = await BackendAPI.submittedSongs.getAll({ status: 'pending' }).catch(() => null);
        const rawPending = Array.isArray(pendingRes?.data) ? pendingRes.data : (Array.isArray(pendingRes) ? pendingRes : []);
        resolvedPendingCount = rawPending.length;
      }

      // Compute final KPI counts: prefer live officialStats, fallback to actual array lengths
      const finalMembersCount = (officialStats?.totalMembers != null && Number(officialStats.totalMembers) > 0)
        ? Number(officialStats.totalMembers)
        : (shapedMembers.length > 0 ? shapedMembers.length : (Number(officialStats?.totalMembers) || 0));

      const finalProgramsCount = (officialStats?.activePrograms != null && Number(officialStats.activePrograms) > 0)
        ? Number(officialStats.activePrograms)
        : (shapedPrograms.length > 0 ? shapedPrograms.length : (Number(officialStats?.activePrograms) || 0));

      setTotalMembersCount(finalMembersCount);
      setTotalPraiseNights(finalProgramsCount);
      setTotalSongs(resolvedSongsCount);
      setPendingSubmissions(resolvedPendingCount);

    } catch (error) {
      console.error('[DashboardSection] Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Filter members by search input (matching mobile app DashboardScreen.tsx)
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members.slice(0, 6);
    const q = memberSearch.toLowerCase().trim();
    return members.filter(m => {
      const name = `${m.first_name} ${m.last_name}`.toLowerCase();
      const des = (m.designation || '').toLowerCase();
      const church = (m.church || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      return name.includes(q) || des.includes(q) || church.includes(q) || email.includes(q);
    }).slice(0, 6);
  }, [members, memberSearch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <CustomLoader message="Loading dashboard stats..." />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-purple-50/30 text-gray-900 pb-12">
      <div className="max-w-7xl mx-auto">

        {/* Greeting Banner */}
        <div className="px-4 pt-5 pb-1 lg:px-6 lg:pt-8 lg:pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
                {getGreeting()}, {firstName} 
              </h1>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentZone?.themeColor || '#9333EA' }}
                />
                {currentZone?.name || (isHQ ? 'Loveworld Singers HQ' : 'Your Zone')}
                {currentZone?.region && <span className="text-gray-300">•</span>}
                {currentZone?.region && <span>{currentZone.region}</span>}
              </p>
            </div>
            {isZoneCoordinator && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0"
                style={{
                  backgroundColor: `${currentZone?.themeColor || '#9333EA'}15`,
                  color: currentZone?.themeColor || '#9333EA'
                }}
              >
                <Shield className="w-3.5 h-3.5" />
                Coordinator
              </div>
            )}
          </div>
        </div>

        <div className="px-4 lg:px-6 pt-4 pb-6 space-y-6">

          {/* Statistics Overview */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Overview</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

              {/* Members */}
              <button
                onClick={() => onSectionChange?.('Members')}
                className="bg-white rounded-2xl p-4 border border-gray-100 border-l-[3px] border-l-blue-500 shadow-sm hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Members</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                  <AnimatedCounter value={totalMembersCount || members.length} />
                </p>
              </button>

              {/* Songs */}
              <button
                onClick={() => onSectionChange?.('Master Library')}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group"
                style={{ borderLeftWidth: '3px', borderLeftColor: currentZone?.themeColor || '#9333EA' }}
              >
                <div className="flex items-center mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: `${currentZone?.themeColor || '#9333EA'}10` }}
                  >
                    <Music className="w-5 h-5" style={{ color: currentZone?.themeColor || '#9333EA' }} />
                  </div>
                </div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Songs</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                  <AnimatedCounter value={totalSongs} />
                </p>
              </button>

              {/* Programs */}
              <button
                onClick={() => onSectionChange?.('Pages')}
                className="bg-white rounded-2xl p-4 border border-gray-100 border-l-[3px] border-l-green-500 shadow-sm hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Programs</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                  <AnimatedCounter value={totalPraiseNights} />
                </p>
              </button>

              {/* Pending Submissions */}
              <button
                onClick={() => onSectionChange?.('Submitted Songs')}
                className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group ${pendingSubmissions > 0 ? 'border-l-[3px] border-l-red-500' : 'border-l-[3px] border-l-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${pendingSubmissions > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <Upload className={`w-5 h-5 ${pendingSubmissions > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                  </div>
                  {pendingSubmissions > 0 && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Pending</p>
                <p className={`text-2xl font-bold mt-0.5 ${pendingSubmissions > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  <AnimatedCounter value={pendingSubmissions} />
                </p>
              </button>
            </div>
          </div>

          {/* Invite Code */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Invite Code</p>
            <div className="flex items-center gap-2 p-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${currentZone?.themeColor || '#9333EA'}15` }}
              >
                <LinkIcon className="w-5 h-5" style={{ color: currentZone?.themeColor || '#9333EA' }} />
              </div>
              <span className="flex-1 font-mono font-bold text-lg text-gray-900 tracking-[0.15em] text-center">
                {currentZone?.invitationCode || 'ZONE001'}
              </span>
              <button
                onClick={copyInviteLink}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0 ${
                  copiedLink
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                }`}
              >
                {copiedLink ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => onSectionChange?.('Members')}
                className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
              >
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Members</span>
                  <span className="text-[11px] text-gray-400 block">View directory</span>
                </div>
              </button>

              <button
                onClick={() => onSectionChange?.('Pages')}
                className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
              >
                <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Programs</span>
                  <span className="text-[11px] text-gray-400 block">Rehearsal sets</span>
                </div>
              </button>

              <button
                onClick={() => onSectionChange?.('Schedule Manager')}
                className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
              >
                <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <List className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Schedule</span>
                  <span className="text-[11px] text-gray-400 block">Roster & events</span>
                </div>
              </button>

              <Link
                href="/qr-code"
                className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
              >
                <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-900 block">QR Attendance</span>
                  <span className="text-[11px] text-gray-400 block">Scan check-in</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Two-Column Grid: Recent Programs & Members Directory (Matching Mobile App) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Recent Programs (Matches mobile admin Recent Programs card) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Recent Programs</h3>
                    <p className="text-[11px] text-gray-400">Active & upcoming rehearsal setlists</p>
                  </div>
                </div>
                <button
                  onClick={() => onSectionChange?.('Pages')}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Programs List */}
              <div className="divide-y divide-gray-50 flex-1">
                {recentPrograms.slice(0, 5).map((prog) => {
                  const isOngoing = prog.status === 'ongoing' || prog.category === 'ongoing';
                  const initial = (prog.name || 'P').charAt(0).toUpperCase();

                  return (
                    <button
                      key={prog.id}
                      onClick={() => onSectionChange?.('Pages')}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${isOngoing ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {initial}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[13px] text-gray-900 truncate">{prog.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {prog.date || 'TBD'}
                          </span>
                          {prog.songCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{prog.songCount} songs</span>
                            </>
                          )}
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${isOngoing ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {isOngoing ? 'Active' : 'Archived'}
                      </span>
                    </button>
                  );
                })}

                {recentPrograms.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                      <Calendar className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">No programs yet</p>
                    <p className="text-xs text-gray-400 mt-0.5">Rehearsal programs will appear here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Members / Members Directory (Matches mobile admin Members Directory) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Members Directory</h3>
                    <p className="text-[11px] text-gray-400">
                      {totalMembersCount > 0 ? `${totalMembersCount} singers registered` : 'Registered singers'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onSectionChange?.('Members')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search input (matching mobile app) */}
              <div className="px-4 py-2.5 bg-gray-50/50 border-b border-gray-50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search singers by name, voice part, or email..."
                    className="w-full pl-8 pr-8 py-1.5 text-xs bg-white rounded-lg border border-gray-200 focus:outline-none focus:border-purple-500"
                  />
                  {memberSearch && (
                    <button
                      onClick={() => setMemberSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Members List */}
              <div className="divide-y divide-gray-50 flex-1">
                {filteredMembers.map((member, index) => {
                  const displayName = (member.name || member.userName || `${member.first_name || ''} ${member.last_name || ''}`).trim() || 'Singer';
                  const displayEmail = (member.email || member.userEmail || '').trim();
                  const joinedAt = member.joinedAt;
                  const isCoordinator = member.role === 'coordinator' || member.role === 'zone_coordinator' || member.role === 'hq_admin';

                  return (
                    <div key={member.id || index} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
                      {/* Avatar with gradient */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarColor(displayName)} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                          {displayName.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-[13px] text-gray-900 truncate">{displayName}</p>
                          {isCoordinator && (
                            <span
                              className="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider flex-shrink-0"
                              style={{
                                backgroundColor: `${currentZone?.themeColor || '#9333EA'}12`,
                                color: currentZone?.themeColor || '#9333EA'
                              }}
                            >
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {member.designation ? `${member.designation} • ` : ''}{displayEmail}
                        </p>
                      </div>

                      {/* Time */}
                      {joinedAt && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(joinedAt)}
                        </span>
                      )}
                    </div>
                  );
                })}

                {filteredMembers.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                      <Users className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      {memberSearch ? 'No matching singers' : 'No members yet'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {memberSearch ? `No singers found for "${memberSearch}"` : 'Singers who join your zone will appear here'}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
