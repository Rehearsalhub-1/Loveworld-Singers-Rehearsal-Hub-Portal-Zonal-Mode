'use client';

import { useState, useEffect } from 'react';
import { Music, Calendar, Plus, Trash2, Search, CheckCircle, XCircle } from 'lucide-react';
import { BackendAPI } from '@/lib/api-client';

interface SongMinistryRecord {
  id: string;
  songId: string;
  songTitle: string;
  programType: 'rehearsal' | 'service' | 'meeting' | 'other';
  programDate: string;
  notes?: string;
  createdAt: Date;
}

interface MonthlySummary {
  year: number;
  month: number;
  songMinistries: { [songId: string]: number };
  totalMinistries: number;
}

export default function SongMinistryTracker() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<SongMinistryRecord[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const [newRecord, setNewRecord] = useState({
    songId: '',
    songTitle: '',
    programType: 'rehearsal' as 'rehearsal' | 'service' | 'meeting' | 'other',
    programDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async (silent = false) => {
    if (!silent && records.length === 0) setLoading(true);
    try {
      const res: any = await BackendAPI.generic.list('song_ministries', 100);
      const items: any[] = Array.isArray(res) ? res : (res?.data || []);
      const mapped: SongMinistryRecord[] = items.map((r: any) => ({
        id: r.id,
        songId: r.songId || r.song_id || '',
        songTitle: r.songTitle || r.song_title || 'Untitled',
        programType: r.programType || r.program_type || 'rehearsal',
        programDate: r.programDate || r.program_date || new Date().toISOString(),
        notes: r.notes,
        createdAt: new Date(r.createdAt || r.created_at || Date.now())
      }));
      setRecords(mapped);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await BackendAPI.generic.create('song_ministries', {
        songId: newRecord.songId,
        songTitle: newRecord.songTitle,
        programType: newRecord.programType,
        programDate: newRecord.programDate,
        notes: newRecord.notes,
        createdAt: new Date().toISOString()
      });

      setNewRecord({
        songId: '',
        songTitle: '',
        programType: 'rehearsal',
        programDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      loadAllData(true);
      showToast('success', 'Song ministry recorded!');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add record');
    }
  };

  const filteredRecords = records.filter(record =>
    record.songTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.songId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get the most recent monthly summary
  const currentSummary = monthlySummaries.length > 0 ? monthlySummaries[0] : null;
  const currentMonthName = currentSummary
    ? new Date(currentSummary.year, currentSummary.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Music className="w-6 h-6 text-purple-600" />
            Song Ministry Tracker
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Track when songs are ministered in programs, rehearsals, and services
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Music className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs text-purple-600 font-semibold">This Month</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {currentSummary ? currentSummary.totalMinistries.toLocaleString() : '0'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">Total Ministries</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Music className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-green-600 font-semibold">This Month</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {currentSummary ? Object.keys(currentSummary.songMinistries).length : '0'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">Unique Songs</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-blue-600 font-semibold">Period</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">{currentMonthName}</h3>
          <p className="text-sm text-gray-600 mt-1">Current Month</p>
        </div>
      </div>

      {/* Add New Record Form */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Log New Ministry</h3>
        <form onSubmit={handleAddRecord} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Song Title</label>
            <input
              type="text"
              value={newRecord.songTitle}
              onChange={(e) => setNewRecord({ ...newRecord, songTitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter song title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Song ID</label>
            <input
              type="text"
              value={newRecord.songId}
              onChange={(e) => setNewRecord({ ...newRecord, songId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter song ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Program Type</label>
            <select
              value={newRecord.programType}
              onChange={(e) => setNewRecord({ ...newRecord, programType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="rehearsal">Rehearsal</option>
              <option value="service">Service</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={newRecord.programDate}
              onChange={(e) => setNewRecord({ ...newRecord, programDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={newRecord.notes}
              onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Additional notes about the ministry"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full md:w-auto flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Ministry
            </button>
          </div>
        </form>
      </div>

      {/* Top Ministered Songs */}
      {currentSummary && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Most Ministered Songs This Month</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(currentSummary.songMinistries)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([songId, count]) => (
                <div key={songId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-medium text-gray-900">{songId.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="text-purple-600 font-semibold">{count} times</div>
                </div>
              ))}
            {Object.keys(currentSummary.songMinistries).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No songs ministered this month</p>
            )}
          </div>
        </div>
      )}

      {/* Search and Records List */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Recent Ministries</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search songs..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-64"
            />
          </div>
        </div>

        {filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Song</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Program</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Notes</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{record.songTitle}</div>
                      <div className="text-sm text-gray-500">{record.songId}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{record.programDate}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${record.programType === 'rehearsal' ? 'bg-purple-100 text-purple-800' :
                          record.programType === 'service' ? 'bg-green-100 text-green-800' :
                            record.programType === 'meeting' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                        }`}>
                        {record.programType.charAt(0).toUpperCase() + record.programType.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{record.notes || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">No ministry records found</p>
        )}
      </div>
    </div>
  );
}