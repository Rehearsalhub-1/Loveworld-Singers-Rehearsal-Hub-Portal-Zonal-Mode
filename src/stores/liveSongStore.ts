import { create } from 'zustand';
import { BackendAPI } from '@/lib/api-client';
import { useZoneStore } from '@/stores/zoneStore';
import { useAuthStore } from '@/stores/authStore';

export interface LiveSong {
  id: string;
  title: string;
  subtitle?: string;
  leadSinger?: string;
  writer?: string;
  conductor?: string;
  category?: string;
  categories?: string[];
  audioFile?: string;
  audioUrl?: string;
  audioUrls?: Record<string, string>;
  lyrics?: string;
  solfas?: string;
  notation?: string;
  key?: string;
  tempo?: string;
  isActive?: boolean;
  isLive?: boolean;
  status?: string;
  [key: string]: any;
}

export function isLiveSong(s: any): boolean {
  if (!s || typeof s !== 'object' || isSongExplicitlyOff(s)) return false;

  const status = s.status ? String(s.status).toLowerCase().trim() : '';
  if (status === 'live') {
    return s.isActive !== false && s.is_active !== false && s.isLive !== false && s.live !== false;
  }

  const isTruthy = (v: any) =>
    v === true || v === 1 || v === '1' || (typeof v === 'string' && (v.toLowerCase() === 'true' || v.toLowerCase() === 'live'));

  return Boolean(isTruthy(s.isLive) || isTruthy(s.live) || isTruthy(s.is_live) || isTruthy(s.isActive) || isTruthy(s.is_active));
}

export function isSongExplicitlyOff(s: any): boolean {
  if (!s || typeof s !== 'object') return false;
  const status = s.status ? String(s.status).toLowerCase().trim() : '';
  if (status === 'inactive' || status === 'ended' || status === 'off' || status === 'stopped') {
    return true;
  }

  const isFalsy = (v: any) =>
    v === false || v === 0 || v === '0' || (typeof v === 'string' && (v.toLowerCase() === 'false' || v.toLowerCase() === 'off' || v.toLowerCase() === 'inactive'));

  if (s.isActive !== undefined && isFalsy(s.isActive) && status !== 'live') return true;
  if (s.is_active !== undefined && isFalsy(s.is_active) && status !== 'live') return true;
  if (s.isLive !== undefined && isFalsy(s.isLive) && status !== 'live') return true;
  return false;
}

function resolveSongAudioUrl(song: any): string {
  if (!song) return '';
  if (song.audioFile && typeof song.audioFile === 'string' && song.audioFile.trim()) return song.audioFile.trim();
  if (song.audioUrl && typeof song.audioUrl === 'string' && song.audioUrl.trim()) return song.audioUrl.trim();
  if (song.audioUrls && typeof song.audioUrls === 'object') {
    return song.audioUrls.full || song.audioUrls.lead || Object.values(song.audioUrls)[0] || '';
  }
  return '';
}

function getCurrentUserContext() {
  try {
    const currentZone = useZoneStore.getState().currentZone;
    const profile = useAuthStore.getState().profile;
    const zoneId = currentZone?.id || profile?.zoneId || null;
    const isHQ = Boolean(
      profile?.role && ['hq_admin', 'boss', 'admin', 'president', 'director'].includes(profile.role.toLowerCase())
    );
    return { zoneId, isHQ };
  } catch {
    return { zoneId: null, isHQ: false };
  }
}

function isSongForUserZone(song: any, userCtx: { zoneId: string | null; isHQ: boolean }): boolean {
  if (userCtx.isHQ || !song || typeof song !== 'object') return true;
  const songZone = song.organizationId || song.zoneId || song.audioUrls?._liveZoneId || null;
  if (song.scope === 'global' || songZone === 'all' || songZone === 'global') return true;
  if (userCtx.zoneId && songZone) {
    const normSong = String(songZone).trim().toLowerCase();
    const normUser = String(userCtx.zoneId).trim().toLowerCase();
    if (normSong !== normUser && normSong !== 'all' && normSong !== 'global') {
      return false;
    }
  }
  return true;
}

interface LiveSongStore {
  activeSongs: LiveSong[];
  isLoading: boolean;
  hasInitialFetched: boolean;
  setActiveSongs: (songs: LiveSong[]) => void;
  handleSongUpdate: (rawUpdate: any) => void;
  removeSong: (songId: string) => void;
  fetchActiveSongs: (zoneId?: string) => Promise<void>;
}

