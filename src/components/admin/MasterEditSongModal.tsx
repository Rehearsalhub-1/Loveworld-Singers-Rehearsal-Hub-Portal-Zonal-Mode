'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X, Music, Upload, Check, Trash2,
  Save, AlertCircle, Plus, Mic
} from 'lucide-react';
import { MasterSong } from '@/types/master-library';
import { BackendAPI } from '@/lib/api-client';
import MediaSelectionModal from '@/components/MediaSelectionModal';
import CustomLoader from '@/components/CustomLoader';

import { cleanLyricsForSave, decodeHtmlEntities } from '@/utils/lyrics-utils';

interface MasterEditSongModalProps {
  song?: MasterSong | null; // Optional - if null, we're creating a new song
  isOpen: boolean;
  onClose: () => void;
  onSongUpdated?: (updatedSong: MasterSong) => void;
  onSongCreated?: (newSong: MasterSong) => void;
  mode?: 'edit' | 'create';
}

type AudioPartKey = 'full' | 'soprano' | 'alto' | 'tenor' | 'bass' | string;

const DEFAULT_AUDIO_PARTS: { key: AudioPartKey; label: string; color: string }[] = [
  { key: 'full', label: 'Full Mix', color: 'purple' },
  { key: 'soprano', label: 'Soprano', color: 'pink' },
  { key: 'alto', label: 'Alto', color: 'rose' },
  { key: 'tenor', label: 'Tenor', color: 'blue' },
  { key: 'bass', label: 'Bass', color: 'indigo' },
];

// Helper function to convert markdown-style formatting to HTML for display
const markdownToHtml = (text: string): string => {
  if (!text) return '';

  // Split by double newlines to identify paragraph breaks
  const paragraphs = text.split('\n\n');

  // Process each paragraph
  const processedParagraphs = paragraphs
    .filter(p => p.trim() !== '') // Remove empty paragraphs
    .map(paragraph => {
      // Convert **bold** to <b>bold</b>
      let processed = paragraph.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

      // Convert single newlines to <br>
      processed = processed.replace(/\n/g, '<br>');

      // Wrap in p for Cast mode compatibility
      return `<p>${processed}</p>`;
    });

  return cleanLyricsForSave(processedParagraphs.join(''));
};

// Helper function to convert HTML to markdown-style text for editing
const htmlToMarkdown = (html: string): string => {
  if (!html) return '';

  const decoded = decodeHtmlEntities(html);

  return decoded
    .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n\n') // Convert <div> to text with double newlines
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n') // Convert <p> to text with double newlines
    .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
    .replace(/<b>(.*?)<\/b>/gi, '**$1**') // Convert <b> to **bold**
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**') // Convert <strong> to **bold**
    .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1') // Remove <span> tags but keep content
    .replace(/&nbsp;/gi, ' ') // Convert &nbsp; to spaces
    .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
    .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with double newlines
    .trim();
};

