import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SubGroup } from '@/types/subgroup';

interface SubGroupUserCache {
  isSubGroupCoordinator: boolean;
  coordinatedSubGroups: SubGroup[];
  memberSubGroups: SubGroup[];
  userRequests: SubGroup[];
  lastFetchTime: number;
}

interface ZoneSubGroupCache {
  subGroups: SubGroup[];
  pendingCount: number;
  lastFetchTime: number;
}

interface SubGroupStore {
  userCaches: Record<string, SubGroupUserCache>;
  zoneCaches: Record<string, ZoneSubGroupCache>;
  
  setUserCache: (userId: string, cache: SubGroupUserCache) => void;
  getUserCache: (userId: string) => SubGroupUserCache | undefined;
  
  setZoneCache: (zoneId: string, cache: ZoneSubGroupCache) => void;
  getZoneCache: (zoneId: string) => ZoneSubGroupCache | undefined;
}

export const useSubGroupStore = create<SubGroupStore>()(
  persist(
    (set, get) => ({
      userCaches: {},
      zoneCaches: {},
      
      setUserCache: (userId, cache) => set((state) => ({
        userCaches: {
          ...state.userCaches,
          [userId]: cache
        }
      })),
      
      getUserCache: (userId) => get().userCaches[userId],
      
      setZoneCache: (zoneId, cache) => set((state) => ({
        zoneCaches: {
          ...state.zoneCaches,
          [zoneId]: cache
        }
      })),
      
      getZoneCache: (zoneId) => get().zoneCaches[zoneId]
    }),
    {
      name: 'subgroup-storage',
      partialize: (state) => ({ userCaches: state.userCaches, zoneCaches: state.zoneCaches })
    }
  )
);
