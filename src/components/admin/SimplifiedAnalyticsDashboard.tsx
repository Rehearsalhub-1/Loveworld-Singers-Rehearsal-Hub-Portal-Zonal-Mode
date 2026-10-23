'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Globe,
  Building2,
  CheckCircle2,
  Search,
  RefreshCw,
  Shield,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  X,
  Mail,
  MapPin,
  Lock,
  Check,
  UserCheck,
  UserX,
  SlidersHorizontal
} from 'lucide-react';
import { BackendAPI } from '@/lib/api-client';
import { useZone } from '@/hooks/useZone';
import { useAuth } from '@/hooks/useAuth';
import { isHQAdmin as checkIsHQAdmin } from '@/config/roles';
import { isHQGroup, ZONES } from '@/config/zones';
import CustomLoader from '@/components/CustomLoader';

interface OverviewStats {
  totalSingers: number;
  totalZones: number;
  totalChurches: number;
  globalAttendanceRate: number;
}

const INITIAL_OVERVIEW: OverviewStats = {
  totalSingers: 0,
  totalZones: 0,
  totalChurches: 0,
  globalAttendanceRate: 0,
};

export default function SimplifiedAnalyticsDashboard() {
  const { currentZone } = useZone();
  const { profile } = useAuth();

  const isHQ = Boolean(
    (currentZone && isHQGroup(currentZone.id)) ||
    checkIsHQAdmin(profile)
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<OverviewStats>(INITIAL_OVERVIEW);
  const [zonesList, setZonesList] = useState<any[]>([]);

  // Member search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Selected member for detail drawer
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── Fetch global overview ──────────────────────────────────────────────────
  const fetchGlobalData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [overviewRes, zonesRes] = await Promise.all([
        BackendAPI.analytics.overview().catch(() => null),
        BackendAPI.zones.getAll().catch(() => ({ data: [] })),
      ]);

      if (overviewRes?.data) {
        setOverview(overviewRes.data);
      } else if (overviewRes && typeof overviewRes === 'object' && 'totalSingers' in overviewRes) {
        setOverview(overviewRes as any);
      }

      const zonesData = Array.isArray(zonesRes?.data)
        ? zonesRes.data
        : (Array.isArray(zonesRes) ? zonesRes : ZONES);
      setZonesList(zonesData);
    } catch (e) {
      console.error('[SimplifiedAnalyticsDashboard] fetchGlobalData error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isHQ) {
      fetchGlobalData();
    } else {
      setLoading(false);
    }
  }, [isHQ, fetchGlobalData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGlobalData(true);
  };

  // ── Debounced member search ────────────────────────────────────────────────
  useEffect(() => {
    if (!isHQ || !searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const trimmed = searchQuery.trim();
        const res: any = await BackendAPI.members.getAll({ scope: 'global', search: trimmed }).catch(() => null);
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isHQ]);

  // ── Toggle feature access pass ─────────────────────────────────────────────
  const handleTogglePass = async (key: string, currentValue: boolean) => {
    if (!selectedMember) return;
    const nextVal = !currentValue;
    const memberId = selectedMember.id || selectedMember.userId;

    const payload: Record<string, any> = { [key]: nextVal };
    if (key === 'canSeeArchive' || key === 'can_access_archive') {
      payload.canSeeArchive = nextVal;
      payload.can_access_archive = nextVal;
    }

    setSelectedMember((prev: any) => ({ ...prev, [key]: nextVal, ...payload }));
    setSearchResults(prev =>
      prev.map(m => ((m.id || m.userId) === memberId ? { ...m, [key]: nextVal, ...payload } : m))
    );

    try {
      await BackendAPI.profiles.update(memberId, payload);
      showToast('Access pass updated');
    } catch (e: any) {
      showToast(e?.message || 'Failed to update pass', 'error');
    }
  };

  // ── Restricted Access Guard for non-HQ Admins ─────────────────────────────
  if (!isHQ) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[400px]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">HQ Leadership Only</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            The HQ Executive Overview provides ministry-wide aggregated metrics across all zones and churches. This console is strictly reserved for Loveworld Singers Headquarters leadership.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Restricted Console Access
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <CustomLoader message="Loading Ministry Metrics..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-8 right-8 z-[100] px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <ShieldAlert className="w-4 h-4" />
          )}
          {toastMessage.text}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Loveworld Singers HQ Overview
            </h1>
            <p className="text-xs text-slate-500">
              Aggregated personnel, zone distribution, and attendance metrics.
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors disabled:opacity-50 self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>

      {/* ── Worldwide KPI Cards (4 Cards) ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Singers */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-3 border border-purple-100">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {overview.totalSingers.toLocaleString()}
          </div>
          <div className="text-xs font-bold text-slate-700 mt-1">Total Singers</div>
          <div className="text-[10px] text-slate-400 mt-0.5">All zones combined</div>
        </div>

        {/* Card 2: All Zones */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3 border border-indigo-100">
            <Globe className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {overview.totalZones || zonesList.length}
          </div>
          <div className="text-xs font-bold text-slate-700 mt-1">All Zones</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active ministry regions</div>
        </div>

        {/* Card 3: Church Choirs */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-3 border border-amber-100">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {overview.totalChurches.toLocaleString()}
          </div>
          <div className="text-xs font-bold text-slate-700 mt-1">Church Choirs</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Local assemblies</div>
        </div>

        {/* Card 4: Overall Attendance */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3 border border-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {overview.globalAttendanceRate}%
          </div>
          <div className="text-xs font-bold text-slate-700 mt-1">Overall Attendance</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Ministry-wide average</div>
        </div>
      </div>

      {/* ── All-Singers Lookup ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Search className="w-4 h-4 text-purple-600" />
          <h2 className="text-base font-bold text-slate-900">All-Singers Lookup</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Search any singer across all zones and local church choirs.
        </p>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or KingsChat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {searching && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <RefreshCw className="w-4 h-4 text-purple-600 animate-spin" />
            </div>
          )}
          {searchQuery && !searching && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        {searchQuery.trim().length > 0 && (
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {searchResults.length === 0 && !searching ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No singers found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              searchResults.map((member: any) => {
                const memberName =
                  member.userName ||
                  `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
                  member.name ||
                  'Singer';
                const initial = (memberName || 'S').charAt(0).toUpperCase();

                return (
                  <div
                    key={member.id || member.userId}
                    onClick={() => setSelectedMember(member)}
                    className="p-3 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-sm truncate">
                          {memberName}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {member.userEmail || member.email || 'No email'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                            <Globe className="w-2.5 h-2.5" />
                            {member.zoneName || member.organization?.name || 'HQ Zone'}
                          </span>
                          {member.churchName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                              <Building2 className="w-2.5 h-2.5" />
                              {member.churchName}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {member.role === 'church_admin'
                              ? 'Church Admin'
                              : member.role === 'zone_admin'
                              ? 'Zone Admin'
                              : 'Singer'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-purple-600 transition-colors">
                      <span className="text-xs font-semibold hidden sm:inline">Manage</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Regional Zones Breakdown ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-purple-600" />
          <h2 className="text-base font-bold text-slate-900">
            Regional Zones Breakdown ({zonesList.length})
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Summary of active zones, membership rosters, and local assemblies.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {zonesList.map((z: any) => {
            const memberCount = z._count?.memberships ?? z.memberCount ?? 0;
            const churchCount = z._count?.groups ?? (z.groups?.length ?? 0);
            const isHqZone = z.isHq || z.id === 'zone-001' || z.region === 'Headquarters';

            return (
              <div
                key={z.id}
                className={`p-4 rounded-xl border transition-all ${
                  isHqZone
                    ? 'border-purple-200 bg-purple-50/30'
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{z.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {isHqZone ? '🏛️ Headquarters LCA' : z.region ? `📍 ${z.region}` : 'Regional Zone'}
                    </p>
                  </div>
                  {isHqZone && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white flex-shrink-0">
                      HQ Core
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-slate-800">{memberCount}</span>
                    <span className="text-[10px] text-slate-400">Singers</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Building2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-slate-800">{churchCount}</span>
                    <span className="text-[10px] text-slate-400">Churches</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Singer Management Drawer / Modal ────────────────────────────── */}
      {selectedMember && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Singer Profile & Passes</h3>
                <p className="text-xs text-slate-500">Ministry roles and feature permissions</p>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Profile Card */}
              <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                  {(selectedMember.userName || selectedMember.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-sm truncate">
                    {selectedMember.userName || selectedMember.name || 'Singer'}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {selectedMember.userEmail || selectedMember.email || 'No email'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {selectedMember.zoneName || 'HQ Zone'}
                    {selectedMember.churchName ? ` • ${selectedMember.churchName}` : ''}
                  </div>
                </div>
              </div>

              {/* Feature Access Passes */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Feature Passes
                </div>

                {/* Archive Pass */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Archive Access</div>
                    <div className="text-[10px] text-slate-500">Allow browsing past program songs</div>
                  </div>
                  <button
                    onClick={() =>
                      handleTogglePass(
                        'can_access_archive',
                        Boolean(selectedMember.can_access_archive ?? selectedMember.canSeeArchive)
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      Boolean(selectedMember.can_access_archive ?? selectedMember.canSeeArchive)
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {Boolean(selectedMember.can_access_archive ?? selectedMember.canSeeArchive) ? 'Granted' : 'Revoked'}
                  </button>
                </div>

                {/* Ongoing Rehearsals Pass */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Ongoing Rehearsals</div>
                    <div className="text-[10px] text-slate-500">Access live rehearsal tracks</div>
                  </div>
                  <button
                    onClick={() =>
                      handleTogglePass(
                        'can_access_ongoing',
                        Boolean(selectedMember.can_access_ongoing)
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      Boolean(selectedMember.can_access_ongoing)
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {Boolean(selectedMember.can_access_ongoing) ? 'Granted' : 'Revoked'}
                  </button>
                </div>

                {/* Pre-Rehearsal Pass */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Pre-Rehearsal Content</div>
                    <div className="text-[10px] text-slate-500">Preview songs before general rehearsal</div>
                  </div>
                  <button
                    onClick={() =>
                      handleTogglePass(
                        'can_access_pre_rehearsal',
                        Boolean(selectedMember.can_access_pre_rehearsal)
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      Boolean(selectedMember.can_access_pre_rehearsal)
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {Boolean(selectedMember.can_access_pre_rehearsal) ? 'Granted' : 'Revoked'}
                  </button>
                </div>

                {/* Annotations Pass */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Annotations & Notes</div>
                    <div className="text-[10px] text-slate-500">Add personal annotations to lyrics and sheet music</div>
                  </div>
                  <button
                    onClick={() =>
                      handleTogglePass('canAnnotate', Boolean(selectedMember.canAnnotate))
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      Boolean(selectedMember.canAnnotate)
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {Boolean(selectedMember.canAnnotate) ? 'Granted' : 'Revoked'}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
