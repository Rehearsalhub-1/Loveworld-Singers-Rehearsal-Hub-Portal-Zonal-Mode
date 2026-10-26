"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  History,
  Clock,
  Search,
  Play,
  Pause,
  RotateCcw,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  Music,
  FileText,
  Info,
  Users,
  RefreshCw,
  CheckCircle2,
  FolderOpen,
  Sparkles,
  Bookmark,
  Volume2,
} from 'lucide-react';

export interface EditSongHistoryModalsProps {
  // List modal
  showHistoryList: boolean;
  setShowHistoryList: (show: boolean) => void;
  historyEntries: any[];
  song: any;
  handleDeleteHistory: (id: string) => void;
  onEditHistory?: (entry: any) => void;
  onAddHistory?: (typeKey?: any, fromList?: boolean) => void;
  onApplyHistory?: (entry: any) => void;
  formatHistoryType?: (type: string) => string;
  isLoadingHistory?: boolean;
  onRefreshHistory?: () => void;
  currentSongAudioFile?: string;

  // Form modal
  showHistoryForm: boolean;
  setShowHistoryForm: (show: boolean) => void;
  editingHistoryEntryId?: string | null;
  historyTitle: string;
  setHistoryTitle: (title: string) => void;
  historyType: string;
  setHistoryType: (type: any) => void;
  historyDescription: string;
  setHistoryDescription: (desc: string) => void;
  originalHistoryValues: { old_value: string; new_value: string };
  setOriginalHistoryValues: React.Dispatch<React.SetStateAction<{ old_value: string; new_value: string }>>;
  handleSaveHistory: () => void;
  onCloseHistoryForm?: () => void;
  onSelectHistoryType?: (typeKey: string) => void;

  // Current Song metadata for Visual Checkpoint Card
  songTitle?: string;
  songKey?: string;
  songTempo?: string;
  songCategories?: string[];
  songStatus?: string;
  onOpenMediaPicker?: () => void;
}

