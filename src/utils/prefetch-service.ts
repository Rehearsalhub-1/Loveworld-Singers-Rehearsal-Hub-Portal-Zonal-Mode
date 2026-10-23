import { PraiseNightSong } from '@/types/supabase';

class PrefetchService {
  private static instance: PrefetchService;
  private preloadedBuffers = new Map<string, AudioBuffer>();
  private preloadingUrls = new Set<string>();

  static getInstance(): PrefetchService {
    if (!PrefetchService.instance) {
      PrefetchService.instance = new PrefetchService();
    }
    return PrefetchService.instance;
  }

  /**
   * Prefetch a song's audio buffer.
   */
  async prefetchSong(song: PraiseNightSong): Promise<void> {
    const url = song.audioFile;
    if (!url || url.trim() === '' || this.preloadedBuffers.has(url) || this.preloadingUrls.has(url)) {
      return;
    }

    this.preloadingUrls.add(url);
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(arrayBuffer);
        if (decoded) {
          this.preloadedBuffers.set(url, decoded);
        }
      }
    } catch {
      // Ignore prefetch errors
    } finally {
      this.preloadingUrls.delete(url);
    }
  }

  /**
   * Get a pre-loaded buffer if it exists.
   */
  getPreloadedBuffer(url: string): AudioBuffer | null {
    return this.preloadedBuffers.get(url) || null;
  }

  /**
   * Clear old buffers to save memory.
   */
  clearCache(): void {
    this.preloadedBuffers.clear();
    this.preloadingUrls.clear();
  }
}

export const prefetchService = PrefetchService.getInstance();
