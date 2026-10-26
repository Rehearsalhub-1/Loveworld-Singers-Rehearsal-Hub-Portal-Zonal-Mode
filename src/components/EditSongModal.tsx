"use client";

// Song editor component
import React, { useState, useEffect } from 'react';
import { PraiseNightSong, Comment, Category } from '../types/supabase';
import MediaSelectionModal from './MediaSelectionModal';
import { useZone } from '@/hooks/useZone';
import { isHQGroup } from '@/config/zones';
import { useAdminTheme } from './admin/AdminThemeProvider';
import { BackendAPI } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';

// Modular Components
import { EditSongHeader } from './edit-song/EditSongHeader';
import { EditSongBasicInfo } from './edit-song/EditSongBasicInfo';
import { EditSongMusicDetails } from './edit-song/EditSongMusicDetails';
import { EditSongPersonnel } from './edit-song/EditSongPersonnel';
import { EditSongAudioLab } from './edit-song/EditSongAudioLab';
import { EditSongLyrics } from './edit-song/EditSongLyrics';
import { EditSongNotation } from './edit-song/EditSongNotation';
import { EditSongComments } from './edit-song/EditSongComments';
import { EditSongFooter } from './edit-song/EditSongFooter';
import { EditSongHistoryModals } from './edit-song/EditSongHistoryModals';
import { cleanLyricsForSave } from '@/utils/lyrics-utils';

interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'audio' | 'video' | 'document';
  size: number;
  uploadedAt: string;
  folder?: string;
  storagePath?: string;
}

interface EditSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: PraiseNightSong | null;
  categories: Category[];
  praiseNightCategories: Array<{ id: string, name: string, description: string, date: string, location: string, icon: string, color: string, isActive: boolean, createdAt: Date, updatedAt: Date, countdown: { days: number, hours: number, minutes: number, seconds: number } }>;
  onUpdate: (updatedSong: PraiseNightSong) => void;
}

