"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Send,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Megaphone,
  Music,
  AlertTriangle,
  Users,
  User,
  Sparkles,
  RefreshCw,
  History,
  X,
  Mail,
} from 'lucide-react';
import { BackendAPI } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useZone } from '@/hooks/useZone';
import { isHQGroup } from '@/config/zones';
import CustomLoader from '@/components/CustomLoader';

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  body?: string;
  category?: 'rehearsal' | 'announcement' | 'reminder' | 'admin' | string;
  type?: string;
  priority?: string;
  targetAudience?: string;
  target_audience?: string;
  targetEmail?: string;
  sentBy?: string;
  sender_name?: string;
  sentAt?: string;
  createdAt?: string;
  created_at?: string;
  zoneId?: string;
}

const CATEGORIES = [
  { id: 'rehearsal', label: 'Rehearsal', icon: Music, color: '#7c3aed', bg: 'bg-purple-50 text-purple-700 border-purple-200', activeBg: 'bg-purple-600 text-white border-purple-600' },
  { id: 'announcement', label: 'Announcement', icon: Megaphone, color: '#0284c7', bg: 'bg-sky-50 text-sky-700 border-sky-200', activeBg: 'bg-sky-600 text-white border-sky-600' },
  { id: 'reminder', label: 'Call Time', icon: Clock, color: '#d97706', bg: 'bg-amber-50 text-amber-700 border-amber-200', activeBg: 'bg-amber-600 text-white border-amber-600' },
  { id: 'admin', label: 'Urgent', icon: AlertTriangle, color: '#e11d48', bg: 'bg-rose-50 text-rose-700 border-rose-200', activeBg: 'bg-rose-600 text-white border-rose-600' },
] as const;

const QUICK_TEMPLATES = [
  {
    label: 'Call Time Reminder',
    category: 'reminder' as const,
    title: 'Rehearsal Call Time Prompt',
    message: 'Kindly be reminded that call time for today’s rehearsal is prompt. Please arrive warmed up and ready.',
  },
  {
    label: 'Uniform Guidelines',
    category: 'announcement' as const,
    title: 'Choir Uniform Guidelines',
    message: 'Please ensure you adhere strictly to the scheduled choir dress code for the upcoming ministry service.',
  },
  {
    label: 'Urgent Notice',
    category: 'admin' as const,
    title: 'Important Rehearsal Notice',
    message: 'Urgent update regarding the upcoming rehearsal program. Please review your vocal parts and setlist immediately.',
  },
];

