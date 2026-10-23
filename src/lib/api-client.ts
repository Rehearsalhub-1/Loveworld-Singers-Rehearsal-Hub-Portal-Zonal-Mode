const rawUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
export const BASE_URL = (!rawUrl || rawUrl.includes('vercel.app'))
  ? 'https://rehearsalhub-api-production-6a17.up.railway.app'
  : rawUrl.replace(/\/+$/, '').replace(/\/api$/, '');

const API_KEY = (process.env.NEXT_PUBLIC_INTERNAL_API_KEY || 'lwsrh_production_secure_api_key_2026_x9z2').trim();

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lwsrh_access_token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lwsrh_refresh_token');
}

function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  const direct = localStorage.getItem('lwsrh_user_id');
  if (direct) return direct;
  const token = getAccessToken();
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.sub) return String(payload.sub);
        if (payload.userId) return String(payload.userId);
        if (payload.id) return String(payload.id);
      }
    } catch {}
  }
  return null;
}

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function notifySessionExpired(): void {
  sessionExpiredListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('[apiClient] Session expired listener error:', e);
    }
  });
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
    window.location.replace('/auth');
  }
}

let _refreshPromise: Promise<string> | null = null;

export async function refreshSession(): Promise<string> {
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      const userId = getUserId();

      if (!refreshToken) {
        notifySessionExpired();
        throw new Error('Session expired');
      }

      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({ refreshToken, userId }),
      });

      if (res.status === 401 || res.status === 403) {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('lwsrh_access_token');
          localStorage.removeItem('lwsrh_refresh_token');
          localStorage.setItem('lwsrh_has_user', 'false');
          if (typeof document !== 'undefined') {
            document.cookie = 'lwsrh_is_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          }
        }
        notifySessionExpired();
        throw new Error('Session expired');
      }

      if (!res.ok) {
        throw new Error(`Server temporarily unavailable (${res.status})`);
      }

      const body = await res.json();
      const tokenData = body?.data || body;
      if (tokenData?.accessToken) {
        const newAccess = tokenData.accessToken;
        const newRefresh = tokenData.refreshToken || refreshToken;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('lwsrh_access_token', newAccess);
          localStorage.setItem('lwsrh_refresh_token', newRefresh);
          if (tokenData.user?.id) {
            localStorage.setItem('lwsrh_user_id', tokenData.user.id);
          }
          if (typeof document !== 'undefined') {
            document.cookie = 'lwsrh_is_logged_in=true; path=/; max-age=31536000; SameSite=Lax';
          }
        }
        return newAccess;
      }
      throw new Error('Invalid refresh response');
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

type Params = Record<string, string | number | boolean | undefined | null>;

/** Build a query string, skipping empty values. */
export function qs(params?: Params): string {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

function buildHeaders(extra: Record<string, string> = {}, json = true): Record<string, string> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'x-api-key': API_KEY,
    ...extra,
  };
  if (json && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (token && !headers['Authorization']) headers['Authorization'] = `Bearer ${token}`;

  // Attach active tenant scope headers (synchronous, matching mobile app)
  if (typeof window !== 'undefined') {
    try {
      const savedZone = localStorage.getItem('lwsrh_current_zone') || localStorage.getItem('lwsrh-zone-storage');
      if (savedZone) {
        const parsed = JSON.parse(savedZone);
        const z = parsed?.state?.currentZone || parsed;
        const zId = String(z?.id || '').toLowerCase();
        const zReg = String(z?.region || '').toLowerCase();
        const isHqZone = Boolean(z?.isHq) || zReg === 'headquarters' || zId.includes('001') || zId === 'hq' || zId === 'global' || zId === 'zone-boss';

        if (z?.id && !isHqZone) {
          headers['x-zone-id'] = String(z.id);
          headers['x-selected-zone-id'] = String(z.id);
        }
        if (z?.invitationCode || z?.code) {
          headers['x-zone-code'] = String(z.invitationCode || z.code);
        }
        headers['x-scope'] = isHqZone ? 'global' : 'zone';
      }
    } catch {}
  }

  return headers;
}

// ── In-Memory API Cache & ETag Store (matching mobile app architecture) ────
interface CacheEntry {
  data: any;
  timestamp: number;
}
const apiGetCache = new Map<string, CacheEntry>();
const etagStore = new Map<string, string>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — safe because WebSocket handles real-time updates

function shouldCacheEndpoint(endpoint: string): boolean {
  if (
    endpoint.includes('/songs/active') ||
    endpoint.includes('/schedules') ||
    endpoint.includes('/chats') ||
    endpoint.includes('/messages') ||
    endpoint.includes('/notes') ||
    endpoint.includes('/annotations') ||
    endpoint.includes('/attendance') ||
    endpoint.includes('/live_song') ||
    endpoint.includes('/statuses') ||
    endpoint.includes('/notifications') ||
    endpoint.includes('/auth') ||
    endpoint.includes('/kingschat')
  ) {
    return false;
  }
  return true;
}