export default function EditSongModal({
  isOpen,
  onClose,
  song,
  categories,
  praiseNightCategories,
  onUpdate
}: EditSongModalProps) {
  const { theme } = useAdminTheme();
  const { currentZone } = useZone();

  // Auth helpers
  const getCurrentUserName = () => {
    return localStorage.getItem('userName') || 'Current User';
  };

  // UI styles
  const inputClasses = `w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 ${theme.focusRing} ${theme.focusBorder} focus:shadow-xl ${theme.focusBg}`;
  const buttonClasses = `flex items-center gap-2 px-4 py-3 ${theme.primary} text-white ${theme.primaryHover} rounded-lg transition-colors text-sm font-medium`;
  const historyButtonClasses = `flex items-center gap-1 px-3 py-1.5 text-xs font-medium ${theme.text} ${theme.primaryLight} ${theme.bgHover} border ${theme.border} rounded-md transition-colors`;

  // Form state
  const [songTitle, setSongTitle] = useState('');
  const [songCategory, setSongCategory] = useState('');
  const [songCategories, setSongCategories] = useState<string[]>([]);
  const [songPraiseNight, setSongPraiseNight] = useState('');
  const [songStatus, setSongStatus] = useState<'heard' | 'unheard'>('unheard');
  const [songLeadSinger, setSongLeadSinger] = useState('');
  const [songWriter, setSongWriter] = useState('');
  const [songConductor, setSongConductor] = useState('');
  const [songKey, setSongKey] = useState('');
  const [songTempo, setSongTempo] = useState('');
  const [songLeadKeyboardist, setSongLeadKeyboardist] = useState('');
  const [songLeadGuitarist, setSongLeadGuitarist] = useState('');
  const [songDrummer, setSongDrummer] = useState('');
  const [songSolfas, setSongSolfas] = useState('');
  const [songNotation, setSongNotation] = useState('');
  const [songAudioFile, setSongAudioFile] = useState('');
  const [audioFile, setAudioFile] = useState<MediaFile | null>(null);
  const [songImageUrl, setSongImageUrl] = useState('');
  const [songLyrics, setSongLyrics] = useState('');
  const [coordinatorComment, setCoordinatorComment] = useState('');
  const [coordinatorAudioUrl, setCoordinatorAudioUrl] = useState('');

  // History management state
  const [rehearsalCount, setRehearsalCount] = useState(0);
  const [showMediaManager, setShowMediaManager] = useState(false);

  // Multiple audio parts state (for AudioLab)
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [customParts, setCustomParts] = useState<string[]>([]);
  const [newPartName, setNewPartName] = useState('');
  const [showAddPart, setShowAddPart] = useState(false);
  const [selectingPart, setSelectingPart] = useState<string | null>(null);

  // Helper function to get correct comment terminology based on zone
  const getCommentLabel = () => {
    return isHQGroup(currentZone?.id) ? "Pastor" : "Coordinator";
  };

  // Change detection
  const [originalValues, setOriginalValues] = useState({
    lyrics: '',
    solfas: '',
    audioFile: '',
    title: '',
    category: '',
    leadSinger: '',
    writer: '',
    conductor: '',
    leadKeyboardist: '',
    leadGuitarist: '',
    drummer: '',
    key: '',
    tempo: '',
    notation: ''
  });

  // History state
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [historyType, setHistoryType] = useState<'song-details' | 'personnel' | 'music-details' | 'lyrics' | 'solfas' | 'notation' | 'audio' | 'comments'>('song-details');
  const [historyTitle, setHistoryTitle] = useState('');
  const [historyDescription, setHistoryDescription] = useState('');
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const [showHistoryList, setShowHistoryList] = useState(false);
  const [originalHistoryValues, setOriginalHistoryValues] = useState<{ old_value: string; new_value: string }>({ old_value: '', new_value: '' });
  const [editingHistoryEntryId, setEditingHistoryEntryId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const returnToListRef = React.useRef(false);

  const formatHistoryType = (type: string) => {
    switch (type) {
      case 'song-details': return 'Song Details';
      case 'personnel': return 'Personnel';
      case 'music-details': return 'Music Details';
      case 'lyrics': return 'Lyrics';
      case 'solfas': return "Conductor's Guide";
      case 'notation': return 'Solfa Notation';
      case 'audio': return 'Audio';
      case 'comments': return 'Comments';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getContentForType = (typeKey: string) => {
    switch (typeKey) {
      case 'song-details':
        return [
          `Title: ${songTitle || 'Untitled'}`,
          `Categories: ${songCategories.join(', ') || 'None'}`,
          `Program: ${songPraiseNight || 'Default'}`,
          `Status: ${songStatus}`,
          songKey ? `Key: ${songKey}` : '',
          songTempo ? `Tempo: ${songTempo} BPM` : '',
        ].filter(Boolean).join('\n');
      case 'personnel':
        return [
          songLeadSinger ? `Lead Singer: ${songLeadSinger}` : '',
          songWriter ? `Writer: ${songWriter}` : '',
          songConductor ? `Conductor: ${songConductor}` : '',
          songLeadKeyboardist ? `Lead Keyboard: ${songLeadKeyboardist}` : '',
          songLeadGuitarist ? `Lead Guitar: ${songLeadGuitarist}` : '',
          songDrummer ? `Drummer: ${songDrummer}` : '',
        ].filter(Boolean).join('\n');
      case 'music-details':
        return [
          songKey ? `Key: ${songKey}` : '',
          songTempo ? `Tempo: ${songTempo} BPM` : '',
        ].filter(Boolean).join('\n');
      case 'lyrics':
        return songLyrics || '';
      case 'solfas':
        return songSolfas || '';
      case 'notation':
        return songNotation || '';
      case 'audio':
        return (audioFile ? audioFile.url : songAudioFile) || '';
      case 'comments':
        return coordinatorComment || '';
      default:
        return '';
    }
  };

  const loadHistoryEntries = async (targetSongId?: string | number) => {
    const sId = targetSongId || song?.id;
    if (!sId) {
      setHistoryEntries([]);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const res: any = await BackendAPI.songs.history.bySong(String(sId));
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const seen = new Set();
      const deduplicated = list.filter((item: any) => {
        if (!item?.id) return true;
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      setHistoryEntries(deduplicated);
    } catch (err) {
      console.error('Error fetching song history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleCreateHistory = (
    type: 'song-details' | 'personnel' | 'music-details' | 'lyrics' | 'solfas' | 'notation' | 'audio' | 'comments' = 'song-details',
    fromList = false
  ) => {
    setEditingHistoryEntryId(null);
    setHistoryType(type);
    const label = formatHistoryType(type);
    const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    setHistoryTitle(`${label} — ${dateStr}`);
    setHistoryDescription('');
    const currentContent = getContentForType(type);
    setOriginalHistoryValues({ old_value: currentContent, new_value: currentContent });

    if (fromList || showHistoryList) {
      returnToListRef.current = true;
      setShowHistoryList(false);
    }
    setShowHistoryForm(true);
  };

  const handleEditHistory = (entry: any) => {
    setEditingHistoryEntryId(entry.id);
    const resolvedTitle = entry.title || entry.description || '';
    const resolvedDesc = entry.notes !== undefined
      ? entry.notes
      : (entry.description && entry.description !== entry.title ? entry.description : '');
    setHistoryTitle(resolvedTitle);
    setHistoryDescription(resolvedDesc);
    setHistoryType(entry.type || 'song-details');
    setOriginalHistoryValues({
      old_value: entry.old_value ?? entry.oldValue ?? '',
      new_value: entry.new_value ?? entry.newValue ?? entry.old_value ?? entry.oldValue ?? '',
    });
    returnToListRef.current = true;
    setShowHistoryList(false);
    setShowHistoryForm(true);
  };

  const handleSaveHistory = async () => {
    if (!historyTitle.trim()) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Please enter a version title.', type: 'warning' } }));
      return;
    }
    if (!song?.id) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Please save the song first before recording history versions.', type: 'warning' } }));
      return;
    }

    const titleText = historyTitle.trim();
    const descText = historyDescription.trim();

    try {
      if (editingHistoryEntryId) {
        const res: any = await BackendAPI.songs.history.update(editingHistoryEntryId, {
          type: historyType,
          title: titleText,
          description: descText,
          old_value: originalHistoryValues.old_value,
          new_value: originalHistoryValues.new_value,
        });
        const updatedEntry = res?.data || {
          id: editingHistoryEntryId,
          songId: String(song.id),
          title: titleText,
          description: descText,
          type: historyType,
          old_value: originalHistoryValues.old_value,
          new_value: originalHistoryValues.new_value,
          updated_at: new Date().toISOString(),
        };
        setHistoryEntries(prev => prev.map(e => (e.id === editingHistoryEntryId ? { ...e, ...updatedEntry } : e)));
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'History revision updated successfully!', type: 'success' } }));
      } else {
        const res: any = await BackendAPI.songs.history.create({
          songId: String(song.id),
          type: historyType,
          title: titleText,
          description: descText,
          old_value: originalHistoryValues.old_value,
          new_value: originalHistoryValues.new_value,
        });
        const createdEntry = res?.data || {
          id: res?.id || `hist-${Date.now()}`,
          songId: String(song.id),
          title: titleText,
          description: descText,
          type: historyType,
          old_value: originalHistoryValues.old_value,
          new_value: originalHistoryValues.new_value,
          created_at: new Date().toISOString(),
          created_by: getCurrentUserName(),
        };
        setHistoryEntries(prev => [createdEntry, ...prev.filter(e => e.id !== createdEntry.id)]);
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'New version revision saved to database!', type: 'success' } }));
      }

      setEditingHistoryEntryId(null);
      setShowHistoryForm(false);
      if (returnToListRef.current) {
        setShowHistoryList(true);
        returnToListRef.current = false;
      }
    } catch (err: any) {
      console.error('Error saving history entry:', err);
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: err?.message || 'Failed to save history entry to database.', type: 'error' } }));
    }
  };

  const handleDeleteHistory = async (historyId: string) => {
    if (!confirm('Are you sure you want to delete this revision history entry?')) return;
    try {
      await BackendAPI.songs.history.delete(historyId);
      setHistoryEntries(prev => prev.filter(entry => entry.id !== historyId));
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'History entry deleted successfully!', type: 'success' } }));
    } catch (err: any) {
      console.error('Error deleting history entry:', err);
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Could not delete history entry from database.', type: 'error' } }));
    }
  };

  const handleApplyHistory = (entry: any) => {
    const val = entry.new_value || entry.old_value || '';
    if (!val) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'This history entry has no snapshot content.', type: 'info' } }));
      return;
    }
    const t = (entry.type || '').toLowerCase();
    if (t === 'lyrics') {
      setSongLyrics(val);
    } else if (t === 'solfas') {
      setSongSolfas(val);
    } else if (t === 'notation') {
      setSongNotation(val);
    } else if (t === 'audio') {
      setSongAudioFile(val);
    } else if (t === 'comments') {
      setCoordinatorComment(val);
    } else {
      try {
        const parsed = JSON.parse(val);
        if (parsed.title) setSongTitle(parsed.title);
        if (parsed.key) setSongKey(parsed.key);
        if (parsed.tempo) setSongTempo(parsed.tempo);
        if (parsed.category) setSongCategory(parsed.category);
        if (parsed.leadSinger) setSongLeadSinger(parsed.leadSinger);
        if (parsed.writer) setSongWriter(parsed.writer);
        if (parsed.conductor) setSongConductor(parsed.conductor);
      } catch {
        // Plain text fallback
      }
    }
    window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Applied revision: "${entry.title}"`, type: 'success' } }));
  };

  const handleMediaFileSelect = (mediaFile: any) => {
    let fixedUrl = mediaFile.url;
    if (selectingPart === 'history-audio') {
      setOriginalHistoryValues(prev => ({ ...prev, new_value: fixedUrl }));
      if (!historyTitle || historyTitle.startsWith('Audio Version') || historyTitle.startsWith('Audio —')) {
        const cleanName = (mediaFile.name || '').replace(/\.[^/.]+$/, '');
        setHistoryTitle(`${cleanName || 'Audio'} (${new Date().toLocaleDateString()})`);
      }
    } else if (selectingPart === 'image') {
      setSongImageUrl(fixedUrl);
    } else if (selectingPart === 'comment-audio') {
      setCoordinatorAudioUrl(fixedUrl);
    } else if (selectingPart) {
      setAudioUrls(prev => ({ ...prev, [selectingPart]: fixedUrl }));
    } else {
      setSongAudioFile(fixedUrl);
      setAudioFile({ ...mediaFile, url: fixedUrl });
    }
    setSelectingPart(null);
    setShowMediaManager(false);
  };

  const handleAddCustomPart = () => {
    const partName = newPartName.trim();
    if (!partName) return;
    const normalizedName = partName.toLowerCase();
    const existingParts = ['soprano', 'alto', 'tenor', 'bass', ...customParts.map(p => p.toLowerCase())];
    if (existingParts.includes(normalizedName)) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'This part already exists', type: 'warning' } }));
      return;
    }
    setCustomParts(prev => [...prev, partName]);
    setAudioUrls(prev => ({ ...prev, [partName]: '' }));
    setNewPartName('');
    setShowAddPart(false);
  };

  const handleRemoveAudioPart = (part: string) => {
    setAudioUrls(prev => ({ ...prev, [part]: '' }));
  };

  const handleRemoveCustomPart = (partName: string) => {
    setCustomParts(prev => prev.filter(p => p !== partName));
    setAudioUrls(prev => {
      const updated = { ...prev };
      delete updated[partName];
      return updated;
    });
  };

  const handleOpenMediaSelectorForPart = (part: string) => {
    setSelectingPart(part);
    setShowMediaManager(true);
  };

  const handlePaste = (e: React.ClipboardEvent, currentValue: string, setValue: (value: string) => void) => {
    e.preventDefault();
    const clipboardData = e.clipboardData || (window as any).clipboardData;
    const plainText = clipboardData.getData('text/plain') || clipboardData.getData('text') || '';
    setValue(plainText.replace(/[\r\n]+/g, ' ').trim());
  };

  const getSongAllCategories = (s: any): string[] => {
    const result = new Set<string>();
    if (s?.category && typeof s.category === 'string' && s.category.trim()) result.add(s.category.trim());
    if (Array.isArray(s?.categories)) {
      s.categories.forEach((c: any) => { if (typeof c === 'string' && c.trim()) result.add(c.trim()); });
    }
    const rawCats = s?.audioUrls?._categories;
    if (Array.isArray(rawCats)) {
      rawCats.forEach((c: any) => { if (typeof c === 'string' && c.trim()) result.add(c.trim()); });
    }
    return Array.from(result);
  };

  const [isLoadingSongDetails, setIsLoadingSongDetails] = useState(false);
  const lastLoadedSongIdRef = React.useRef<string | null | undefined>(undefined);
  const lastVisibleRef = React.useRef<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    const songId = song?.id ? String(song.id) : null;
    const songChanged = songId !== lastLoadedSongIdRef.current;
    const modalJustOpened = isOpen && !lastVisibleRef.current;

    lastVisibleRef.current = isOpen;

    if (!modalJustOpened && !songChanged) {
      if (!isOpen) {
        setShowHistoryList(false);
        setShowHistoryForm(false);
      }
      return;
    }

    lastLoadedSongIdRef.current = songId;

    if (song && isOpen) {
      const applySongData = (s: any) => {
        setSongTitle(s.title || '');
        const cats = getSongAllCategories(s);
        setSongCategory(s.category || cats[0] || '');
        setSongCategories(cats);
        const praiseNight = praiseNightCategories.find(pn => String(pn.id) === String(s.praiseNightId) || pn.name === s.praiseNightId);
        setSongPraiseNight(praiseNight?.name || (praiseNightCategories.length > 0 ? praiseNightCategories[0].name : ''));
        setSongStatus(s.status || 'unheard');
        setSongLeadSinger(s.leadSinger || '');
        setSongWriter(s.writer || '');
        setSongConductor(s.conductor || '');
        setSongKey(s.key || '');
        setSongTempo(s.tempo || '');
        setSongLeadKeyboardist(s.leadKeyboardist || '');
        setSongLeadGuitarist(s.leadGuitarist || '');
        setSongDrummer(s.drummer || '');
        setSongAudioFile(s.audioFile || s.audioUrl || '');
        setSongImageUrl(s.imageUrl || '');
        setAudioFile(null);
        setSongLyrics(s.lyrics || '');
        const solfasVal = s.solfas || s.conductorGuide || s.solfa || '';
        setSongSolfas(solfasVal);
        setSongNotation(s.notation || '');
        try {
          let rawComments: any = s.comments;
          if (typeof rawComments === 'string') {
            try { rawComments = JSON.parse(rawComments); } catch { rawComments = [{ text: rawComments }]; }
          }
          if (!rawComments || (Array.isArray(rawComments) && rawComments.length === 0)) {
            if (s.notes || s.coordinatorComment) {
              rawComments = [{ text: s.notes || s.coordinatorComment }];
            }
          }
          const commentList = Array.isArray(rawComments) ? rawComments : (rawComments ? [rawComments] : []);
          const latestComment = commentList.length > 0
            ? [...commentList].sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0]
            : null;
          setCoordinatorComment((latestComment as any)?.text || (latestComment as any)?.content || (latestComment as any)?.comment || (typeof latestComment === 'string' ? latestComment : '') || '');
          setCoordinatorAudioUrl((latestComment as any)?.audioUrl || '');
        } catch { }
        setRehearsalCount(s.rehearsalCount ?? 0);

        // AudioUrls without underscore metadata
        const cleanAudioUrls: Record<string, string> = {};
        if (s.audioUrls && typeof s.audioUrls === 'object') {
          Object.entries(s.audioUrls).forEach(([k, v]) => {
            if (!k.startsWith('_')) cleanAudioUrls[k] = v as string;
          });
        }
        setAudioUrls(cleanAudioUrls);

        // Custom parts extraction matching mobile app
        let cParts: string[] = [];
        const rawCustom = s.customParts || (s.audioUrls as any)?._customParts;
        if (Array.isArray(rawCustom)) {
          cParts = [...rawCustom];
        } else if (rawCustom && typeof rawCustom === 'object') {
          cParts = Object.keys(rawCustom);
        }
        const standardStems = new Set(['full', 'soprano', 'alto', 'tenor', 'bass', 'lead', 'instrumental', 'main', 'master']);
        if (s.audioUrls && typeof s.audioUrls === 'object') {
          Object.keys(s.audioUrls).forEach(k => {
            if (!k.startsWith('_') && !standardStems.has(k.toLowerCase()) && !cParts.includes(k)) {
              cParts.push(k);
            }
          });
        }
        setCustomParts(cParts);

        setOriginalValues({
          lyrics: s.lyrics || '',
          solfas: solfasVal,
          notation: s.notation || '',
          audioFile: s.audioFile || s.audioUrl || '',
          title: s.title || '',
          category: s.category || cats[0] || '',
          leadSinger: s.leadSinger || '',
          writer: s.writer || '',
          conductor: s.conductor || '',
          leadKeyboardist: s.leadKeyboardist || '',
          leadGuitarist: s.leadGuitarist || '',
          drummer: s.drummer || '',
          key: s.key || '',
          tempo: s.tempo || ''
        });
      };

      // Apply available song data immediately
      applySongData(song);
      if (Array.isArray(song.history) && song.history.length > 0) {
        setHistoryEntries(song.history);
      }
      if (song.id) {
        loadHistoryEntries(song.id);
      }

      // If song lacks lyrics and conductor guide, fetch full song details in background
      const lacksDetails = Boolean(
        song.id &&
        song.lyrics === undefined &&
        song.solfas === undefined &&
        (song as any).conductorGuide === undefined
      );

      if (lacksDetails && song.id) {
        setIsLoadingSongDetails(true);
        BackendAPI.songs.getById(String(song.id)).then((res: any) => {
          if (isCancelled) return;
          const full = res?.data || (res?.id ? res : null);
          if (full) {
            applySongData({
              ...song,
              ...full,
              categories: [
                ...(Array.isArray(full.categories) ? full.categories : []),
                ...(Array.isArray(song.categories) ? song.categories : []),
              ],
            });
          }
        }).catch((err) => {
          console.warn('Could not load full song details from API:', err);
        }).finally(() => {
          if (!isCancelled) setIsLoadingSongDetails(false);
        });
      } else {
        setIsLoadingSongDetails(false);
      }
    } else if (!isOpen) {
      lastLoadedSongIdRef.current = null;
      setIsLoadingSongDetails(false);
      setSongTitle('');
      setSongCategory('');
      setSongCategories([]);
      setSongPraiseNight(praiseNightCategories.length > 0 ? praiseNightCategories[0].name : '');
      setSongStatus('unheard');
      setSongLeadSinger('');
      setSongWriter('');
      setSongConductor('');
      setSongKey('');
      setSongTempo('');
      setSongLeadKeyboardist('');
      setSongLeadGuitarist('');
      setSongDrummer('');
      setSongSolfas('');
      setSongNotation('');
      setSongAudioFile('');
      setSongImageUrl('');
      setAudioFile(null);
      setSongLyrics('');
      setCoordinatorComment('');
      setCoordinatorAudioUrl('');
      setRehearsalCount(0);
      setAudioUrls({});
      setCustomParts([]);
      setOriginalValues({ lyrics: '', solfas: '', notation: '', audioFile: '', title: '', category: '', leadSinger: '', writer: '', conductor: '', leadKeyboardist: '', leadGuitarist: '', drummer: '', key: '', tempo: '' });
      setHistoryEntries([]);
    }

    return () => {
      isCancelled = true;
    };
  }, [song, isOpen, praiseNightCategories]);

  const handleUpdate = async () => {
    if (!songTitle.trim()) return;
    const selectedPraiseNight = praiseNightCategories.find(pn => pn.name === songPraiseNight || String(pn.id) === String(song?.praiseNightId));
    const effectivePraiseNightId = selectedPraiseNight?.id || song?.praiseNightId || (praiseNightCategories.length > 0 ? praiseNightCategories[0].id : undefined);
    if (!effectivePraiseNightId) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Please select a valid Praise Night', type: 'warning' } }));
      return;
    }

    const finalAudioFile = audioFile ? audioFile.url : songAudioFile;
    const finalComments = (coordinatorComment && coordinatorComment.trim() !== '') || coordinatorAudioUrl ? [{
      id: `comment-${Date.now()}`,
      text: coordinatorComment,
      audioUrl: coordinatorAudioUrl,
      date: new Date().toISOString()
    }] : [];

    const songData: PraiseNightSong = {
      title: songTitle.trim(),
      status: songStatus,
      category: songCategory || (songCategories.length > 0 ? songCategories[0] : ''),
      categories: songCategories,
      praiseNightId: effectivePraiseNightId,
      lyrics: cleanLyricsForSave(songLyrics),
      leadSinger: songLeadSinger,
      writer: songWriter,
      conductor: songConductor,
      key: songKey,
      tempo: songTempo,
      leadKeyboardist: songLeadKeyboardist,
      leadGuitarist: songLeadGuitarist,
      drummer: songDrummer,
      solfas: songSolfas,
      solfa: songSolfas,
      conductorGuide: songSolfas,
      notation: songNotation,
      rehearsalCount: rehearsalCount,
      comments: finalComments,
      audioFile: finalAudioFile,
      audioUrl: finalAudioFile,
      ...(audioFile && { mediaId: parseInt(audioFile.id) }),
      audioUrls: {
        ...audioUrls,
        _categories: songCategories,
        _customParts: customParts,
      },
      customParts: customParts,
      imageUrl: songImageUrl,
      availableParts: Object.keys(audioUrls).filter(k => audioUrls[k] && !k.startsWith('_')),
      history: song?.history || []
    };

    let updatedSong = song ? { ...song, ...songData } : songData;

    if (song && song.id) {
      const hasChanges = songTitle !== originalValues.title || songCategory !== originalValues.category || songKey !== originalValues.key || songTempo !== originalValues.tempo || songLyrics !== originalValues.lyrics || songSolfas !== originalValues.solfas || songNotation !== originalValues.notation || finalAudioFile !== originalValues.audioFile || songLeadSinger !== originalValues.leadSinger || songWriter !== originalValues.writer || songConductor !== originalValues.conductor || songLeadKeyboardist !== originalValues.leadKeyboardist || songLeadGuitarist !== originalValues.leadGuitarist || songDrummer !== originalValues.drummer;

      // Automatic history disabled by user request
      onUpdate({ ...updatedSong, id: song.id } as PraiseNightSong);
    } else {
      onUpdate(updatedSong as PraiseNightSong);
    }

    window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Updated song: "${songTitle}"`, type: 'success', userName: getCurrentUserName(), action: 'updated', section: 'songs', itemName: songTitle } }));
    onClose();
  };

  const handleDeleteSong = () => {
    window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Delete functionality is managed from the song list.', type: 'info' } }));
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-white z-50 flex flex-col w-screen h-screen">
        <div className="bg-white w-full h-full overflow-hidden flex flex-col">
          <EditSongHeader
            song={song}
            title={songTitle}
            onClose={onClose}
            onDelete={handleDeleteSong}
          />

          {isLoadingSongDetails && (
            <div className="bg-purple-50 border-b border-purple-200 px-6 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-purple-700 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span>Loading full song details, lyrics, and conductor guide...</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="w-full p-3 sm:p-4 lg:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                  <EditSongBasicInfo
                    songTitle={songTitle}
                    setSongTitle={setSongTitle}
                    songCategories={songCategories}
                    setSongCategories={setSongCategories}
                    setSongCategory={setSongCategory}
                    songStatus={songStatus}
                    setSongStatus={setSongStatus}
                    songPraiseNight={songPraiseNight}
                    setSongPraiseNight={setSongPraiseNight}
                    categories={categories}
                    praiseNightCategories={praiseNightCategories}
                    inputClasses={inputClasses}
                    handlePaste={handlePaste}
                    handleCreateHistory={handleCreateHistory}
                    songImageUrl={songImageUrl}
                    setSongImageUrl={setSongImageUrl}
                    handleOpenMediaSelectorForPart={handleOpenMediaSelectorForPart}
                  />

                  <EditSongMusicDetails
                    songKey={songKey}
                    setSongKey={setSongKey}
                    songTempo={songTempo}
                    setSongTempo={setSongTempo}
                    rehearsalCount={rehearsalCount}
                    setRehearsalCount={setRehearsalCount}
                    songAudioFile={songAudioFile}
                    setSongAudioFile={setSongAudioFile}
                    audioFile={audioFile}
                    setAudioFile={setAudioFile}
                    setShowMediaManager={setShowMediaManager}
                    handleCreateHistory={handleCreateHistory}
                    handlePaste={handlePaste}
                    historyButtonClasses={historyButtonClasses}
                    buttonClasses={buttonClasses}
                  />

                  <EditSongAudioLab
                    audioUrls={audioUrls}
                    customParts={customParts}
                    showAddPart={showAddPart}
                    setShowAddPart={setShowAddPart}
                    newPartName={newPartName}
                    setNewPartName={setNewPartName}
                    handleAddCustomPart={handleAddCustomPart}
                    handleRemoveAudioPart={handleRemoveAudioPart}
                    handleRemoveCustomPart={handleRemoveCustomPart}
                    handleOpenMediaSelectorForPart={handleOpenMediaSelectorForPart}
                  />

                  <EditSongPersonnel
                    songLeadSinger={songLeadSinger}
                    setSongLeadSinger={setSongLeadSinger}
                    songWriter={songWriter}
                    setSongWriter={setSongWriter}
                    songConductor={songConductor}
                    setSongConductor={setSongConductor}
                    songLeadKeyboardist={songLeadKeyboardist}
                    setSongLeadKeyboardist={setSongLeadKeyboardist}
                    songLeadGuitarist={songLeadGuitarist}
                    setSongLeadGuitarist={setSongLeadGuitarist}
                    songDrummer={songDrummer}
                    setSongDrummer={setSongDrummer}
                    handleCreateHistory={handleCreateHistory}
                    handlePaste={handlePaste}
                  />
                </div>

                <div className="lg:col-span-3 space-y-4 sm:space-y-6">
                  <EditSongLyrics
                    songLyrics={songLyrics}
                    setSongLyrics={setSongLyrics}
                    handleCreateHistory={handleCreateHistory}
                    historyButtonClasses={historyButtonClasses}
                    songId={song?.id ? String(song.id) : undefined}
                  />

                  <EditSongNotation
                    songSolfas={songSolfas}
                    setSongSolfas={setSongSolfas}
                    songNotation={songNotation}
                    setSongNotation={setSongNotation}
                    handleCreateHistory={handleCreateHistory}
                    historyButtonClasses={historyButtonClasses}
                    songId={song?.id ? String(song.id) : undefined}
                  />

                  <EditSongComments
                    coordinatorComment={coordinatorComment}
                    setCoordinatorComment={setCoordinatorComment}
                    coordinatorAudioUrl={coordinatorAudioUrl}
                    setCoordinatorAudioUrl={setCoordinatorAudioUrl}
                    commentLabel={getCommentLabel()}
                    handleCreateHistory={handleCreateHistory}
                    handleOpenMediaSelectorForPart={handleOpenMediaSelectorForPart}
                    historyButtonClasses={historyButtonClasses}
                  />
                </div>
              </div>
            </div>
          </div>

          <EditSongFooter
            song={song}
            onUpdate={handleUpdate}
            onClose={onClose}
            onViewHistory={() => {
              if (song?.id) loadHistoryEntries(song.id);
              setShowHistoryList(true);
            }}
            historyEntriesCount={historyEntries.length}
            theme={theme}
          />
        </div>
      </div>

      <MediaSelectionModal
        isOpen={showMediaManager}
        onClose={() => setShowMediaManager(false)}
        onFileSelect={handleMediaFileSelect}
        allowedTypes={selectingPart === 'image' ? ['image'] : ['audio']}
        title={selectingPart === 'image' ? 'Select Song Artwork' : 'Select Audio File'}
      />

      <EditSongHistoryModals
        showHistoryForm={showHistoryForm}
        setShowHistoryForm={setShowHistoryForm}
        editingHistoryEntryId={editingHistoryEntryId}
        historyTitle={historyTitle}
        setHistoryTitle={setHistoryTitle}
        historyType={historyType}
        setHistoryType={setHistoryType}
        historyDescription={historyDescription}
        setHistoryDescription={setHistoryDescription}
        originalHistoryValues={originalHistoryValues}
        setOriginalHistoryValues={setOriginalHistoryValues}
        handleSaveHistory={handleSaveHistory}
        onCloseHistoryForm={() => {
          setEditingHistoryEntryId(null);
          setShowHistoryForm(false);
          if (returnToListRef.current) {
            setShowHistoryList(true);
            returnToListRef.current = false;
          }
        }}
        onSelectHistoryType={(typeKey) => {
          setHistoryType(typeKey as any);
          if (!editingHistoryEntryId) {
            const label = formatHistoryType(typeKey);
            const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            setHistoryTitle(`${label} — ${dateStr}`);
            setHistoryDescription('');
            const currentContent = getContentForType(typeKey);
            setOriginalHistoryValues({ old_value: currentContent, new_value: currentContent });
          }
        }}
        showHistoryList={showHistoryList}
        setShowHistoryList={setShowHistoryList}
        historyEntries={historyEntries}
        song={song}
        handleDeleteHistory={handleDeleteHistory}
        onEditHistory={handleEditHistory}
        onAddHistory={handleCreateHistory}
        onApplyHistory={handleApplyHistory}
        formatHistoryType={formatHistoryType}
        isLoadingHistory={isLoadingHistory}
        onRefreshHistory={() => {
          if (song?.id) loadHistoryEntries(song.id);
        }}
        currentSongAudioFile={audioFile ? audioFile.url : songAudioFile}
        songTitle={songTitle}
        songKey={songKey}
        songTempo={songTempo}
        songCategories={songCategories}
        songStatus={songStatus}
        onOpenMediaPicker={() => {
          setSelectingPart('history-audio');
          setShowMediaManager(true);
        }}
      />
    </>
  );
}
