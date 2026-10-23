"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { BackendAPI } from '@/lib/api-client';
import { Search, Download, Clock, Edit, Trash2, Plus, Upload, RefreshCw, ChevronLeft, ChevronRight, Filter, Calendar } from 'lucide-react';
import { useZone } from '@/hooks/useZone';
import { isHQGroup, HQ_GROUP_IDS, BOSS_ZONE_ID } from '@/config/zones';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import CustomLoader from '@/components/CustomLoader';

interface ActivityLog {
  id: string;
  zoneId: string;
  zoneName: string;
  userName: string;
  message: string;
  type: string;
  action: string;
  section: string;
  itemName?: string;
  timestamp: any;
  createdAt: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { currentZone, isLoading: zoneLoading } = useZone();
  const isHQ = currentZone ? isHQGroup(currentZone.id) : false;

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear];
  }, []);

  useEffect(() => {
    if (!zoneLoading && currentZone?.id) {
      loadActivityLogs();
    }
  }, [currentZone?.id, zoneLoading]);

  const loadActivityLogs = async (silent = false) => {
    if (!currentZone?.id) return;
    try {
      if (!silent && logs.length === 0) setLoading(true);
      const hqZoneIds = [...HQ_GROUP_IDS, BOSS_ZONE_ID];

      const params: any = isHQ ? { limit: 500 } : { zoneId: currentZone.id, limit: 500 };
      const res: any = await BackendAPI.activityLogs.getAll(params).catch(() => ({ data: [] }));
      const list = Array.isArray(res) ? res : (res?.data || []);
      let logsData = list.map((data: any) => ({
        id: String(data.id),
        ...data,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(data.createdAt || Date.now())
      }));

      if (isHQ) {
        logsData = logsData.filter((log: any) => hqZoneIds.includes(log.zoneId));
      }
      setLogs(logsData);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(prev => prev - 1); }
      else { setSelectedMonth(prev => prev - 1); }
    } else {
      if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(prev => prev + 1); }
      else { setSelectedMonth(prev => prev + 1); }
    }
  };

  const filteredLogs = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
    const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth));

    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const inDateRange = isWithinInterval(logDate, { start: monthStart, end: monthEnd });
      const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.itemName && log.itemName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesSection = !sectionFilter || log.section === sectionFilter;
      return inDateRange && matchesSearch && matchesAction && matchesSection;
    });
  }, [logs, selectedMonth, selectedYear, searchTerm, actionFilter, sectionFilter]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'updated': return <Edit className="w-4 h-4 text-blue-600" />;
      case 'created': return <Plus className="w-4 h-4 text-green-600" />;
      case 'deleted': return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'uploaded': return <Upload className="w-4 h-4 text-purple-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'updated': return 'text-blue-600 bg-blue-50';
      case 'created': return 'text-green-600 bg-green-50';
      case 'deleted': return 'text-red-600 bg-red-50';
      case 'uploaded': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Zone', 'User', 'Message', 'Type', 'Action', 'Section', 'Item'],
      ...filteredLogs.map(log => [
        log.timestamp.toLocaleString(), log.zoneName, log.userName, log.message,
        log.type, log.action, log.section, log.itemName || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${MONTHS[selectedMonth]}-${selectedYear}.csv`;
    a.click();
  };

  if (loading || zoneLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white min-h-[400px]">
        <CustomLoader message="Loading activity logs..." />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-5 lg:pt-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Activity Logs</h1>
            <p className="text-sm text-gray-400 mt-1">
              {isHQ ? 'All HQ activity' : currentZone?.name || 'Your zone'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => loadActivityLogs(true)}
              className="p-2 bg-white border border-gray-100 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors active:scale-95 flex items-center gap-1.5 shadow-sm"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Refresh</span>
            </button>
            <button
              onClick={exportLogs}
              className="p-2 text-white rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
              style={{ backgroundColor: '#9333EA' }}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-semibold">Export</span>
            </button>
          </div>
        </div>

        {/* ── Date + Filters combined ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
          {/* Month navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <button onClick={() => navigateMonth('prev')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:outline-none bg-gray-50"
            >
              {MONTHS.map((month, idx) => <option key={idx} value={idx}>{month}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:outline-none bg-gray-50"
            >
              {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <button onClick={() => navigateMonth('next')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => { setSelectedMonth(new Date().getMonth()); setSelectedYear(new Date().getFullYear()); }}
              className="text-xs font-semibold px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl transition-colors"
              style={{ color: '#9333EA' }}
            >
              This month
            </button>
          </div>

          {/* Search + Action + Section */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-100 rounded-xl focus:ring-2 focus:outline-none text-sm bg-gray-50"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:outline-none bg-gray-50"
            >
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="uploaded">Uploaded</option>
            </select>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:outline-none bg-gray-50"
            >
              <option value="">All Sections</option>
              <option value="songs">Songs</option>
              <option value="pages">Pages</option>
              <option value="categories">Categories</option>
              <option value="subgroups">Subgroups</option>
              <option value="master_library">Master Library</option>
              <option value="media">Media</option>
            </select>
          </div>

          {/* Active filters + count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{MONTHS[selectedMonth]} {selectedYear}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-full text-xs font-bold text-gray-700">
                {filteredLogs.length} logs
              </span>
              {filteredLogs.filter(l => l.action === 'created').length > 0 && (
                <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[11px] font-semibold rounded-full">
                  {filteredLogs.filter(l => l.action === 'created').length} created
                </span>
              )}
              {filteredLogs.filter(l => l.action === 'updated').length > 0 && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-full">
                  {filteredLogs.filter(l => l.action === 'updated').length} updated
                </span>
              )}
              {filteredLogs.filter(l => l.action === 'deleted').length > 0 && (
                <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[11px] font-semibold rounded-full">
                  {filteredLogs.filter(l => l.action === 'deleted').length} deleted
                </span>
              )}
            </div>
            {(actionFilter || sectionFilter || searchTerm) && (
              <button
                onClick={() => { setSearchTerm(''); setActionFilter(''); setSectionFilter(''); }}
                className="text-xs font-semibold hover:underline flex-shrink-0"
                style={{ color: '#9333EA' }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Logs ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-14 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-semibold">No activity for {MONTHS[selectedMonth]} {selectedYear}</p>
              <p className="text-sm text-gray-400 mt-1">Try selecting a different month or adjusting filters</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <table className="hidden lg:table w-full">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">User</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Message</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Section</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap font-medium tabular-nums">
                        {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: '#9333EA' }}>
                            {(log.userName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{log.userName || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 max-w-xs truncate">{log.message}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                          {log.action || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {log.section && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                            {log.section}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile timeline feed */}
              <div className="lg:hidden divide-y divide-gray-50">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{log.message}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${getActionColor(log.action)}`}>
                          {log.action?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-xs font-semibold text-gray-700">{log.userName || 'Unknown'}</span>
                        <span className="text-gray-300 text-xs">•</span>
                        <span className="text-xs text-gray-400">{format(new Date(log.timestamp), 'MMM d, h:mm a')}</span>
                        {log.section && (
                          <>
                            <span className="text-gray-300 text-xs">•</span>
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md">{log.section}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