export function clearApiCache(): void {
  apiGetCache.clear();
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `Request failed (${response.status})` }));
    throw new Error(error.error || error.message || `API Error: ${response.status}`);
  }
  return response.json();
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retried = false
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (method === 'GET' && shouldCacheEndpoint(cleanEndpoint)) {
    const cached = apiGetCache.get(cleanEndpoint);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data as T;
    }
  }

  const headers = buildHeaders((options.headers as Record<string, string>) || {});

  if (method === 'GET' && shouldCacheEndpoint(cleanEndpoint)) {
    const storedEtag = etagStore.get(cleanEndpoint);
    if (storedEtag) {
      headers['If-None-Match'] = storedEtag;
    }
  }

  const controller = new AbortController();
  const timeoutMs = cleanEndpoint.includes('/upload') ? 60000 : 12000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal || controller.signal;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${cleanEndpoint}`, {
      ...options,
      method,
      headers,
      signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 304 && method === 'GET') {
    const cached = apiGetCache.get(cleanEndpoint);
    if (cached) return cached.data as T;
  }

  const isAuthRoute =
    cleanEndpoint.startsWith('/auth/login') ||
    cleanEndpoint.startsWith('/auth/register') ||
    cleanEndpoint.startsWith('/auth/refresh') ||
    cleanEndpoint.startsWith('/auth/kingschat');

  if (response.status === 401 && !isAuthRoute && !retried) {
    try {
      const newToken = await refreshSession();
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };
      return await apiFetch<T>(
        cleanEndpoint,
        {
          ...options,
          headers: retryHeaders,
        },
        true
      );
    } catch (refreshErr) {
      console.warn('[apiClient] Session refresh failed:', refreshErr);
      throw refreshErr;
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `Request failed (${response.status})` }));
    throw new Error(error.error || error.message || `API Error: ${response.status}`);
  }

  if (method === 'GET' && response.status === 200 && shouldCacheEndpoint(cleanEndpoint)) {
    const etag = response.headers.get('ETag');
    if (etag) etagStore.set(cleanEndpoint, etag);
  }

  const data = await response.json();

  if (method !== 'GET') {
    apiGetCache.clear();
  } else if (shouldCacheEndpoint(cleanEndpoint)) {
    apiGetCache.set(cleanEndpoint, { data, timestamp: Date.now() });
  }

  return data;
}

/** Multipart upload (files). Never set Content-Type; the browser adds the boundary. */
export async function apiUpload<T = any>(endpoint: string, form: FormData, authed = true): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const headers = buildHeaders({}, false);
  if (!authed) delete headers['Authorization'];
  const response = await fetch(`${BASE_URL}${cleanEndpoint}`, { method: 'POST', headers, body: form });
  apiGetCache.clear();
  return handle<T>(response);
}

/** Unwrap `{ success, data }` or a bare array/object into the payload. */
export function unwrap<T = any>(res: any, fallback: T = [] as any): T {
  if (res == null) return fallback;
  if (Array.isArray(res)) return res as any;
  if (res.data !== undefined) return res.data;
  return res;
}

// ── Realtime (API WebSocket at /ws with Resource Aliases) ───────────────────
type RealtimeHandler = (data: any, event: { sequence?: number; resource: string; id: string }) => void;

// Map aliases so screens subscribing to 'songs' receive 'song', 'chats' receives 'messages', etc.
const RESOURCE_ALIASES: Record<string, string[]> = {
  chat: ['chats', 'messages', 'chat_deleted', 'chat_cleared', 'message_reaction', 'message_receipt'],
  chats: ['chat', 'messages', 'chat_deleted', 'chat_cleared', 'message_reaction', 'message_receipt'],
  messages: ['chat', 'chats', 'message_reaction', 'message_receipt'],
  call: ['calls', 'incoming_call', 'call_status', 'call_signal'],
  calls: ['call'],
  song: ['songs', 'live_song', 'live_songs'],
  songs: ['song', 'live_song', 'live_songs'],
  live_song: ['live_songs', 'song', 'songs'],
  live_songs: ['live_song', 'song', 'songs'],
  schedule: ['schedules'],
  schedules: ['schedule'],
  praise_night: ['praise_nights'],
  praise_nights: ['praise_night'],
  program: ['programs'],
  programs: ['program'],
  submitted_song: ['submitted_songs'],
  submitted_songs: ['submitted_song'],
  annotation: ['annotations'],
  annotations: ['annotation'],
};

function matchesResource(subscribedResource: string, incomingResource: string): boolean {
  if (subscribedResource === incomingResource) return true;
  const aliases = RESOURCE_ALIASES[subscribedResource];
  return !!aliases && aliases.includes(incomingResource);
}

const wsHandlers = new Map<string, Set<RealtimeHandler>>();
let ws: WebSocket | null = null;
let wsOpen = false;
let wsRetry = 0;
let wsPing: ReturnType<typeof setInterval> | null = null;
let wsReconnect: ReturnType<typeof setTimeout> | null = null;
let wsLastSeq = 0;

function wsUrl(token: string) {
  return `${BASE_URL.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token)}`;
}

function wsSend(msg: any) {
  if (ws && wsOpen) ws.send(JSON.stringify(msg));
}

function wsConnect() {
  if (typeof window === 'undefined' || ws || wsHandlers.size === 0) return;
  const token = getAccessToken();
  if (!token) return;
  ws = new WebSocket(wsUrl(token));
  ws.onopen = () => {
    wsOpen = true;
    wsRetry = 0;
    wsHandlers.forEach((_, key) => {
      const [resource, ...rest] = key.split(':');
      wsSend({ type: 'subscribe', resource, id: rest.join(':'), since: wsLastSeq });
      // Also register any aliases with server
      const aliases = RESOURCE_ALIASES[resource] || [];
      aliases.forEach(alias => {
        wsSend({ type: 'subscribe', resource: alias, id: rest.join(':'), since: wsLastSeq });
      });
    });
    wsPing = setInterval(() => wsSend({ type: 'ping' }), 25000);
  };
  ws.onmessage = (e) => {
    let msg: any;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.type === 'pong') return;
    if (msg.type !== 'event') return;
    if (typeof msg.sequence === 'number') wsLastSeq = Math.max(wsLastSeq, msg.sequence);
    const ev = { sequence: msg.sequence, resource: msg.resource, id: msg.id };

    // Invalidate cached GET queries when relevant server push events arrive
    if (msg.resource === 'songs' || msg.resource === 'song' || msg.resource === 'live_song' || msg.resource === 'live_songs') {
      for (const k of apiGetCache.keys()) {
        if (k.includes('/songs')) apiGetCache.delete(k);
      }
    } else if (msg.resource === 'praise_nights' || msg.resource === 'praise_night') {
      for (const k of apiGetCache.keys()) {
        if (k.includes('/praise-night') || k.includes('/rehearsal')) apiGetCache.delete(k);
      }
    } else if (msg.resource === 'program' || msg.resource === 'programs') {
      for (const k of apiGetCache.keys()) {
        if (k.includes('/programs') || k.includes('/calendar')) apiGetCache.delete(k);
      }
    }

    // Broadcast to matching subscribers with resource and ID alias resolution
    wsHandlers.forEach((handlers, key) => {
      const [resource, ...rest] = key.split(':');
      const subId = rest.join(':');
      if (matchesResource(resource, msg.resource)) {
        let idMatch = false;
        if (subId === 'all' || msg.id === 'all' || subId === msg.id) {
          idMatch = true;
        } else {
          const payload = (msg.data as any)?.data || msg.data;
          const payloadId = payload?.id || payload?._id;
          if (payloadId && String(payloadId) === String(subId)) {
            idMatch = true;
          }
        }
        if (idMatch) {
          handlers.forEach((h) => {
            try { h(msg.data, ev); } catch (err) { console.warn('WS handler error:', err); }
          });
        }
      }
    });
  };
  const teardown = () => {
    wsOpen = false;
    ws = null;
    if (wsPing) { clearInterval(wsPing); wsPing = null; }
    if (wsHandlers.size > 0 && !wsReconnect) {
      const delay = Math.min(30000, 1000 * 2 ** wsRetry++);
      wsReconnect = setTimeout(() => { wsReconnect = null; wsConnect(); }, delay);
    }
  };
  ws.onclose = teardown;
  ws.onerror = () => ws?.close();
}

const realtime = {
  /** Subscribe to API push events. Returns an unsubscribe function. */
  subscribe: (resource: string, id: string, handler: RealtimeHandler) => {
    const key = `${resource}:${id}`;
    let set = wsHandlers.get(key);
    if (!set) { set = new Set(); wsHandlers.set(key, set); }
    const isNew = set.size === 0;
    set.add(handler);
    if (ws && wsOpen) {
      if (isNew) {
        wsSend({ type: 'subscribe', resource, id, since: 0 });
        const aliases = RESOURCE_ALIASES[resource] || [];
        aliases.forEach(alias => wsSend({ type: 'subscribe', resource: alias, id, since: 0 }));
      }
    } else {
      wsConnect();
    }
    return () => {
      const s = wsHandlers.get(key);
      if (!s) return;
      s.delete(handler);
      if (s.size === 0) {
        wsHandlers.delete(key);
        wsSend({ type: 'unsubscribe', resource, id });
        const aliases = RESOURCE_ALIASES[resource] || [];
        aliases.forEach(alias => wsSend({ type: 'unsubscribe', resource: alias, id }));
      }
      if (wsHandlers.size === 0 && ws) { ws.close(); ws = null; wsOpen = false; }
    };
  },
  /** Send a live event (zone/church-scoped by the server). */
  broadcast: (resource: string, id: string, data: any) => wsSend({ type: 'broadcast', resource, id, data }),
  /** Relay a call signal to a specific user. */
  callSignal: (targetUserId: string, signal: any) => wsSend({ type: 'call:signal', targetUserId, signal }),
  setContext: (ctx: { zoneId?: string; churchId?: string }) => wsSend({ type: 'set_context', ...ctx }),
  /** Drop the socket (call on logout). */
  disconnect: () => {
    wsHandlers.clear();
    if (wsReconnect) { clearTimeout(wsReconnect); wsReconnect = null; }
    if (ws) { ws.close(); ws = null; wsOpen = false; }
  },
};

const json = (body: any) => JSON.stringify(body ?? {});
const get = <T = any>(path: string, params?: Params) => apiFetch<T>(`${path}${qs(params)}`);
const post = <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: 'POST', body: json(body) });
const patch = <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: 'PATCH', body: json(body) });
const put = <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: 'PUT', body: json(body) });
const del = <T = any>(path: string, params?: Params, body?: any) =>
  apiFetch<T>(`${path}${qs(params)}`, { method: 'DELETE', ...(body !== undefined ? { body: json(body) } : {}) });

export const BackendAPI = {
  realtime,

  // ── Admin Dashboard ────────────────────────────────────────────────────────
  admin: {
    dashboardStats: (params?: Params) => get('/admin/dashboard/stats', params),
  },

  // ── Auth ───────────────────────────────────────────────────────────────────
  auth: {
    login: (data: { email?: string; username?: string; identifier?: string; password: string }) => post('/auth/login', data),
    register: (data: any) => post('/auth/register', data),
    me: () => get('/auth/me'),
    refresh: (refreshToken: string, userId?: string) => post('/auth/refresh', { refreshToken, userId }),
    logout: (refreshToken: string) => post('/auth/logout', { refreshToken }),
    kingsChatLogin: (data: any) => post('/auth/kingschat-login', data),
    sendResetOtp: (data: any) => post('/auth/forgot-password/send-otp', data),
    verifyResetOtp: (data: any) => post('/auth/forgot-password/verify-otp', data),
    resetPassword: (data: any) => post('/auth/reset-password', data),
    deleteAccount: () => del('/auth/delete-account'),
  },

  // ── Profiles ───────────────────────────────────────────────────────────────
  profiles: {
    getAll: (params?: Params) => get('/profiles', params),
    directory: (params?: Params) => get('/profiles/directory', params),
    birthdays: (params?: Params) => get('/profiles/birthdays', params),
    checkUsername: (username: string) => get(`/profiles/check-username/${encodeURIComponent(username)}`),
    get: (userId: string) => get(`/profiles/${userId}`),
    getById: (userId: string) => get(`/profiles/${userId}`),
    update: (userId: string, data: any) => patch(`/profiles/${userId}`, data),
    setPassword: (userId: string, data: any) => post(`/profiles/${userId}/password`, data),
    removeFromZone: (userId: string, data?: any) => post(`/profiles/${userId}/remove-from-zone`, data),
    delete: (userId: string) => del(`/profiles/${userId}`),
  },

  // ── Zones / Organizations ──────────────────────────────────────────────────
  zones: {
    getAll: () => get('/zones'),
    getById: (zoneId: string) => get(`/zones/${zoneId}`),
    create: (data: any) => post('/zones', data),
    update: (zoneId: string, data: any) => patch(`/zones/${zoneId}`, data),
    members: (zoneId: string) => get(`/zones/${zoneId}/members`),
  },

  // ── Members ────────────────────────────────────────────────────────────────
  members: {
    getAll: (params?: Params) => get('/members', params),
    mine: () => get('/members/mine'),
    byUser: (userId: string) => get(`/members/by-user/${userId}`),
    hq: (params?: Params) => get('/members/hq', params),
    byZone: (zoneId: string, params?: Params) => get(`/members/zone/${zoneId}`, params),
    joinZone: (data: any) => post('/members/zone-join', data),
    leaveZone: (data: any) => post('/members/zone-leave', data),
    update: (userId: string, data: any) => patch(`/members/${userId}`, data),
    removeZoneMembership: (membershipId: string) => del(`/members/zone/${membershipId}`),
    delete: (id: string) => del(`/members/${id}`),
  },

  // ── Songs (zone / praise-night songs, history, notes, annotations) ─────────
  songs: {
    getAll: (params?: Params) => get('/songs', params),
    search: (params?: Params) => get('/songs/search', params),
    universalSearch: (params?: Params) => get('/songs/universal-search', params),
    praiseNight: (params?: Params) => get('/songs/praise-night', params),
    zone: (params?: Params) => get('/songs/zone', params),
    zoneSongs: (params?: Params) => get('/songs/zone-songs', params),
    active: (params?: Params) => get('/songs/active', params),
    master: (params?: Params) => get('/songs/master', params),
    masterById: (id: string) => get(`/songs/master/${id}`),
    ministered: (params?: Params) => get('/songs/ministered', params),
    ministeredById: (id: string) => get(`/songs/ministered/${id}`),
    getById: (id: string) => get(`/songs/${id}`),
    create: (data: any) => post('/songs', data),
    update: (id: string, data: any) => patch(`/songs/${id}`, data),
    updateStatus: (id: string, data: any) => patch(`/songs/${id}/status`, data),
    updatePraiseNightSong: (id: string, data: any) => patch(`/songs/praise-night/${id}`, data),
    updatePraiseNightSongStatus: (id: string, data: any) => patch(`/songs/praise-night/${id}/status`, data),
    delete: (id: string) => del(`/songs/${id}`),
    importFromMinistered: (data: any) => post('/songs/import-from-ministered', data),
    importToMaster: (data: any) => post('/songs/import-to-master', data),
    history: {
      list: (params?: Params) => get('/songs/history', params),
      bySong: (songId: string) => get(`/songs/${songId}/history`),
      create: (data: any) => post('/songs/history', data),
      update: (id: string, data: any) => patch(`/songs/history/${id}`, data),
      delete: (id: string) => del(`/songs/history/${id}`),
    },
    notes: {
      get: (songId: string) => get(`/songs/notes/${songId}`),
      update: (songId: string, data: any) => patch(`/songs/notes/${songId}`, data),
    },
    annotations: {
      get: (songId: string) => get(`/songs/annotations/${songId}`),
      update: (songId: string, data: any) => patch(`/songs/annotations/${songId}`, data),
    },
  },

  // ── Master / ministered songs ──────────────────────────────────────────────
  masterSongs: {
    getAll: (params?: Params) => get('/master-songs', params),
    getById: (id: string) => get(`/master-songs/${id}`),
    create: (data: any) => post('/master-songs', data),
    update: (id: string, data: any) => patch(`/master-songs/${id}`, data),
    delete: (id: string) => del(`/master-songs/${id}`),
  },

  // ── Praise Nights / Programs ───────────────────────────────────────────────
  praiseNights: {
    getAll: (params?: Params) => get('/praise-nights', params),
    getById: (id: string) => get(`/praise-nights/${id}`),
    create: (data: any) => post('/praise-nights', data),
    update: (id: string, data: any) => patch(`/praise-nights/${id}`, data),
    updateStatus: (id: string, data: any) => patch(`/praise-nights/${id}/status`, data),
    duplicate: (id: string, data?: any) => post(`/praise-nights/${id}/duplicate`, data),
    delete: (id: string) => del(`/praise-nights/${id}`),
  },
  programs: {
    getAll: (params?: Params) => get('/programs', params),
    getById: (id: string) => get(`/programs/${id}`),
    create: (data: any) => post('/programs', data),
    update: (id: string, data: any) => patch(`/programs/${id}`, data),
    delete: (id: string) => del(`/programs/${id}`),
  },

  // ── Schedule / Rehearsals ──────────────────────────────────────────────────
  schedule: {
    getAll: (params?: Params) => get('/schedule', params),
    getById: (id: string) => get(`/schedule/${id}`),
    create: (data: any) => post('/schedule', data),
    update: (id: string, data: any) => patch(`/schedule/${id}`, data),
    delete: (id: string, params?: Params) => del(`/schedule/${id}`, params),
  },
  rehearsals: {
    getAll: (params?: Params) => get('/schedule', params),
    getById: (id: string) => get(`/schedule/${id}`),
    create: (data: any) => post('/schedule', data),
    update: (id: string, data: any) => patch(`/schedule/${id}`, data),
    delete: (id: string, params?: Params) => del(`/schedule/${id}`, params),
  },

  // ── Categories ─────────────────────────────────────────────────────────────
  categories: {
    getAll: (params?: Params) => get('/categories', params),
    page: (params?: Params) => get('/categories/page', params),
    zonePage: (params?: Params) => get('/categories/zone-page', params),
    create: (data: any) => post('/categories', data),
    update: (id: string, data: any) => patch(`/categories/${id}`, data),
    delete: (id: string) => del(`/categories/${id}`),
  },

  // ── Submitted songs ────────────────────────────────────────────────────────
  submittedSongs: {
    getAll: (params?: Params) => get('/submitted-songs', params),
    mine: () => get('/submitted-songs/mine'),
    getById: (id: string) => get(`/submitted-songs/${id}`),
    create: (data: any) => post('/submitted-songs', data),
    reply: (id: string, data: any) => post(`/submitted-songs/${id}/reply`, data),
    approve: (id: string, data?: any) => patch(`/submitted-songs/${id}/approve`, data),
    reject: (id: string, data?: any) => patch(`/submitted-songs/${id}/reject`, data),
    update: (id: string, data: any) => patch(`/submitted-songs/${id}`, data),
    delete: (id: string) => del(`/submitted-songs/${id}`),
  },

  // ── Favorites & Playlists ──────────────────────────────────────────────────
  favorites: {
    me: () => get('/favorites/me'),
    add: (data: any) => post('/favorites', data),
    remove: (songId: string) => del(`/favorites/${songId}`),
  },
  playlists: {
    me: () => get('/playlists/me'),
    getAll: (params?: Params) => get('/playlists', params),
    getById: (id: string) => get(`/playlists/${id}`),
    create: (data: any) => post('/playlists', data),
    update: (id: string, data: any) => patch(`/playlists/${id}`, data),
    delete: (id: string) => del(`/playlists/${id}`),
    addSong: (id: string, data: any) => post(`/playlists/${id}/songs`, data),
    removeSong: (id: string, songId: string) => del(`/playlists/${id}/songs/${songId}`),
  },

  // ── Chats ──────────────────────────────────────────────────────────────────
  chats: {
    getAll: (params?: Params) => get('/chats', params),
    getById: (chatId: string) => get(`/chats/${chatId}`),
    create: (data: any) => post('/chats', data),
    update: (chatId: string, data: any) => patch(`/chats/${chatId}`, data),
    delete: (chatId: string) => del(`/chats/${chatId}`),
    messages: (chatId: string, params?: Params) => get(`/chats/${chatId}/messages`, params),
    sendMessage: (chatId: string, data: any) => post(`/chats/${chatId}/messages`, data),
    editMessage: (chatId: string, messageId: string, data: any) => patch(`/chats/${chatId}/messages/${messageId}`, data),
    deleteMessage: (chatId: string, messageId: string) => del(`/chats/${chatId}/messages/${messageId}`),
    clearMessages: (chatId: string) => del(`/chats/${chatId}/messages`),
    react: (chatId: string, messageId: string, data: any) => post(`/chats/${chatId}/messages/${messageId}/reactions`, data),
    messageStatus: (messageId: string, data: any) => patch(`/chats/messages/${messageId}/status`, data),
    typing: (chatId: string, data?: any) => post(`/chats/${chatId}/typing`, data),
    markRead: (chatId: string) => post(`/chats/${chatId}/read`),
    archive: (chatId: string, data?: any) => patch(`/chats/${chatId}/archive`, data),
    leave: (chatId: string) => patch(`/chats/${chatId}/leave`),
    settings: (chatId: string, data: any) => patch(`/chats/${chatId}/settings`, data),
    addParticipants: (chatId: string, data: any) => post(`/chats/${chatId}/participants`, data),
    removeParticipant: (chatId: string, userId: string) => del(`/chats/${chatId}/participants/${userId}`),
    setParticipantRole: (chatId: string, userId: string, data: any) => patch(`/chats/${chatId}/participants/${userId}/role`, data),
    acceptRequest: (chatId: string) => post(`/chats/requests/${chatId}/accept`),
    declineRequest: (chatId: string) => post(`/chats/requests/${chatId}/decline`),
    presence: (userId: string) => get(`/chats/presence/${userId}`),
    setPresence: (data: any) => post('/chats/presence', data),
    blocked: () => get('/chats/users/blocked'),
    block: (data: any) => post('/chats/users/block', data),
    unblock: (userId: string) => del(`/chats/users/block/${userId}`),
  },

  // ── Calls ──────────────────────────────────────────────────────────────────
  calls: {
    getAll: (params?: Params) => get('/calls', params),
    getById: (callId: string) => get(`/calls/${callId}`),
    create: (data: any) => post('/calls', data),
    update: (callId: string, data: any) => patch(`/calls/${callId}`, data),
    delete: (callId: string) => del(`/calls/${callId}`),
    clear: () => del('/calls'),
    livekitToken: (data: any) => post('/livekit-token', data),
  },

  // ── Attendance ─────────────────────────────────────────────────────────────
  attendance: {
    getAll: (params?: Params) => get('/attendance', params),
    mine: (params?: Params) => get('/attendance/mine', params),
    personal: (params?: Params) => get('/attendance/personal', params),
    session: (params?: Params) => get('/attendance/session', params),
    toggleSession: (data: any) => post('/attendance/session/toggle', data),
    checkIn: (data: any) => post('/attendance/check-in', data),
    mark: (data: any) => post('/attendance', data),
    manual: (data: any) => post('/attendance/manual', data),
    update: (id: string, data: any) => patch(`/attendance/${id}`, data),
    delete: (id: string) => del(`/attendance/${id}`),
    getCode: (params?: Params) => get('/attendance/code', params),
    setCode: (data: any) => post('/attendance/code', data),
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  notifications: {
    getAll: (params?: Params) => get('/notifications', params),
    sent: (params?: Params) => get('/notifications/sent', params),
    create: (data: any) => post('/notifications', data),
    send: (data: any) => post('/notifications/send', data),
    broadcast: (data: any) => post('/notifications/broadcast', data),
    markRead: (data: any) => post('/notifications/mark-read', data),
    markAllRead: (data?: any) => post('/notifications/mark-all-read', data),
    update: (id: string, data: any) => patch(`/notifications/${id}`, data),
    markAsRead: (id: string) => patch(`/notifications/${id}`, { read: true, isRead: true }),
    delete: (id: string) => del(`/notifications/${id}`),
  },

  // ── Subscriptions ──────────────────────────────────────────────────────────
  subscriptions: {
    me: () => get('/subscriptions/me'),
    getAll: () => get('/subscriptions'),
    getByUser: (userId: string) => get(`/subscriptions/${userId}`),
    update: (userId: string, data: any) => patch(`/subscriptions/${userId}`, data),
    extend: (userId: string, data?: any) => post(`/subscriptions/${userId}/extend`, data),
    revoke: (userId: string, data?: any) => post(`/subscriptions/${userId}/revoke`, data),
    setStatus: (userId: string, data: any) => post(`/subscriptions/${userId}/status`, data),
    toggleEnforcement: (data?: any) => post('/subscriptions/toggle-enforcement', data),
    cancel: () => post('/subscriptions/cancel'),
  },
  kingspay: {
    initialize: (data: any) => post('/kingspay/initialize', data),
    verify: (data: any) => post('/kingspay/verify', data),
    status: (paymentId: string) => get(`/kingspay/status/${paymentId}`),
  },

  // ── Sub-groups ─────────────────────────────────────────────────────────────
  subgroups: {
    getAll: (params?: Params) => get('/subgroups', params),
    mine: () => get('/subgroups/mine'),
    coordinated: () => get('/subgroups/coordinated'),
    getById: (id: string) => get(`/subgroups/${id}`),
    create: (data: any) => post('/subgroups', data),
    update: (id: string, data: any) => patch(`/subgroups/${id}`, data),
    delete: (id: string) => del(`/subgroups/${id}`),
    requests: () => get('/subgroups/requests'),
    approve: (id: string, data?: any) => post(`/subgroups/${id}/approve`, data),
    reject: (id: string, data?: any) => post(`/subgroups/${id}/reject`, data),
    members: (id: string) => get(`/subgroups/${id}/members`),
    getMembers: (id: string) => get(`/subgroups/${id}/members`),
    addMember: (id: string, data: any) => post(`/subgroups/${id}/members`, data),
    removeMember: (id: string, userId: string) => del(`/subgroups/${id}/members/${userId}`),
    addChurchMember: (subGroupId: string, userId: string, role = 'member') => post('/subgroups/members', { subGroupId, userId, role }),
    removeChurchMember: (subGroupId: string, userId: string) => del('/subgroups/members', { subGroupId, userId }),
    assignCoordinator: (id: string, data: any) => post(`/subgroups/${id}/assign-coordinator`, data),
    addCoordinator: (id: string, data: any) => post(`/subgroups/${id}/coordinators`, data),
    allMembers: (params?: Params) => get('/subgroups/members', params),
    addMemberBulk: (data: any) => post('/subgroups/members', data),
    removeMemberBulk: (params: Params) => del('/subgroups/members', params),
    songs: (params?: Params) => get('/subgroups/songs', params),
    createSong: (data: any) => post('/subgroups/songs', data),
    updateSong: (id: string, data: any) => patch(`/subgroups/songs/${id}`, data),
    deleteSong: (id: string) => del(`/subgroups/songs/${id}`),
    importSongs: (data: any) => post('/subgroups/songs/import', data),
    praiseNights: (params?: Params) => get('/subgroups/praise-nights', params),
    createPraiseNight: (data: any) => post('/subgroups/praise-nights', data),
    updatePraiseNight: (id: string, data: any) => patch(`/subgroups/praise-nights/${id}`, data),
    deletePraiseNight: (id: string) => del(`/subgroups/praise-nights/${id}`),
  },
  churches: {
    getAll: (params?: Params) => get('/subgroups', params),
    mine: () => get('/subgroups/mine'),
    coordinated: () => get('/subgroups/coordinated'),
    getById: (id: string) => get(`/subgroups/${id}`),
    create: (data: any) => post('/subgroups', data),
    update: (id: string, data: any) => patch(`/subgroups/${id}`, data),
    delete: (id: string) => del(`/subgroups/${id}`),
    requests: (params?: Params) => get('/subgroups/requests', params),
    approve: (id: string, data?: any) => post(`/subgroups/${id}/approve`, data),
    reject: (id: string, data?: any) => post(`/subgroups/${id}/reject`, data),
    members: (id: string) => get(`/subgroups/${id}/members`),
    getMembers: (id: string) => get(`/subgroups/${id}/members`),
    addMember: (subGroupId: string, userId: string, role = 'member') => post('/subgroups/members', { subGroupId, userId, role }),
    removeMember: (subGroupId: string, userId: string) => del('/subgroups/members', { subGroupId, userId }),
    addCoordinator: (id: string, data: any) => post(`/subgroups/${id}/coordinators`, data),
  },

  // ── Media ──────────────────────────────────────────────────────────────────
  media: {
    getAll: (params?: Params) => get('/media', params),
    categories: (params?: Params) => get('/media/categories', params),
    getById: (id: string) => get(`/media/${id}`),
    create: (data: any) => post('/media', data),
    update: (id: string, data: any) => patch(`/media/${id}`, data),
    delete: (id: string) => del(`/media/${id}`),
  },
  upload: {
    file: (fileOrForm: File | FormData, folder?: string) => {
      let form: FormData;
      if (typeof FormData !== 'undefined' && fileOrForm instanceof FormData) {
        form = fileOrForm;
      } else {
        form = new FormData();
        form.append('file', fileOrForm as File);
      }
      if (folder) {
        form.append('folder', folder);
      }
      return apiUpload('/upload', form, true);
    },
    publicFile: (fileOrForm: File | FormData, folder?: string) => {
      let form: FormData;
      if (typeof FormData !== 'undefined' && fileOrForm instanceof FormData) {
        form = fileOrForm;
      } else {
        form = new FormData();
        form.append('file', fileOrForm as File);
      }
      if (folder) {
        form.append('folder', folder);
      }
      return apiUpload('/upload/public', form, false);
    },
    fileUrl: (key: string) => `${BASE_URL}/upload/file/${key}`,
  },
  audio: {
    mixKaraoke: (data: any) => post('/audio/mix-karaoke', data),
    bounce: (data: any) => post('/audio/bounce', data),
    trim: (data: any) => post('/audio/trim', data),
  },
  audiolab: {
    projects: () => get('/audiolab/projects'),
    project: (id: string) => get(`/audiolab/projects/${id}`),
    createProject: (data: any) => post('/audiolab/projects', data),
    updateProject: (id: string, data: any) => patch(`/audiolab/projects/${id}`, data),
    deleteProject: (id: string) => del(`/audiolab/projects/${id}`),
    sessions: (projectId: string) => get(`/audiolab/projects/${projectId}/sessions`),
    createSession: (projectId: string, data: any) => post(`/audiolab/projects/${projectId}/sessions`, data),
    updateSession: (sessionId: string, data: any) => patch(`/audiolab/sessions/${sessionId}`, data),
    deleteSession: (sessionId: string) => del(`/audiolab/sessions/${sessionId}`),
  },

  // ── Support tickets ────────────────────────────────────────────────────────
  support: {
    getAll: (params?: Params) => get('/support', params),
    getById: (ticketId: string) => get(`/support/${ticketId}`),
    messages: (ticketId: string) => get(`/support/${ticketId}/messages`),
    create: (data: any) => post('/support', data),
    sendMessage: (ticketId: string, data: any) => post(`/support/${ticketId}/messages`, data),
    setStatus: (ticketId: string, data: any) => patch(`/support/${ticketId}/status`, data),
  },

  // ── Misc ───────────────────────────────────────────────────────────────────
  activityLogs: {
    getAll: (params?: Params) => get('/activity-logs', params),
    create: (data: any) => post('/activity-logs', data),
  },
  analytics: {
    overview: (params?: Params) => get('/analytics/overview', params),
    events: (params?: Params) => get('/analytics/events', params),
  },
  settings: {
    get: (id: string) => get(`/settings/${id}`),
    set: (id: string, data: any) => put(`/settings/${id}`, data),
    update: (id: string, data: any) => patch(`/settings/${id}`, data),
  },
  statuses: {
    getAll: (params?: Params) => get('/statuses', params),
    create: (data: any) => post('/statuses', data),
    view: (id: string) => post(`/statuses/${id}/view`),
    like: (id: string) => post(`/statuses/${id}/like`),
    delete: (id: string) => del(`/statuses/${id}`),
  },
  events: {
    getAll: (params?: Params) => get('/upcoming-events', params),
  },
  lexicon: {
    chat: (data: any) => post('/lexicon/chat', data),
  },
  generic: {
    list: (collection: string, limit = 100, field?: string, value?: any) => {
      const endpoint = collection === 'schedule_categories' || collection === 'categories'
        ? '/categories'
        : collection === 'schedule_programs' || collection === 'schedule'
        ? '/schedule'
        : collection === 'schedule_songs'
        ? '/songs'
        : `/${collection.replace(/_/g, '-')}`;
      const params: any = { limit };
      if (field && value !== undefined) params[field] = value;
      return get(endpoint, params);
    },
    get: (collection: string, id: string) => {
      const endpoint = collection === 'schedule_categories' ? '/categories' : collection === 'schedule_programs' ? '/schedule' : `/${collection.replace(/_/g, '-')}`;
      return get(`${endpoint}/${id}`);
    },
    create: (collection: string, data: any) => {
      const endpoint = collection === 'schedule_categories' ? '/categories' : collection === 'schedule_programs' ? '/schedule' : `/${collection.replace(/_/g, '-')}`;
      return post(endpoint, data);
    },
    update: (collection: string, id: string, data: any) => {
      const endpoint = collection === 'schedule_categories' ? '/categories' : collection === 'schedule_programs' ? '/schedule' : `/${collection.replace(/_/g, '-')}`;
      return patch(`${endpoint}/${id}`, data);
    },
    delete: (collection: string, id: string) => {
      const endpoint = collection === 'schedule_categories' ? '/categories' : collection === 'schedule_programs' ? '/schedule' : `/${collection.replace(/_/g, '-')}`;
      return del(`${endpoint}/${id}`);
    },
  },
};
