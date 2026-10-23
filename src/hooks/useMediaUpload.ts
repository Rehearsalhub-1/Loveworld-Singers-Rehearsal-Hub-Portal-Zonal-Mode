"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useZone } from '@/hooks/useZone';
import { BackendAPI } from '@/lib/api-client';
import { extractYouTubeVideoId, getYouTubeThumbnail } from '@/utils/youtube';

export interface MediaVideo {
  id: string;
  title: string;
  description?: string;
  videoUrl?: string;
  url?: string;
  youtubeUrl?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  type?: string;
  category?: string;
  featured?: boolean;
  forHQ?: boolean;
  isYouTube?: boolean;
  channelId?: string;
  channelName?: string;
  views?: number;
  likes?: number;
  zoneId?: string;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

export interface AdminPlaylist {
  id: string;
  name: string;
  title?: string;
  description?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  forHQ?: boolean;
  videoIds?: string[];
  videos?: any[];
  [key: string]: any;
}

export interface MediaCategory {
  id: string;
  name: string;
  title?: string;
  slug?: string;
  [key: string]: any;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  videoCount?: number;
  isHQOnly?: boolean;
  allowedZones?: string[];
  [key: string]: any;
}

export type MediaView =
  | 'channels'
  | 'add-channel'
  | 'edit-channel'
  | 'channel-detail'
  | 'videos'
  | 'playlists'
  | 'categories'
  | 'add-video'
  | 'edit-video'
  | 'add-playlist'
  | 'edit-playlist'
  | 'playlist-detail'
  | 'add-category'
  | 'edit-category'
  | 'batch-upload';

export function useMediaUpload() {
  const { user, profile } = useAuth();
  const { currentZone } = useZone();

  const [currentView, setCurrentView] = useState<MediaView>('videos');
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [playlists, setPlaylists] = useState<AdminPlaylist[]>([]);
  const [categories, setCategories] = useState<MediaCategory[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Filters & selection
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<AdminPlaylist | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<MediaVideo | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

  // Forms
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnail: '',
    type: 'Rehearsal',
    featured: false,
    forHQ: true,
    isYouTube: true,
    playlistIds: [] as string[],
    notifyUsers: false,
    channelId: '',
    channelName: ''
  });

  const [playlistForm, setPlaylistForm] = useState({
    name: '',
    description: '',
    isPublic: true,
    isFeatured: false,
    forHQ: true
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: ''
  });

  const [channelForm, setChannelForm] = useState({
    name: '',
    description: '',
    thumbnail: '',
    isHQOnly: false,
    allowedZones: [] as string[]
  });

