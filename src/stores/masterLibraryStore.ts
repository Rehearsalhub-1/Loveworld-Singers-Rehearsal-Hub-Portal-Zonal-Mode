import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MasterSong, MasterProgram } from '@/types/master-library';

interface MasterLibraryCache {
  songs: MasterSong[];
  stats: { totalSongs: number; totalImports: number; mostImported: MasterSong[] };
  internalSongs: any[];
  programs: MasterProgram[];
  lastFetchTime: number;
}

interface MasterLibraryStore {
  caches: Record<string, MasterLibraryCache>;
  
  setCache: (zoneId: string, cache: MasterLibraryCache) => void;
  getCache: (zoneId: string) => MasterLibraryCache | undefined;
}

export const useMasterLibraryStore = create<MasterLibraryStore>()(
  persist(
    (set, get) => ({
      caches: {},
      
      setCache: (zoneId, cache) => set((state) => ({
        caches: {
          ...state.caches,
          [zoneId]: cache
        }
      })),

      getCache: (zoneId) => get().caches[zoneId]
    }),
    {
      name: 'master-library-storage',
      partialize: (state) => ({ caches: state.caches })
    }
  )
);