export const useLiveSongStore = create<LiveSongStore>((set, get) => ({
  activeSongs: [],
  isLoading: false,
  hasInitialFetched: false,

  setActiveSongs: (songs: LiveSong[]) => {
    const rawList = Array.isArray(songs) ? songs : [];
    const liveOnly = rawList.filter(isLiveSong);
    if (liveOnly.length === 0) {
      set({ activeSongs: [] });
      return;
    }

    liveOnly.sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });

    set({ activeSongs: liveOnly });
  },

  removeSong: (songId: string) => {
    set((state) => ({
      activeSongs: state.activeSongs.filter((s) => String(s.id) !== String(songId)),
    }));
  },

  handleSongUpdate: (rawUpdate: any) => {
    const update = (rawUpdate as any)?.data || rawUpdate;
    if (!update || typeof update !== 'object') return;
    const songId = String(update.id || update._id || '');
    if (!songId) return;

    const userCtx = getCurrentUserContext();
    const existingIndex = get().activeSongs.findIndex((s) => String(s.id) === songId);

    if (!isSongForUserZone(update, userCtx)) {
      if (existingIndex >= 0) get().removeSong(songId);
      return;
    }

    if (update.deleted || update.isDeleted || update._action === 'removed') {
      get().removeSong(songId);
      return;
    }

    const statusStr = update.status ? String(update.status).toLowerCase().trim() : '';
    const hasLiveDisabledFlag =
      update.isActive === false || update.is_active === false || update.isLive === false || update.live === false;
    const isNonLiveStatus = statusStr !== '' && statusStr !== 'live';

    if (isSongExplicitlyOff(update) || hasLiveDisabledFlag || isNonLiveStatus) {
      if (existingIndex >= 0) get().removeSong(songId);
      return;
    }

    if (isLiveSong(update)) {
      set((state) => {
        const idx = state.activeSongs.findIndex((s) => String(s.id) === songId);
        const resolvedAudioUrl = resolveSongAudioUrl(update);

        if (idx >= 0) {
          const next = [...state.activeSongs];
          next[idx] = {
            ...next[idx],
            ...update,
            isActive: true,
            isLive: true,
            status: 'live',
            audioFile: resolvedAudioUrl || next[idx].audioFile || next[idx].audioUrl,
            audioUrl: resolvedAudioUrl || next[idx].audioUrl,
          };
          return { activeSongs: next, hasInitialFetched: true };
        }

        const newSong: LiveSong = {
          id: songId,
          title: update.title || 'Live Rehearsal Song',
          subtitle: update.leadSinger || update.writer || 'Loveworld Singers',
          leadSinger: update.leadSinger || 'Loveworld Singers',
          writer: update.writer || '',
          conductor: update.conductor || '',
          category: update.category || '',
          audioFile: resolvedAudioUrl,
          audioUrl: resolvedAudioUrl,
          audioUrls: update.audioUrls,
          isActive: true,
          isLive: true,
          status: 'live',
          ...update,
        };

        const cleaned = state.activeSongs.filter((s) => String(s.id) !== songId);
        return { activeSongs: [newSong, ...cleaned], hasInitialFetched: true };
      });
      return;
    }

    if (existingIndex >= 0) {
      set((state) => {
        const next = [...state.activeSongs];
        const idx = next.findIndex((s) => String(s.id) === songId);
        if (idx >= 0) {
          next[idx] = { ...next[idx], ...update };
          return { activeSongs: next };
        }
        return state;
      });
    }
  },

  fetchActiveSongs: async (zoneId?: string) => {
    try {
      set({ isLoading: true });
      const userCtx = getCurrentUserContext();
      const targetZone = zoneId || userCtx.zoneId;

      let rawData: any[] = [];
      const res: any = await BackendAPI.songs.active(targetZone ? { zoneId: targetZone } : undefined).catch(() => null);
      if (res?.success && Array.isArray(res.data)) {
        rawData = res.data;
      } else if (Array.isArray(res)) {
        rawData = res;
      }

      const seenIds = new Set<string>();
      const prepped: LiveSong[] = [];

      for (const s of rawData) {
        if (!s || !s.id) continue;
        const idStr = String(s.id);
        if (seenIds.has(idStr)) continue;
        seenIds.add(idStr);

        if (!isSongForUserZone(s, userCtx)) continue;

        if (!isSongExplicitlyOff(s) && isLiveSong(s)) {
          const resolvedAudioUrl = resolveSongAudioUrl(s);
          prepped.push({
            ...s,
            id: idStr,
            isLive: true,
            isActive: true,
            status: 'live',
            audioFile: resolvedAudioUrl || s.audioFile || s.audioUrl,
            audioUrl: resolvedAudioUrl || s.audioUrl,
          });
        }
      }

      set({
        activeSongs: prepped,
        isLoading: false,
        hasInitialFetched: true,
      });
    } catch {
      set({ isLoading: false, hasInitialFetched: true });
    }
  },
}));