export const EditSongHistoryModals: React.FC<EditSongHistoryModalsProps> = ({
  // List modal
  showHistoryList,
  setShowHistoryList,
  historyEntries,
  song,
  handleDeleteHistory,
  onEditHistory,
  onAddHistory,
  onApplyHistory,
  formatHistoryType = (t: string) => t.charAt(0).toUpperCase() + t.slice(1),
  isLoadingHistory = false,
  onRefreshHistory,
  currentSongAudioFile = '',

  // Form modal
  showHistoryForm,
  setShowHistoryForm,
  editingHistoryEntryId = null,
  historyTitle,
  setHistoryTitle,
  historyType,
  setHistoryType,
  historyDescription,
  setHistoryDescription,
  originalHistoryValues,
  setOriginalHistoryValues,
  handleSaveHistory,
  onCloseHistoryForm,
  onSelectHistoryType,

  // Current Song metadata
  songTitle = '',
  songKey = '',
  songTempo = '',
  songCategories = [],
  songStatus = '',
  onOpenMediaPicker,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'audio' | 'lyrics' | 'details' | 'personnel'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSnapshots, setExpandedSnapshots] = useState<Record<string, boolean>>({});
  const [showRawEditor, setShowRawEditor] = useState(false);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio playback handler
  const handleTogglePlay = (url: string) => {
    if (!url) return;
    if (playingAudioUrl === url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingAudioUrl(url);
      audio.play().catch(err => {
        console.warn('Playback error:', err);
        setPlayingAudioUrl(null);
      });
      audio.onended = () => {
        setPlayingAudioUrl(null);
      };
      audio.onerror = () => {
        setPlayingAudioUrl(null);
      };
    }
  };

  // Cleanup audio on modal close or unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!showHistoryList && !showHistoryForm) {
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingAudioUrl(null);
      }
    }
  }, [showHistoryList, showHistoryForm]);

  const toggleSnapshot = (id: string) => {
    setExpandedSnapshots(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getEntryAudioUrl = (entry: any): string | null => {
    if (entry?.audioUrl && typeof entry.audioUrl === 'string' && entry.audioUrl.trim().startsWith('http')) {
      return entry.audioUrl.trim();
    }
    const val = entry?.new_value ?? entry?.newValue ?? entry?.old_value ?? entry?.oldValue ?? '';
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (
        trimmed.startsWith('http') ||
        trimmed.includes('.mp3') ||
        trimmed.includes('.wav') ||
        trimmed.includes('.m4a') ||
        trimmed.includes('.aac') ||
        trimmed.includes('.opus')
      ) {
        return trimmed;
      }
    }
    return null;
  };

  const isAudioEntry = (entry: any): boolean => {
    const t = (entry?.type || '').toLowerCase();
    return t === 'audio' || Boolean(getEntryAudioUrl(entry));
  };

  const audioCount = useMemo(() => historyEntries.filter(isAudioEntry).length, [historyEntries]);
  const lyricsCount = useMemo(
    () => historyEntries.filter(h => (h.type || '').toLowerCase() === 'lyrics').length,
    [historyEntries]
  );
  const detailsCount = useMemo(
    () => historyEntries.filter(h => (h.type || '').includes('details') || (h.type || '').toLowerCase() === 'metadata').length,
    [historyEntries]
  );
  const personnelCount = useMemo(
    () => historyEntries.filter(h => (h.type || '').toLowerCase() === 'personnel').length,
    [historyEntries]
  );

  const filterTabs = useMemo(() => {
    return [
      { key: 'all' as const, label: 'All', count: historyEntries.length, icon: null },
      { key: 'audio' as const, label: 'Audio', count: audioCount, icon: Music },
      { key: 'lyrics' as const, label: 'Lyrics', count: lyricsCount, icon: FileText },
      { key: 'details' as const, label: 'Details', count: detailsCount, icon: Info },
      ...(personnelCount > 0
        ? [{ key: 'personnel' as const, label: 'Personnel', count: personnelCount, icon: Users }]
        : []),
    ];
  }, [historyEntries.length, audioCount, lyricsCount, detailsCount, personnelCount]);

  const filteredEntries = useMemo(() => {
    return historyEntries.filter(entry => {
      // 1. Tab filter
      if (selectedFilter === 'audio' && !isAudioEntry(entry)) return false;
      if (selectedFilter === 'lyrics' && (entry.type || '').toLowerCase() !== 'lyrics') return false;
      if (
        selectedFilter === 'details' &&
        !(entry.type || '').includes('details') &&
        (entry.type || '').toLowerCase() !== 'metadata'
      )
        return false;
      if (selectedFilter === 'personnel' && (entry.type || '').toLowerCase() !== 'personnel') return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = (entry.title || '').toLowerCase();
        const desc = (entry.description || '').toLowerCase();
        const notes = (entry.notes || '').toLowerCase();
        const url = (getEntryAudioUrl(entry) || '').toLowerCase();
        return title.includes(q) || desc.includes(q) || notes.includes(q) || url.includes(q);
      }

      return true;
    });
  }, [historyEntries, selectedFilter, searchQuery]);

  const handleAddHistoryPress = (typeToUse?: string) => {
    const defaultType = typeToUse || (selectedFilter === 'audio' ? 'audio' : 'song-details');
    if (onAddHistory) {
      onAddHistory(defaultType, true);
    } else {
      setShowHistoryList(false);
      setShowHistoryForm(true);
    }
  };

  const handleCloseForm = () => {
    if (onCloseHistoryForm) {
      onCloseHistoryForm();
    } else {
      setShowHistoryForm(false);
    }
  };

  const selectedAudioUrl =
    typeof originalHistoryValues?.new_value === 'string' ? originalHistoryValues.new_value : '';

  const getTypeBadgeStyle = (type: string, isAudio: boolean) => {
    if (isAudio) return 'bg-purple-100 text-purple-800 border-purple-200';
    const t = (type || '').toLowerCase();
    if (t === 'lyrics') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (t.includes('details') || t === 'metadata') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (t === 'personnel') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (t === 'comments' || t.includes('comment')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (t === 'solfas' || t === 'notation') return 'bg-rose-100 text-rose-800 border-rose-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <>
      {/* ── 1. Song Version History List Modal ─────────────────────────────── */}
      {showHistoryList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Song Version History
                    </h3>
                    <p className="text-xs text-slate-500">
                      Check past recordings, lyrics, and metadata revisions for {song?.title || 'this song'}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onRefreshHistory && (
                  <button
                    onClick={onRefreshHistory}
                    disabled={isLoadingHistory}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
                    title="Refresh history"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin text-purple-600' : ''}`} />
                  </button>
                )}

                <button
                  onClick={() => handleAddHistoryPress()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all hover:shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add History</span>
                </button>

                <button
                  onClick={() => setShowHistoryList(false)}
                  className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs Bar (Browser-like categories) */}
            <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center gap-2 overflow-x-auto scrollbar-none">
              {filterTabs.map(tab => {
                const isActive = selectedFilter === tab.key;
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedFilter(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-purple-700/80 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input Bar */}
            {historyEntries.length > 1 && (
              <div className="px-5 py-2.5 bg-slate-50/60 border-b border-slate-100">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search versions, audio files, or notes..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Current Active Song Audio Track Banner */}
            {(selectedFilter === 'all' || selectedFilter === 'audio') && currentSongAudioFile ? (
              <div className="mx-5 mt-4 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
                      Current Song Audio Track
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {currentSongAudioFile.split('/').pop()?.split('?')[0] || 'Active Track'}
                  </p>
                </div>

                <button
                  onClick={() => handleTogglePlay(currentSongAudioFile)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                    playingAudioUrl === currentSongAudioFile
                      ? 'bg-purple-600 text-white shadow-purple-200'
                      : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  {playingAudioUrl === currentSongAudioFile ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Play Track</span>
                    </>
                  )}
                </button>
              </div>
            ) : null}

            {/* History List Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3.5 min-h-[220px]">
              {isLoadingHistory && historyEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mb-2" />
                  <p className="text-sm font-medium text-slate-600">Loading version history...</p>
                </div>
              ) : filteredEntries.length > 0 ? (
                filteredEntries.map(h => {
                  const audioUrl = getEntryAudioUrl(h);
                  const isAudio = isAudioEntry(h) && Boolean(audioUrl);
                  const fileName = audioUrl ? audioUrl.split('/').pop()?.split('?')[0] || 'Audio File' : '';
                  const isActiveTrack = Boolean(currentSongAudioFile && audioUrl && currentSongAudioFile === audioUrl);
                  const snapshotText =
                    typeof h.new_value === 'string'
                      ? h.new_value
                      : typeof h.newValue === 'string'
                      ? h.newValue
                      : typeof h.old_value === 'string'
                      ? h.old_value
                      : '';
                  const isExpanded = Boolean(expandedSnapshots[h.id]);

                  return (
                    <div
                      key={h.id}
                      className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-purple-200 hover:shadow-sm transition-all"
                    >
                      {/* Card Top: Type badge, Date, and Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span
                              className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${getTypeBadgeStyle(
                                h.type,
                                isAudio
                              )}`}
                            >
                              {isAudio ? 'Audio Track' : formatHistoryType(h.type || 'song-details')}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {h.created_at ? new Date(h.created_at).toLocaleString() : h.date || 'Recent'}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 tracking-tight">{h.title}</h4>

                          {h.description && h.description !== h.title ? (
                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{h.description}</p>
                          ) : null}

                          <p className="text-[11px] text-slate-400 mt-1">
                            Recorded by: <span className="font-medium text-slate-600">{h.created_by || 'Coordinator'}</span>
                          </p>
                        </div>

                        {/* Top-Right Action Buttons */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {onApplyHistory && (
                            <button
                              onClick={() => onApplyHistory(h)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors"
                              title="Restore / Apply this revision to song editor"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Apply</span>
                            </button>
                          )}

                          {onEditHistory && (
                            <button
                              onClick={() => onEditHistory(h)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Edit history title/notes"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteHistory(h.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete this history revision"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Browser-style Audio Box (If Audio version) */}
                      {isAudio && audioUrl ? (
                        <div className="mt-3 p-3 bg-purple-50/70 border border-purple-200/70 rounded-xl">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                                <Volume2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-900 truncate">{fileName}</p>
                                <p className="text-[10px] text-slate-500 truncate">{audioUrl}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleTogglePlay(audioUrl)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                                playingAudioUrl === audioUrl
                                  ? 'bg-purple-600 text-white shadow-purple-200'
                                  : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                              }`}
                            >
                              {playingAudioUrl === audioUrl ? (
                                <>
                                  <Pause className="w-3.5 h-3.5" />
                                  <span>Pause</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5" />
                                  <span>Play</span>
                                </>
                              )}
                            </button>
                          </div>

                          {isActiveTrack && (
                            <div className="mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Current Song Audio</span>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Non-Audio Content Snapshot Preview */}
                      {!isAudio && snapshotText ? (
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <button
                            onClick={() => toggleSnapshot(h.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                <span>Hide Snapshot</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                <span>View Snapshot Content</span>
                              </>
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 max-h-36 overflow-y-auto">
                              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                                {snapshotText}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {historyEntries.length === 0
                      ? 'No history entries recorded yet.'
                      : 'No revisions match your filter.'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    {historyEntries.length === 0
                      ? 'Click "+ Add History" above to save a snapshot version of your audio, lyrics, or song details.'
                      : 'Try selecting another tab or clearing your search query.'}
                  </p>
                  {historyEntries.length === 0 && (
                    <button
                      onClick={() => handleAddHistoryPress()}
                      className="mt-4 flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First History Entry</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Total revisions: {historyEntries.length}
              </span>
              <button
                onClick={() => setShowHistoryList(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Add / Edit History Form Modal ─────────────────────────────── */}
      {showHistoryForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex-1 min-w-0 mr-3">
                <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
                  {editingHistoryEntryId ? 'Update History Entry' : `Save ${formatHistoryType(historyType)} Version`}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingHistoryEntryId
                    ? 'Update details of this revision'
                    : 'Record a new checkpoint of your song content'}
                </p>
              </div>

              <button
                onClick={handleCloseForm}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Type selector chips when adding new */}
              {!editingHistoryEntryId && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Section Type
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { key: 'audio', label: 'Audio Track', icon: Music },
                      { key: 'song-details', label: 'Song Details', icon: Info },
                      { key: 'lyrics', label: 'Lyrics', icon: FileText },
                      { key: 'personnel', label: 'Personnel', icon: Users },
                      { key: 'solfas', label: 'Solfas', icon: Bookmark },
                      { key: 'comments', label: 'Comments', icon: Bookmark },
                    ].map(tab => {
                      const isActive = historyType === tab.key;
                      const IconComponent = tab.icon;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => onSelectHistoryType?.(tab.key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                            isActive
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                          }`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Version Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Version Title *
                </label>
                <input
                  type="text"
                  value={historyTitle}
                  onChange={e => setHistoryTitle(e.target.value)}
                  placeholder="e.g., Rehearsal Take 1, Final Arrangement"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Gorgeous Visual Snapshot Card */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Snapshot Content
                </label>

                {historyType === 'audio' ? (
                  <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-2.5">
                    {selectedAudioUrl ? (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full bg-purple-600" />
                          <p className="text-xs font-bold text-purple-950 truncate">
                            {selectedAudioUrl.split('/').pop()?.split('?')[0] || 'Selected Audio File'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePlay(selectedAudioUrl)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                              playingAudioUrl === selectedAudioUrl
                                ? 'bg-purple-600 text-white'
                                : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-100'
                            }`}
                          >
                            {playingAudioUrl === selectedAudioUrl ? (
                              <>
                                <Pause className="w-3.5 h-3.5" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                <span>Play Audio</span>
                              </>
                            )}
                          </button>

                          {onOpenMediaPicker && (
                            <button
                              type="button"
                              onClick={onOpenMediaPicker}
                              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-all shadow-xs"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                              <span>Change File</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {onOpenMediaPicker && (
                          <button
                            type="button"
                            onClick={onOpenMediaPicker}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                          >
                            <Music className="w-3.5 h-3.5" />
                            <span>Browse Audio Files</span>
                          </button>
                        )}

                        {currentSongAudioFile ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOriginalHistoryValues(prev => ({ ...prev, new_value: currentSongAudioFile }));
                            }}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-100/70 hover:bg-purple-200/70 border border-purple-200 text-purple-800 rounded-lg text-xs font-semibold transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span className="truncate">
                              Use Current Song Track: {currentSongAudioFile.split('/').pop()?.split('?')[0]}
                            </span>
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : historyType === 'song-details' ? (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Info className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {songTitle || 'Current Song Parameters'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                        Song Details
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {songKey && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] font-medium">
                          Key: {songKey}
                        </span>
                      )}
                      {songTempo && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-medium">
                          Tempo: {songTempo} BPM
                        </span>
                      )}
                      {songStatus && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-medium">
                          Status: {songStatus}
                        </span>
                      )}
                      {songCategories && songCategories.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-medium truncate max-w-xs">
                          {songCategories.join(', ')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      All current song parameters will be captured in this checkpoint.
                    </p>
                  </div>
                ) : historyType === 'lyrics' ? (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-slate-800">Current Lyrics Content</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                        {typeof originalHistoryValues?.new_value === 'string'
                          ? `${originalHistoryValues.new_value.split('\n').filter(Boolean).length} lines`
                          : 'Lyrics'}
                      </span>
                    </div>

                    <div className="max-h-24 overflow-y-auto">
                      <p className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed line-clamp-4">
                        {typeof originalHistoryValues?.new_value === 'string' && originalHistoryValues.new_value.trim()
                          ? originalHistoryValues.new_value.trim()
                          : 'No lyrics captured yet'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Bookmark className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-slate-800">
                          {formatHistoryType(historyType)}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                        Checkpoint
                      </span>
                    </div>

                    <div className="max-h-24 overflow-y-auto">
                      <p className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                        {typeof originalHistoryValues?.new_value === 'string' && originalHistoryValues.new_value.trim()
                          ? originalHistoryValues.new_value.trim()
                          : 'Current section content will be captured.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Raw Snapshot Text Editor Toggle */}
              {historyType !== 'audio' && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRawEditor(prev => !prev)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showRawEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{showRawEditor ? 'Hide raw snapshot text' : 'Edit raw snapshot text (optional)'}</span>
                  </button>

                  {showRawEditor && (
                    <div className="mt-2">
                      <textarea
                        rows={4}
                        value={
                          typeof originalHistoryValues?.new_value === 'string'
                            ? originalHistoryValues.new_value
                            : JSON.stringify(originalHistoryValues?.new_value, null, 2)
                        }
                        onChange={e =>
                          setOriginalHistoryValues(prev => ({ ...prev, new_value: e.target.value }))
                        }
                        placeholder="Snapshot text content..."
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Notes Field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={historyDescription}
                  onChange={e => setHistoryDescription(e.target.value)}
                  placeholder="What changed? (e.g., Key adjusted to A, updated lyrics)"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseForm}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHistory}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>{editingHistoryEntryId ? 'Update Revision' : 'Save Checkpoint'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
