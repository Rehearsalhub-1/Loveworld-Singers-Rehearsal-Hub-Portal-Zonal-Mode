"use client";

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Search,
  MapPin,
  Clock,
  Music,
  RefreshCw,
  X
} from 'lucide-react';
import CustomLoader from '@/components/CustomLoader';
import { useAuth } from '@/hooks/useAuth';
import { Toast, ToastContainer } from '@/components/Toast';
import { BackendAPI } from '@/lib/api-client';

interface SubGroupRehearsalsProps {
  subGroupId: string;
  zoneId: string;
  subGroupName?: string;
}

interface Rehearsal {
  id: string;
  name: string;
  date: string;
  location: string;
  songCount: number;
}

export default function SubGroupRehearsals({ subGroupId, zoneId, subGroupName }: SubGroupRehearsalsProps) {
  const { user } = useAuth();
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  };
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Form state
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadRehearsals();
  }, [subGroupId]);

  const loadRehearsals = async () => {
    setIsLoading(true);
    try {
      const res: any = await BackendAPI.subgroups.praiseNights({ subGroupId });
      const data = Array.isArray(res) ? res : (res?.data || []);
      setRehearsals(data.map((r: any) => ({
        id: r.id,
        name: r.name || r.title || 'Untitled',
        date: r.date,
        location: r.location || '',
        songCount: r.songIds?.length || 0
      })));
    } catch (error) {
      console.error('Error loading rehearsals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newDate || !user) return;

    setCreating(true);
    try {
      await BackendAPI.subgroups.createPraiseNight({ 
        subGroupId, 
        zoneId, 
        name: newName, 
        date: newDate, 
        location: newLocation,
        subGroupName: subGroupName || ''
      });

      addToast({
        type: 'success',
        message: `Rehearsal "${newName}" created successfully!`
      });
      setNewName('');
      setNewDate('');
      setNewLocation('');
      setShowCreateModal(false);
      loadRehearsals();
    } catch (error: any) {
      addToast({
        type: 'error',
        message: error?.message || 'Failed to create rehearsal'
      });
    } finally {
      setCreating(false);
    }
  };

  const filteredRehearsals = rehearsals
    .filter(r =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.location?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <CustomLoader />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rehearsals</h1>
          <p className="text-slate-500">Manage your sub-group rehearsals</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Rehearsal</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search rehearsals..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Rehearsals List */}
      {filteredRehearsals.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">No rehearsals yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Create your first rehearsal →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRehearsals.map((rehearsal) => (
            <div
              key={rehearsal.id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-purple-200 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{rehearsal.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {rehearsal.date}
                    </span>
                    {rehearsal.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {rehearsal.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Music className="w-4 h-4" />
                      {rehearsal.songCount} songs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">New Rehearsal</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Sunday Rehearsal"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g., Church Hall"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || !newDate || creating}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <CustomLoader size="sm" />
                    <span>Creating...</span>
                  </>
                ) : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
