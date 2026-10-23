"use client";

import React, { useState, useEffect } from 'react';
import {
  Save,
  Smartphone,
  AlertCircle,
  Info,
  RefreshCw,
  Plus,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { BackendAPI } from '@/lib/api-client';
import CustomLoader from '../CustomLoader';

interface AppUpdateConfig {
  latestVersion: string;
  minRequiredVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  forceUpdate?: boolean;
}

export default function AppUpdatesSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [latestVersion, setLatestVersion] = useState('2.4.0');
  const [minRequiredVersion, setMinRequiredVersion] = useState('2.0.0');
  const [downloadUrl, setDownloadUrl] = useState('https://rehearsalhub.app/download');
  const [releaseNotes, setReleaseNotes] = useState(
    '• AudioLab Pitch & Key Shift engine v2\n• Instant push notifications for scheduled rehearsals\n• Real-time geofenced attendance clock-in\n• Offline choir setlist and lyric caching'
  );
  const [forceUpdate, setForceUpdate] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res: any = await BackendAPI.settings.get('version-control').catch(() => null)
        || await BackendAPI.settings.get('version_control').catch(() => null)
        || await BackendAPI.generic.get('settings', 'version-control').catch(() => null);

      const data = res?.data || res;
      if (data) {
        if (data.latestVersion) setLatestVersion(String(data.latestVersion));
        if (data.minRequiredVersion) setMinRequiredVersion(String(data.minRequiredVersion));
        if (data.downloadUrl) setDownloadUrl(String(data.downloadUrl));
        if (data.releaseNotes) setReleaseNotes(String(data.releaseNotes));
        if (typeof data.forceUpdate === 'boolean') setForceUpdate(data.forceUpdate);
      }
    } catch (error) {
      console.warn('Error fetching app updates config:', error);
    } finally {
      setLoading(false);
    }
  };

  const bumpVersion = (type: 'patch' | 'minor') => {
    const parts = latestVersion.split('.').map((p) => parseInt(p, 10) || 0);
    while (parts.length < 3) parts.push(0);
    if (type === 'patch') {
      parts[2] += 1;
    } else {
      parts[1] += 1;
      parts[2] = 0;
    }
    const bumped = parts.join('.');
    setLatestVersion(bumped);
    showToast('success', `Bumped version to ${bumped}`);
  };

  const handleSave = async () => {
    if (!latestVersion.trim()) {
      showToast('error', 'Please enter a valid Latest Version (e.g. 2.4.0)');
      return;
    }
    if (!downloadUrl.trim()) {
      showToast('error', 'Please enter a download URL for singers.');
      return;
    }

    setSaving(true);
    try {
      const payload: AppUpdateConfig = {
        latestVersion: latestVersion.trim(),
        minRequiredVersion: minRequiredVersion.trim() || latestVersion.trim(),
        downloadUrl: downloadUrl.trim(),
        releaseNotes: releaseNotes.trim(),
        forceUpdate,
      };

      // Save to both version-control and version_control for full backward compatibility
      await Promise.allSettled([
        BackendAPI.settings.update('version-control', payload),
        BackendAPI.settings.set('version_control', payload),
        BackendAPI.generic.update('settings', 'version-control', payload),
        BackendAPI.generic.update('app_settings', 'version_control', payload),
      ]);

      showToast('success', `App version ${latestVersion.trim()} published! Mobile app will display the update.`);
    } catch (error: any) {
      console.error('Error saving app updates config:', error);
      showToast('error', error?.message || 'Failed to save app updates configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-12">
        <CustomLoader message="Loading version control settings..." />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 lg:p-8 space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-[100] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            toastMessage.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-rose-600 text-white shadow-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle className="w-4 h-4 stroke-[3px]" /> : <AlertCircle className="w-4 h-4 stroke-[3px]" />}
          {toastMessage.text}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                <Smartphone className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mobile App Updates</h1>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Control version releases, minimum required builds, and forced update prompts for RehearsalHub Mobile.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={fetchConfig}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-slate-600 transition-all shadow-sm active:scale-95"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-purple-200 active:scale-95 disabled:opacity-50"
            >
              {saving ? <CustomLoader size="sm" /> : <Save className="w-3.5 h-3.5" />}
              Publish Update
            </button>
          </div>
        </div>

        {/* Forced Update Banner Toggle */}
        <div className={`p-5 rounded-3xl border transition-all ${
          forceUpdate
            ? 'bg-gradient-to-r from-rose-50 via-red-50 to-white border-rose-200 shadow-sm'
            : 'bg-gradient-to-r from-slate-50 via-purple-50/20 to-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-2xl ${forceUpdate ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {forceUpdate ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Force Immediate Update</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    forceUpdate ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {forceUpdate ? 'Mandatory Lockout' : 'Optional Prompt'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                  {forceUpdate
                    ? 'Singers on versions lower than the Minimum Required Version will be blocked from using the app until they update.'
                    : 'Singers will see an update reminder modal but can choose "Remind Me Later" to continue.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setForceUpdate(!forceUpdate)}
              className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                forceUpdate ? 'bg-rose-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  forceUpdate ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Configuration Card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Latest Version with bump buttons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
                  Latest Version
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => bumpVersion('patch')}
                    className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-black rounded-md border border-purple-200 transition-all active:scale-95"
                  >
                    + Patch
                  </button>
                  <button
                    type="button"
                    onClick={() => bumpVersion('minor')}
                    className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-black rounded-md border border-purple-200 transition-all active:scale-95"
                  >
                    + Minor
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={latestVersion}
                onChange={(e) => setLatestVersion(e.target.value)}
                placeholder="e.g. 2.4.0"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-mono"
              />
              <p className="text-[11px] text-slate-400">
                The newest build published. Singers with a build lower than this will receive the update prompt.
              </p>
            </div>

            {/* Minimum Required Version */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
                Minimum Required Version
              </label>
              <input
                type="text"
                value={minRequiredVersion}
                onChange={(e) => setMinRequiredVersion(e.target.value)}
                placeholder="e.g. 2.0.0"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-mono"
              />
              <p className="text-[11px] text-slate-400">
                The oldest build allowed. Any singer running older than this must update immediately.
              </p>
            </div>
          </div>

          {/* Download URL */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
              Download / App Store URL
            </label>
            <input
              type="text"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="https://rehearsalhub.app/download or APK link"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
            />
          </div>

          {/* Release Notes */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
              Release Notes (What's New)
            </label>
            <textarea
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="List new features and fixes..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all resize-none leading-relaxed"
            />
            <p className="text-[11px] text-slate-400">
              Formatted release notes shown directly in the mobile app update modal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