export default function SimpleNotificationsSection() {
  const { user } = useAuth();
  const { currentZone } = useZone();

  const isHQ = currentZone ? isHQGroup(currentZone.id) : false;

  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [messages, setMessages] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]['id']>('rehearsal');
  const [audienceType, setAudienceType] = useState<'all' | 'individual'>('all');
  const [targetEmail, setTargetEmail] = useState('');
  const [sending, setSending] = useState(false);

  // Modals & Feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, message: msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadMessages = useCallback(async () => {
    try {
      // Try sent endpoint first, fallback to all notifications
      let items: any[] = [];
      try {
        const sentRes: any = await BackendAPI.notifications.sent({ limit: 100 });
        items = Array.isArray(sentRes) ? sentRes : (sentRes?.data || []);
      } catch {
        // Fallback
        const allRes: any = await BackendAPI.notifications.getAll({
          zoneId: currentZone?.id,
          limit: 100,
        });
        items = Array.isArray(allRes) ? allRes : (allRes?.data || []);
      }

      const formatted = items.map((data: any) => ({
        ...data,
        id: data.id,
        title: data.title || 'Choir Broadcast',
        message: data.message || data.body || '',
        body: data.body || data.message || '',
        category: data.category || 'announcement',
        sentBy: data.sentBy || data.sender_name || 'Admin',
        sentAt: data.sentAt || data.created_at || data.createdAt || new Date().toISOString(),
        createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      } as AdminNotification));

      formatted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setMessages(formatted);
    } catch (err) {
      console.warn('Failed to load notifications history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentZone?.id]);

  useEffect(() => {
    if (activeTab === 'history') {
      setLoading(true);
      loadMessages();
    }
  }, [activeTab, loadMessages]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMessages();
  };

  const applyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setCategory(tpl.category);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('error', 'Please enter both a title and message body.');
      return;
    }

    if (audienceType === 'individual' && !targetEmail.trim()) {
      showToast('error', 'Please enter recipient singer email.');
      return;
    }

    setSending(true);

    try {
      const senderName = user?.displayName || user?.email || 'Admin';
      const payload: Record<string, any> = {
        title: title.trim(),
        message: message.trim(),
        body: message.trim(),
        category,
        type: category === 'admin' ? 'warning' : category === 'rehearsal' ? 'rehearsal' : 'info',
        priority: category === 'admin' ? 'high' : 'normal',
        sender_name: senderName,
        sentBy: senderName,
        sentAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      if (audienceType === 'individual') {
        payload.targetAudience = 'individual';
        payload.target_audience = 'individual';
        payload.targetEmail = targetEmail.trim().toLowerCase();
        payload.email = targetEmail.trim().toLowerCase();
      } else {
        payload.targetAudience = isHQ ? 'all' : 'zone';
        payload.target_audience = isHQ ? 'all' : 'zone';
        payload.zoneId = currentZone?.id || 'all';
        payload.targetOrgId = currentZone?.id;
      }

      await BackendAPI.notifications.send(payload);

      showToast('success', 'Announcement dispatched successfully!');
      setTitle('');
      setMessage('');
      setTargetEmail('');
      setActiveTab('history');
      loadMessages();
    } catch (error: any) {
      console.error('[Broadcast Notifications] send error:', error);
      showToast('error', error?.message || 'Failed to dispatch announcement.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await BackendAPI.notifications.delete(messageId);
      showToast('success', 'Announcement removed from history.');
      setShowDeleteConfirm(null);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to delete notification');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recent';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' • ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recent';
    }
  };

  const currentCategoryObj = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 lg:p-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-rose-600 text-white shadow-rose-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 stroke-[3px]" /> : <XCircle className="w-4 h-4 stroke-[3px]" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                <Megaphone className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Broadcast Announcements</h1>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Dispatch instant push alerts, rehearsal call-times, and notices to choir singers.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-slate-200/70 p-1 rounded-2xl w-fit self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('compose')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'compose'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Compose
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Sent History
              {messages.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded-full font-black">
                  {messages.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ─── TAB 1: COMPOSE BROADCAST ──────────────────────────────────── */}
        {activeTab === 'compose' && (
          <div className="space-y-6">
            {/* Quick Templates */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-1.5 mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Quick Templates
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {QUICK_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => applyTemplate(tpl)}
                    className="flex flex-col items-start p-3.5 bg-slate-50 hover:bg-purple-50/60 border border-slate-100 hover:border-purple-200 rounded-2xl text-left transition-all group active:scale-[0.98]"
                  >
                    <span className="text-xs font-bold text-slate-800 group-hover:text-purple-700 mb-1">
                      {tpl.label}
                    </span>
                    <span className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {tpl.message}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Broadcast Form Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
                  Notification Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {CATEGORIES.map((c) => {
                    const isSelected = category === c.id;
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(c.id)}
                        className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs font-bold border transition-all active:scale-95 ${
                          isSelected ? c.activeBg + ' shadow-md' : c.bg + ' hover:opacity-90'
                        }`}
                      >
                        <Icon className="w-4 h-4 stroke-[2.5px]" />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
                  Target Audience
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAudienceType('all')}
                    className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                      audienceType === 'all'
                        ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${audienceType === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {isHQ ? 'All HQ Singers' : `All ${currentZone?.name || 'Zone'} Singers`}
                      </div>
                      <div className="text-[11px] text-slate-400">Broadcasts to all active choir members</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('individual')}
                    className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                      audienceType === 'individual'
                        ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${audienceType === 'individual' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Specific Singer</div>
                      <div className="text-[11px] text-slate-400">Direct alert to a specific member email</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Individual Email */}
              {audienceType === 'individual' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    Recipient Member Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={targetEmail}
                      onChange={(e) => setTargetEmail(e.target.value)}
                      placeholder="singer@loveworldsingers.org"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
                    Announcement Title
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">{title.length}/100</span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Rehearsal Call Time Prompt"
                  maxLength={100}
                  className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                />
              </div>

              {/* Message Body */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
                    Message Body
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">{message.length}/500</span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message for choir members..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleSend}
                  disabled={sending || !title.trim() || !message.trim()}
                  className="w-full h-12 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-200 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  {sending ? (
                    <>
                      <CustomLoader size="sm" />
                      <span>Dispatching Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 stroke-[2.5px]" />
                      <span>Dispatch Announcement</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: SENT HISTORY ────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-400">
                {messages.length} Announcement{messages.length === 1 ? '' : 's'} Logged
              </span>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                <CustomLoader message="Loading announcement history..." />
              </div>
            ) : messages.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-3">
                  <Megaphone className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No sent announcements yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Announcements sent from this console will appear here for review and auditing.
                </p>
                <button
                  onClick={() => setActiveTab('compose')}
                  className="mt-4 px-4 py-2 bg-purple-50 text-purple-700 text-xs font-bold rounded-xl hover:bg-purple-100 transition-all"
                >
                  Create First Announcement
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const catObj = CATEGORIES.find(c => c.id === msg.category) || CATEGORIES[1];
                  const CatIcon = catObj.icon;
                  return (
                    <div
                      key={msg.id}
                      className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-2.5 rounded-2xl flex-shrink-0 ${catObj.bg}`}>
                            <CatIcon className="w-4 h-4 stroke-[2.5px]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="text-sm font-black text-slate-900 truncate">
                                {msg.title}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${catObj.bg}`}>
                                {catObj.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed break-words mb-3">
                              {msg.message || msg.body}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-400">
                              <span>Sent by <strong className="text-slate-600">{msg.sentBy}</strong></span>
                              <span>•</span>
                              <span>{formatDate(msg.sentAt || msg.createdAt)}</span>
                              {msg.targetEmail && (
                                <>
                                  <span>•</span>
                                  <span className="text-purple-600 font-bold">To: {msg.targetEmail}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setShowDeleteConfirm(msg.id)}
                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Delete Announcement?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
              This will remove this announcement record from sent broadcast history.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMessage(showDeleteConfirm)}
                className="flex-1 py-2.5 px-4 text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-200 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
