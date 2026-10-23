"use client";

// Song editor component
import React, { useState, useEffect } from 'react';
import { PraiseNightSong, Comment, Category } from '../types/supabase';
import MediaSelectionModal from './MediaSelectionModal';
import { useZone } from '@/hooks/useZone';
import { isHQGroup } from '@/config/zones';
import { useAdminTheme } from './admin/AdminThemeProvider';

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
  const [originalHistoryValues, setOriginalHistoryValues] = useState({ old_value: '', new_value: '' });

  // History logic
  const handleCreateHistory = (type: 'song-details' | 'personnel' | 'music-details' | 'lyrics' | 'solfas' | 'notation' | 'audio' | 'comments') => {
    (window as any).currentHistoryEntryId = null;
    setHistoryType(type);

    const sectionNames = {
      'song-details': 'Song Details',
      'personnel': 'Personnel',
      'music-details': 'Music Details',
      'lyrics': 'Lyrics',
      'solfas': "Conductor's Guide",
      'notation': 'Solfa Notation',
      'audio': 'Audio',
      'comments': 'Comments'
    };

    setHistoryTitle(`${sectionNames[type]} Version ${new Date().toLocaleDateString()}`);
    setHistoryDescription(`Updated ${sectionNames[type].toLowerCase()} on ${new Date().toLocaleString()}`);
    setShowHistoryForm(true);
  };

  const handleSaveHistory = async () => {
    if (!song?.id) return;

    try {
      let currentContent = '';
      let oldValue = '';

      switch (historyType) {
        case 'song-details':
          currentContent = JSON.stringify({ title: songTitle, category: songCategory, key: songKey, tempo: songTempo });
          oldValue = JSON.stringify({ title: originalValues.title, category: originalValues.category, key: originalValues.key, tempo: originalValues.tempo });
          break;
        case 'personnel':
          currentContent = JSON.stringify({ leadSinger: songLeadSinger, writer: songWriter, conductor: songConductor, leadKeyboardist: songLeadKeyboardist, leadGuitarist: songLeadGuitarist, drummer: songDrummer });
          oldValue = JSON.stringify({ leadSinger: originalValues.leadSinger, writer: originalValues.writer, conductor: originalValues.conductor, leadKeyboardist: originalValues.leadKeyboardist, leadGuitarist: originalValues.leadGuitarist, drummer: originalValues.drummer });
          break;
        case 'music-details':
          currentContent = JSON.stringify({ key: songKey, tempo: songTempo });
          oldValue = JSON.stringify({ key: originalValues.key, tempo: originalValues.tempo });
          break;
        case 'lyrics':
          currentContent = songLyrics;
          oldValue = originalValues.lyrics;
          break;
        case 'solfas':
          currentContent = songSolfas;
          oldValue = originalValues.solfas;
          break;
        case 'notation':
          currentContent = songNotation;
          oldValue = originalValues.notation;
          break;
        case 'audio':
          currentContent = audioFile ? audioFile.url : songAudioFile;
          oldValue = originalValues.audioFile;
          break;
        case 'comments':
          currentContent = coordinatorComment;
          try {
            const rawComments = Array.isArray(song?.comments) ? song!.comments : [];
            const latestComment = rawComments.length > 0
              ? [...rawComments].sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0]
              : null;
            oldValue = (latestComment as any)?.text || (latestComment as any)?.content || (latestComment as any)?.comment || (typeof latestComment === 'string' ? latestComment : '') || '';
          } catch { oldValue = ''; }
          break;
      }

      const currentHistoryEntryId = (window as any).currentHistoryEntryId;

      if (currentHistoryEntryId) {
        setHistoryEntries(prev => prev.map(entry => {
          if (entry.id === currentHistoryEntryId) {
            return {
              ...entry,
              title: historyTitle,
              description: historyDescription,
              type: historyType,
              updated_at: new Date().toISOString()
            };
          }
          return entry;
        }));
        (window as any).currentHistoryEntryId = null;
        window.dispatchEvent(new Event('historyUpdated'));
        setShowHistoryForm(false);
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'History entry updated successfully!', type: 'success' } }));
      } else {
        const newEntry = {
          id: `hist-${Date.now()}`,
          song_id: song.id.toString(),
          title: historyTitle,
          description: historyDescription,
          type: historyType,
          old_value: oldValue,
          new_value: currentContent,
          created_by: 'admin',
          created_at: new Date().toISOString()
        };
        setHistoryEntries(prev => [newEntry, ...prev]);
        window.dispatchEvent(new Event('historyUpdated'));
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'History entry created successfully!', type: 'success' } }));
      }
    } catch (error) {
      console.error('Error handling history entry:', error);
    }
  };

  const loadHistoryEntries = async () => {
    // Loaded from component state
  };

  const handleDeleteHistory = async (historyId: string) => {
    if (!confirm('Are you sure you want to delete this history entry?')) return;
    setHistoryEntries(prev => prev.filter(entry => entry.id !== historyId));
    window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'History entry deleted successfully!', type: 'success' } }));
  };

  const handleMediaFileSelect = (mediaFile: any) => {
    let fixedUrl = mediaFile.url;
    if (selectingPart === 'image') {
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

  useEffect(() => {
    if (song) {
      setSongTitle(song.title || '');
      setSongCategory(song.category || '');
      setSongCategories(Array.isArray(song.categories) ? song.categories : song.category ? [song.category] : []);
      const praiseNight = praiseNightCategories.find(pn => pn.id === song.praiseNightId);
      setSongPraiseNight(praiseNight?.name || '');
      setSongStatus(song.status);
      setSongLeadSinger(song.leadSinger || '');
      setSongWriter(song.writer || '');
      setSongConductor(song.conductor || '');
      setSongKey(song.key || '');
      setSongTempo(song.tempo || '');
      setSongLeadKeyboardist(song.leadKeyboardist || '');
      setSongLeadGuitarist(song.leadGuitarist || '');
      setSongDrummer(song.drummer || '');
      setSongAudioFile(song.audioFile || '');
      setSongImageUrl(song.imageUrl || '');
      setAudioFile(null);
      setSongLyrics(song.lyrics || '');
      setSongSolfas(song.solfas || '');
      setSongNotation(song.notation || '');
      try {
        let rawComments: any = song.comments;
        if (typeof rawComments === 'string') {
          try { rawComments = JSON.parse(rawComments); } catch { rawComments = [{ text: rawComments }]; }
        }
        if (!rawComments || (Array.isArray(rawComments) && rawComments.length === 0)) {
          if (song.notes || (song as any).coordinatorComment) {
            rawComments = [{ text: song.notes || (song as any).coordinatorComment }];
          }
        }
        const commentList = Array.isArray(rawComments) ? rawComments : (rawComments ? [rawComments] : []);
        const latestComment = commentList.length > 0
          ? [...commentList].sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0]
          : null;
        setCoordinatorComment((latestComment as any)?.text || (latestComment as any)?.content || (latestComment as any)?.comment || (typeof latestComment === 'string' ? latestComment : '') || '');
        setCoordinatorAudioUrl((latestComment as any)?.audioUrl || '');
      } catch { }
      setRehearsalCount(song.rehearsalCount ?? 0);
      setAudioUrls(song.audioUrls || {});
      setCustomParts(song.customParts || []);
      setOriginalValues({
        lyrics: song.lyrics || '',
        solfas: song.solfas || '',
        notation: song.notation || '',
        audioFile: song.audioFile || '',
        title: song.title || '',
        category: song.category || '',
        leadSinger: song.leadSinger || '',
        writer: song.writer || '',
        conductor: song.conductor || '',
        leadKeyboardist: song.leadKeyboardist || '',
        leadGuitarist: song.leadGuitarist || '',
        drummer: song.drummer || '',
        key: song.key || '',
        tempo: song.tempo || ''
      });
      loadHistoryEntries();
    } else {
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
  }, [song]);

  const handleUpdate = async () => {
    if (!songTitle.trim()) return;
    const selectedPraiseNight = praiseNightCategories.find(pn => pn.name === songPraiseNight);
    if (!selectedPraiseNight) {
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
      category: songCategory,
      categories: songCategories,
      praiseNightId: selectedPraiseNight.id,
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
      notation: songNotation,
      rehearsalCount: rehearsalCount,
      comments: finalComments,
      audioFile: finalAudioFile,
      ...(audioFile && { mediaId: parseInt(audioFile.id) }),
      audioUrls: audioUrls,
      customParts: customParts,
      imageUrl: songImageUrl,
      availableParts: Object.keys(audioUrls).filter(k => audioUrls[k]),
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
  if (song && song.id && !song.title) return null;

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
                  />

                  <EditSongNotation
                    songSolfas={songSolfas}
                    setSongSolfas={setSongSolfas}
                    songNotation={songNotation}
                    setSongNotation={setSongNotation}
                    handleCreateHistory={handleCreateHistory}
                    historyButtonClasses={historyButtonClasses}
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
              loadHistoryEntries();
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
        historyTitle={historyTitle}
        setHistoryTitle={setHistoryTitle}
        historyType={historyType}
        setHistoryType={setHistoryType}
        historyDescription={historyDescription}
        setHistoryDescription={setHistoryDescription}
        originalHistoryValues={originalHistoryValues}
        setOriginalHistoryValues={setOriginalHistoryValues}
        handleSaveHistory={handleSaveHistory}
        showHistoryList={showHistoryList}
        setShowHistoryList={setShowHistoryList}
        historyEntries={historyEntries}
        song={song}
        handleDeleteHistory={handleDeleteHistory}
      />
    </>
  );
}
