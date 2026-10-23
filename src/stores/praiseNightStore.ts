import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PraiseNight } from '@/types/supabase';

interface PraiseNightCache {
  pages: PraiseNight[];
  lastFetchTime: number;
  metadataTime: number;
}

interface PraiseNightStore {
  // Store data by a cache key: `${zoneId}-${userId || 'public'}`
  caches: Record<string, PraiseNightCache>;
  
  // Actions
  setPages: (cacheKey: string, pages: PraiseNight[], fetchTime: number, metadataTime?: number) => void;
  getCache: (cacheKey: string) => PraiseNightCache | undefined;
  updateMetadataTime: (cacheKey: string, metadataTime: number) => void;
}

export const usePraiseNightStore = create<PraiseNightStore>()(
  persist(
    (set, get) => ({
      caches: {},
      
      setPages: (cacheKey, pages, fetchTime, metadataTime) => set((state) => {
        const existing = state.caches[cacheKey];
        return {
          caches: {
            ...state.caches,
            [cacheKey]: {
              pages,
              lastFetchTime: fetchTime,
              metadataTime: metadataTime ?? (existing?.metadataTime || 0)
            }
          }
        };
      }),

      getCache: (cacheKey) => {
        return get().caches[cacheKey];
      },

      updateMetadataTime: (cacheKey, metadataTime) => set((state) => {
        const existing = state.caches[cacheKey];
        if (!existing) return state;
        return {
          caches: {
            ...state.caches,
            [cacheKey]: {
              ...existing,
              metadataTime
            }
          }
        };
      })
    }),
    {
      name: 'praise-night-storage', // name of the item in the storage (must be unique)
      partialize: (state) => ({ caches: state.caches }), // only save caches
    }
  )
);