export function MasterEditSongModal({
  song,
  isOpen,
  onClose,
  onSongUpdated,
  onSongCreated,
  mode = 'edit',
}: MasterEditSongModalProps) {
  const isCreateMode = mode === 'create' || !song;

  const [formData, setFormData] = useState({
    title: song?.title || '',
    writer: song?.writer || '',
    leadSinger: song?.leadSinger || '',
    key: song?.key || '',
    tempo: song?.tempo || '',
    conductor: song?.conductor || '',
    leadKeyboardist: song?.leadKeyboardist || '',
    bassGuitarist: song?.bassGuitarist || '',
    drummer: song?.drummer || '',
    category: song?.category || '',
    lyrics: htmlToMarkdown(song?.lyrics || ''),
    solfa: htmlToMarkdown(song?.solfa || ''),
    history: htmlToMarkdown(song?.history || ''),
    imageUrl: song?.imageUrl || '',
    isHQOnly: song?.isHQOnly || false,
  });

  // Initialize audio URLs with existing data or empty
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {
      full: song?.audioUrls?.full || song?.audioFile || '',
      soprano: song?.audioUrls?.soprano || '',
      alto: song?.audioUrls?.alto || '',
      tenor: song?.audioUrls?.tenor || '',
      bass: song?.audioUrls?.bass || '',
    };
    // Add any custom parts from the song
    if (song?.customParts) {
      song.customParts.forEach(part => {
        initial[part] = song.audioUrls?.[part] || '';
      });
    }
    return initial;
  });

  // Track custom parts (beyond the default S/A/T/B)
  const [customParts, setCustomParts] = useState<string[]>(song?.customParts || []);
  const [newPartName, setNewPartName] = useState('');
  const [showAddPart, setShowAddPart] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [selectingPart, setSelectingPart] = useState<string | null>(null);


  useEffect(() => {
    if (isOpen) {
      if (song) {
        setFormData({
          title: song.title || '',
          writer: song.writer || '',
          leadSinger: song.leadSinger || '',
          key: song.key || '',
          tempo: song.tempo || '',
          conductor: song.conductor || '',
          leadKeyboardist: song.leadKeyboardist || '',
          bassGuitarist: song.bassGuitarist || '',
          drummer: song.drummer || '',
          category: song.category || '',
          lyrics: htmlToMarkdown(song.lyrics || ''),
          solfa: htmlToMarkdown(song.solfa || ''),
          history: htmlToMarkdown(song.history || ''),
          imageUrl: song.imageUrl || '',
          isHQOnly: song.isHQOnly || false,
        });
        const initial: Record<string, string> = {
          full: song.audioUrls?.full || song.audioFile || '',
          soprano: song.audioUrls?.soprano || '',
          alto: song.audioUrls?.alto || '',
          tenor: song.audioUrls?.tenor || '',
          bass: song.audioUrls?.bass || '',
        };
        if (song.customParts) {
          song.customParts.forEach(part => {
            initial[part] = song.audioUrls?.[part] || '';
          });
        }
        setAudioUrls(initial);
        setCustomParts(song.customParts || []);
      } else {
        // Reset for create mode
        setFormData({
          title: '',
          writer: '',
          leadSinger: '',
          key: '',
          tempo: '',
          conductor: '',
          leadKeyboardist: '',
          bassGuitarist: '',
          drummer: '',
          category: '',
          lyrics: '',
          solfa: '',
          history: '',
          imageUrl: '',
          isHQOnly: false,
        });
        setAudioUrls({
          full: '',
          soprano: '',
          alto: '',
          tenor: '',
          bass: '',
        });
        setCustomParts([]);
      }
      setError(null);
      setSuccess(false);
    }
  }, [song, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  const handleRemoveAudio = (part: string) => {
    setAudioUrls(prev => ({ ...prev, [part]: '' }));
  };

  const handleOpenMediaSelector = (part: string) => {
    setSelectingPart(part);
    setShowMediaSelector(true);
  };

  const handleMediaFileSelect = (file: { id: string; name: string; url: string; type: string }) => {
    if (selectingPart === 'image' && file.type === 'image') {
      handleInputChange('imageUrl', file.url);
      setShowMediaSelector(false);
      setSelectingPart(null);
    } else if (selectingPart && file.type === 'audio') {
      setAudioUrls(prev => ({ ...prev, [selectingPart]: file.url }));
      setShowMediaSelector(false);
      setSelectingPart(null);
    }
  };

  const handleAddCustomPart = () => {
    const partName = newPartName.trim();
    if (!partName) return;

    const normalizedName = partName.toLowerCase();
    const existingParts = ['full', 'soprano', 'alto', 'tenor', 'bass', ...customParts.map(p => p.toLowerCase())];
    if (existingParts.includes(normalizedName)) {
      setError('This part already exists');
      return;
    }

    setCustomParts(prev => [...prev, partName]);
    setAudioUrls(prev => ({ ...prev, [partName]: '' }));
    setNewPartName('');
    setShowAddPart(false);
    setError(null);
  };

  const handleRemoveCustomPart = (partName: string) => {
    setCustomParts(prev => prev.filter(p => p !== partName));
    setAudioUrls(prev => {
      const updated = { ...prev };
      delete updated[partName];
      return updated;
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Build audioUrls object with all parts
      const allAudioUrls: Record<string, string> = {};
      Object.entries(audioUrls).forEach(([key, value]) => {
        if (value) allAudioUrls[key] = value;
      });

      const songData: Partial<MasterSong> = {
        title: formData.title.trim(),
        writer: formData.writer.trim(),
        leadSinger: formData.leadSinger.trim(),
        key: formData.key.trim(),
        tempo: formData.tempo.trim(),
        conductor: formData.conductor.trim(),
        leadKeyboardist: formData.leadKeyboardist.trim(),
        bassGuitarist: formData.bassGuitarist.trim(),
        drummer: formData.drummer.trim(),
        category: formData.category.trim(),
        lyrics: markdownToHtml(formData.lyrics),
        solfa: markdownToHtml(formData.solfa),
        history: markdownToHtml(formData.history),
        audioUrls: allAudioUrls,
        audioFile: audioUrls.full,
        customParts: customParts,
        imageUrl: formData.imageUrl,
        isHQOnly: formData.isHQOnly,
      };

      if (isCreateMode) {
        // Create new song
        const userId = localStorage.getItem('userId') || '';
        const userName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'Admin';

        const result: any = await BackendAPI.songs.create({ ...songData, publishedBy: userId, publishedByName: userName });
        const createdId = result?.id || result?.data?.id;

        if (createdId || result?.success) {
          setSuccess(true);
          const newSong: MasterSong = {
            id: createdId || String(Date.now()),
            ...songData,
            sourceType: 'manual',
            publishedBy: userId,
            publishedByName: userName,
            publishedAt: new Date(),
            updatedAt: new Date(),
            importCount: 0,
          } as MasterSong;

          onSongCreated?.(newSong);

          setTimeout(() => {
            onClose();
          }, 1000);
        } else {
          setError(result?.error || 'Failed to create song');
        }
      } else if (song) {
        const result: any = await BackendAPI.songs.update(song.id, songData);

        if (!result?.error) {
          setSuccess(true);
          const updatedSong: MasterSong = {
            ...song,
            ...songData,
          };
          onSongUpdated?.(updatedSong);

          setTimeout(() => {
            onClose();
          }, 1000);
        } else {
          setError(result?.error || 'Failed to save changes');
        }
      }
    } catch (err) {
 console.error('Save error:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[300] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] z-[300] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isCreateMode ? 'Create New Song' : 'Edit Song'}
              </h2>
              <p className="text-xs text-slate-500">
                {isCreateMode ? 'Add a new song to the Master Library' : 'Update song details and audio parts'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl text-sm">
              <Check size={16} />
              Changes saved successfully!
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Song Details</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600">HQ Only (Hide from Zones)</span>
                <button
                  type="button"
                  onClick={() => handleInputChange('isHQOnly', !formData.isHQOnly as any)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isHQOnly ? 'bg-purple-600' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isHQOnly ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Song title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Writer</label>
                <input
                  type="text"
                  value={formData.writer}
                  onChange={(e) => handleInputChange('writer', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Song writer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Lead Singer</label>
                <input
                  type="text"
                  value={formData.leadSinger}
                  onChange={(e) => handleInputChange('leadSinger', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Lead singer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Worship, Praise"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Key</label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => handleInputChange('key', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., C, G, Am"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tempo</label>
                <input
                  type="text"
                  value={formData.tempo}
                  onChange={(e) => handleInputChange('tempo', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 120 BPM"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Conductor's Guide</label>
                <input
                  type="text"
                  value={formData.conductor}
                  onChange={(e) => handleInputChange('conductor', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter conductor or guide info"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Lead Keyboardist</label>
                <input
                  type="text"
                  value={formData.leadKeyboardist}
                  onChange={(e) => handleInputChange('leadKeyboardist', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Keyboardist name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bass Guitarist</label>
                <input
                  type="text"
                  value={formData.bassGuitarist}
                  onChange={(e) => handleInputChange('bassGuitarist', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Bass guitarist name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Drummer</label>
                <input
                  type="text"
                  value={formData.drummer}
                  onChange={(e) => handleInputChange('drummer', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Drummer name"
                />
              </div>
            </div>
          </div>

          {/* Song Artwork */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Song Artwork</h3>
            <div className="flex items-center gap-4">
              {formData.imageUrl ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-slate-200">
                  <img src={formData.imageUrl} alt="Song Artwork" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleInputChange('imageUrl', '')}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                  <span className="text-xs text-slate-400">No Image</span>
                </div>
              )}
              <div className="flex-1">
                <button
                  onClick={() => handleOpenMediaSelector('image')}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Upload size={16} />
                  Select Image from Media
                </button>
                <p className="text-xs text-slate-500 mt-2">
                  This image will be used as the song's artwork in the mobile app.
                </p>
              </div>
            </div>
          </div>

          {/* Audio Parts Upload */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Audio Parts</h3>
                <p className="text-xs text-slate-500 mt-1">Upload separate audio tracks for each vocal part.</p>
              </div>
              <button
                onClick={() => setShowAddPart(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <Plus size={14} />
                Add Custom Part
              </button>
            </div>

            {/* Add Custom Part Input */}
            {showAddPart && (
              <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-200">
                <input
                  type="text"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  placeholder="Part name (e.g., Harmony, Lead 2)"
                  className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomPart()}
                />
                <button
                  onClick={handleAddCustomPart}
                  className="px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddPart(false); setNewPartName(''); }}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Default Parts */}
              {DEFAULT_AUDIO_PARTS.map(({ key, label, color }) => (
                <div
                  key={key}
                  className={`relative p-3 rounded-xl border-2 transition-all ${audioUrls[key]
                      ? 'border-green-300 bg-green-50'
                      : 'border-slate-200 bg-slate-50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    {audioUrls[key] && (
                      <Check size={16} className="text-green-600" />
                    )}
                  </div>

                  {audioUrls[key] ? (
                    <div className="flex items-center gap-2">
                      <audio
                        src={audioUrls[key]}
                        controls
                        preload="none"
                        className="h-8 w-full max-w-[140px] scale-[0.85] origin-left"
                      />
                      <button
                        onClick={() => handleRemoveAudio(key)}
                        className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenMediaSelector(key)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Upload size={14} />
                      Select from Media
                    </button>
                  )}
                </div>
              ))}

              {/* Custom Parts */}
              {customParts.map((partName) => (
                <div
                  key={partName}
                  className={`relative p-3 rounded-xl border-2 transition-all ${audioUrls[partName]
                      ? 'border-green-300 bg-green-50'
                      : 'border-orange-200 bg-orange-50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{partName}</span>
                    <div className="flex items-center gap-1">
                      {audioUrls[partName] && (
                        <Check size={16} className="text-green-600" />
                      )}
                      <button
                        onClick={() => handleRemoveCustomPart(partName)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="Remove this part"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {audioUrls[partName] ? (
                    <div className="flex items-center gap-2">
                      <audio
                        src={audioUrls[partName]}
                        controls
                        preload="none"
                        className="h-8 w-full max-w-[140px]"
                        style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}
                      />
                      <button
                        onClick={() => handleRemoveAudio(partName)}
                        className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenMediaSelector(partName)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Upload size={14} />
                      Select from Media
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Lyrics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">Lyrics</label>
            </div>

            <textarea
              value={formData.lyrics}
              onChange={(e) => handleInputChange('lyrics', e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono"
              placeholder="Enter song lyrics... Use **text** for bold formatting (e.g., **VERSE 1**)"
            />
            <p className="text-xs text-slate-500">
               Tip: Use <strong>**double asterisks**</strong> for bold. Click "AI Sync Timing" to match lyrics with audio for karaoke.
            </p>
          </div>

          {/* Conductor's Guide Notation */}
          <div className="space-y-2 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">Conductor's Guide Notation</label>
            </div>
            <textarea
              value={formData.solfa}
              onChange={(e) => handleInputChange('solfa', e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono text-emerald-800"
              placeholder="Enter conductor's guide notation (solfas)..."
            />
            <p className="text-xs text-slate-500">
               Enter the musical notation or guide instructions for the conductor.
            </p>
          </div>

          {/* History */}
          <div className="space-y-2 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">Song History</label>
            </div>
            <textarea
              value={formData.history}
              onChange={(e) => handleInputChange('history', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono text-slate-700"
              placeholder="Enter song history... Use **text** for bold formatting"
            />
            <p className="text-xs text-slate-500">
               Document the history or testimony behind this song.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.title.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <CustomLoader size="sm" />
                <span className="ml-2">{isCreateMode ? 'Creating...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Save size={16} />
                {isCreateMode ? 'Create Song' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Media Selection Modal */}
      <MediaSelectionModal
        isOpen={showMediaSelector}
        onClose={() => {
          setShowMediaSelector(false);
          setSelectingPart(null);
        }}
        onFileSelect={handleMediaFileSelect}
        allowedTypes={selectingPart === 'image' ? ['image'] : ['audio']}
        title={selectingPart === 'image' ? 'Select Song Artwork' : (selectingPart ? `Select ${DEFAULT_AUDIO_PARTS.find(p => p.key === selectingPart)?.label || selectingPart} File` : 'Select Media File')}
      />
    </>
  );
}
