import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ScheduleCategory, ScheduleProgram } from '@/types/schedule';

interface ScheduleCache {
  categories: ScheduleCategory[];
  allPrograms: ScheduleProgram[];
  lastFetchTime: number;
}

interface ScheduleStore {
  caches: Record<string, ScheduleCache>;
  setCache: (zoneId: string, cache: ScheduleCache) => void;
  getCache: (zoneId: string) => ScheduleCache | undefined;
}

export const useScheduleStore = create<ScheduleStore>()(
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
      name: 'schedule-storage',
      partialize: (state) => ({ caches: state.caches })
    }
  )
);
