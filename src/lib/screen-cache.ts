const CACHE_VERSION = 'v1';
export const DEFAULT_TTL_MS = 30 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

export function readCache<T>(key: string, ttlMs = DEFAULT_TTL_MS, allowStale = true): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`lwsrh_screen_cache_${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (entry.version !== CACHE_VERSION) return null;
    if (!allowStale && entry.timestamp && Date.now() - entry.timestamp > ttlMs) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    localStorage.setItem(`lwsrh_screen_cache_${key}`, JSON.stringify(entry));
  } catch (e) {
    console.warn(`[screenCache] writeCache failed for key "${key}":`, e);
  }
}

export function isCacheStale(key: string, ttlMs = DEFAULT_TTL_MS): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(`lwsrh_screen_cache_${key}`);
    if (!raw) return true;
    const entry: CacheEntry<unknown> = JSON.parse(raw);
    return Date.now() - entry.timestamp > ttlMs;
  } catch {
    return true;
  }
}

export function clearCache(key?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (key) {
      localStorage.removeItem(`lwsrh_screen_cache_${key}`);
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('lwsrh_screen_cache_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}