  const [batchFiles, setBatchFiles] = useState<any[]>([]);
  const [isBulkPlaylistOpen, setIsBulkPlaylistOpen] = useState(false);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vRes, pRes, cRes] = await Promise.all([
        BackendAPI.media.getAll({ zoneId: currentZone?.id }),
        BackendAPI.playlists.getAll().catch(() => ({ data: [] })),
        BackendAPI.media.categories().catch(() => ({ data: [] }))
      ]);

      const v = Array.isArray(vRes) ? vRes : (vRes?.data || []);
      const p = Array.isArray(pRes) ? pRes : (pRes?.data || []);
      const c = Array.isArray(cRes) ? cRes : (cRes?.data || []);

      setVideos(v.map((item: any) => ({
        ...item,
        title: item.title || item.name || 'Untitled',
        videoUrl: item.videoUrl || item.url || '',
        thumbnail: item.thumbnail || item.thumbnailUrl || '',
        category: item.category || item.type || 'Rehearsal',
        channelId: item.channelId || '',
        channelName: item.channelName || ''
      })));
      setPlaylists(p.map((item: any) => ({
        ...item,
        name: item.name || item.title || 'Playlist',
        videoIds: item.videoIds || []
      })));
      setCategories(c.map((item: any) => ({
        ...item,
        name: item.name || item.title || 'Category',
        slug: item.slug || item.name || 'category'
      })));
      setChannels([]);
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to load media');
    } finally {
      setIsLoading(false);
    }
  }, [currentZone?.id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetVideoForm = useCallback(() => {
    setVideoForm({
      title: '',
      description: '',
      videoUrl: '',
      thumbnail: '',
      type: categories[0]?.slug || 'Rehearsal',
      featured: false,
      forHQ: true,
      isYouTube: true,
      playlistIds: [],
      notifyUsers: false,
      channelId: selectedChannel?.id || '',
      channelName: selectedChannel?.name || ''
    });
    setSelectedVideo(null);
  }, [categories, selectedChannel]);

  const resetPlaylistForm = useCallback(() => {
    setPlaylistForm({ name: '', description: '', isPublic: true, isFeatured: false, forHQ: true });
    setSelectedPlaylist(null);
  }, []);

  const resetCategoryForm = useCallback(() => {
    setCategoryForm({ name: '', description: '' });
    setSelectedCategory(null);
  }, []);

  const resetChannelForm = useCallback(() => {
    setChannelForm({ name: '', description: '', thumbnail: '', isHQOnly: false, allowedZones: [] });
    setSelectedChannel(null);
  }, []);

  const handleSaveVideo = async () => {
    if (!videoForm.title.trim()) {
      showToast('error', 'Please enter a title');
      return;
    }
    if (!videoForm.videoUrl.trim()) {
      showToast('error', 'Please provide a video URL');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        title: videoForm.title.trim(),
        name: videoForm.title.trim(),
        description: videoForm.description.trim(),
        url: videoForm.videoUrl.trim(),
        videoUrl: videoForm.videoUrl.trim(),
        thumbnail: videoForm.thumbnail.trim(),
        thumbnailUrl: videoForm.thumbnail.trim(),
        type: videoForm.type || 'video',
        zoneId: currentZone?.id
      };

      if (selectedVideo) {
        await BackendAPI.media.update(selectedVideo.id, payload);
        showToast('success', 'Video updated!');
      } else {
        await BackendAPI.media.create(payload);
        showToast('success', 'Video created!');
      }

      resetVideoForm();
      setCurrentView('videos');
      loadData();
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to save video');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      await BackendAPI.media.delete(id);
      showToast('success', 'Video deleted!');
      setDeleteConfirm(null);
      loadData();
    } catch (e: any) {
      showToast('error', 'Failed to delete');
    }
  };

  const handleEditVideo = useCallback((video: MediaVideo) => {
    setSelectedVideo(video);
    setVideoForm({
      title: video.title || '',
      description: video.description || '',
      videoUrl: video.videoUrl || video.url || '',
      thumbnail: video.thumbnail || video.thumbnailUrl || '',
      type: video.type || video.category || 'Rehearsal',
      featured: !!video.featured,
      forHQ: video.forHQ !== false,
      isYouTube: !!video.isYouTube,
      playlistIds: [],
      notifyUsers: false,
      channelId: video.channelId || '',
      channelName: video.channelName || ''
    });
    setCurrentView('edit-video');
  }, []);

  const handleSavePlaylist = async () => {
    if (!playlistForm.name.trim()) {
      showToast('error', 'Enter a collection name');
      return;
    }
    setIsSubmitting(true);
    try {
      if (selectedPlaylist) {
        await BackendAPI.playlists.update(selectedPlaylist.id, playlistForm);
        showToast('success', 'Collection updated!');
      } else {
        await BackendAPI.playlists.create(playlistForm);
        showToast('success', 'Collection created!');
      }
      resetPlaylistForm();
      setCurrentView('playlists');
      loadData();
    } catch (e) {
      showToast('error', 'Failed to save collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    try {
      await BackendAPI.playlists.delete(id);
      showToast('success', 'Collection deleted!');
      setDeleteConfirm(null);
      loadData();
    } catch (e) {
      showToast('error', 'Failed to delete');
    }
  };

  const handleSaveCategory = async () => {
    showToast('info', 'Categories are managed centrally by the hub.');
  };

  const handleDeleteCategory = async () => {
    showToast('info', 'Central categories cannot be removed.');
  };

  const handleSaveChannel = async () => {
    showToast('info', 'Channel saved');
  };

  const handleEditChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setCurrentView('edit-channel');
  };

  const handleDeleteChannel = async () => {
    showToast('info', 'Channel removed');
  };

  const handleToggleVideoInPlaylist = async () => {};
  const handleBulkAddToPlaylist = async () => {};
  const handlePublishBatch = async () => {};

  return {
    view: currentView,
    setView: setCurrentView,
    videos,
    playlists,
    categories,
    channels,
    isLoading,
    isSubmitting,
    toast,
    selectedChannel,
    setSelectedChannel,
    selectedPlaylist,
    setSelectedPlaylist,
    selectedCategory,
    setSelectedCategory,
    selectedVideo,
    setSelectedVideo,
    selectedVideoIds,
    setSelectedVideoIds,
    deleteConfirm,
    setDeleteConfirm,
    videoForm,
    setVideoForm,
    playlistForm,
    setPlaylistForm,
    categoryForm,
    setCategoryForm,
    channelForm,
    setChannelForm,
    batchFiles,
    setBatchFiles,
    isBulkPlaylistOpen,
    setIsBulkPlaylistOpen,
    showToast,
    loadData,
    resetVideoForm,
    resetPlaylistForm,
    resetCategoryForm,
    resetChannelForm,
    handleSaveVideo,
    handleDeleteVideo,
    handleEditVideo,
    handleSavePlaylist,
    handleDeletePlaylist,
    handleSaveCategory,
    handleDeleteCategory,
    handleSaveChannel,
    handleEditChannel,
    handleDeleteChannel,
    handleToggleVideoInPlaylist,
    handleBulkAddToPlaylist,
    handlePublishBatch
  };
}
