'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useZone } from './useZone'
import { SubGroup, SubGroupRequest } from '@/types/subgroup'
import { useSubGroupStore } from '@/stores/subGroupStore'
import { BackendAPI } from '@/lib/api-client'

export function useSubGroup() {
  const { user } = useAuth()
  const { currentZone } = useZone()
  
  const [isSubGroupCoordinator, setIsSubGroupCoordinator] = useState(false)
  const [coordinatedSubGroups, setCoordinatedSubGroups] = useState<SubGroup[]>([])
  const [memberSubGroups, setMemberSubGroups] = useState<SubGroup[]>([])
  const [userRequests, setUserRequests] = useState<SubGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const refresh = useCallback(async () => {
    if (!user?.uid) return
    
    try {
      const [coordinatedRes, mineRes, requestsRes]: any = await Promise.all([
        BackendAPI.subgroups.coordinated(),
        BackendAPI.subgroups.mine(),
        BackendAPI.subgroups.requests()
      ]);
      
      const coordinated: SubGroup[] = Array.isArray(coordinatedRes) ? coordinatedRes : (coordinatedRes?.data || []);
      const memberOf: SubGroup[] = Array.isArray(mineRes) ? mineRes : (mineRes?.data || []);
      const requests: SubGroup[] = Array.isArray(requestsRes) ? requestsRes : (requestsRes?.data || []);
      const isCoordinator = coordinated.length > 0;
      
      setIsSubGroupCoordinator(isCoordinator)
      setCoordinatedSubGroups(coordinated)
      setMemberSubGroups(memberOf)
      setUserRequests(requests)

      useSubGroupStore.getState().setUserCache(user.uid, {
        isSubGroupCoordinator: isCoordinator,
        coordinatedSubGroups: coordinated,
        memberSubGroups: memberOf,
        userRequests: requests,
        lastFetchTime: Date.now()
      });
    } catch (err) {
      console.error('Error refreshing subgroup user data:', err);
    }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false)
      return
    }
    const cacheKey = user.uid;
    const cachedStore = useSubGroupStore.getState().getUserCache(cacheKey);
    const now = Date.now();
    const CACHE_TTL = 30 * 1000;

    if (cachedStore) {
      setIsSubGroupCoordinator(cachedStore.isSubGroupCoordinator);
      setCoordinatedSubGroups(cachedStore.coordinatedSubGroups);
      setMemberSubGroups(cachedStore.memberSubGroups);
      setUserRequests(cachedStore.userRequests);
      setIsLoading(false);

      if (now - cachedStore.lastFetchTime < CACHE_TTL) {
        return;
      }
    } else {
      setIsLoading(true);
    }
    
    refresh().finally(() => setIsLoading(false))
  }, [user?.uid, currentZone?.id, refresh])
  
  const requestSubGroup = useCallback(async (
    request: SubGroupRequest,
    requesterName: string,
    requesterEmail: string
  ) => {
    if (!user?.uid || !currentZone) {
      return { success: false, error: 'Not authenticated or no zone selected' }
    }
    
    try {
      await BackendAPI.subgroups.create({
        ...request,
        zoneId: currentZone.id,
        coordinatorName: requesterName,
        coordinatorEmail: requesterEmail
      });
      await refresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to request subgroup' };
    }
  }, [user?.uid, currentZone, refresh])
  
  return {
    isSubGroupCoordinator,
    coordinatedSubGroups,
    memberSubGroups,
    userRequests,
    isLoading,
    requestSubGroup,
    refresh
  }
}

export function useZoneSubGroups() {
  const { user, profile } = useAuth()
  const { currentZone, userRole } = useZone()
  const isZoneCoordinator = userRole === 'zone_coordinator'
  const isAdmin = isZoneCoordinator || userRole === 'hq_admin' || userRole === 'boss'
  
  const [subGroups, setSubGroups] = useState<SubGroup[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  
  const refresh = useCallback(async () => {
    if (!currentZone) return
    
    const isGlobalAdmin = userRole === 'hq_admin' || userRole === 'boss';
    const targetZoneId = isGlobalAdmin ? undefined : currentZone.id;

    try {
      const res: any = await BackendAPI.subgroups.getAll({ zoneId: targetZoneId });
      const groups: SubGroup[] = Array.isArray(res) ? res : (res?.data || []);
      const count = groups.filter(g => g.status === 'pending').length;
      setSubGroups(groups)
      setPendingCount(count)
      return { groups, count };
    } catch (err) {
      console.error('Error fetching zone subgroups:', err);
      return { groups: [], count: 0 };
    }
  }, [currentZone, userRole])

  useEffect(() => {
    const loadSubGroups = async () => {
      if (!currentZone || !isAdmin) {
        setIsLoading(false)
        return
      }
      const cacheKey = currentZone.id;
      const cachedStore = useSubGroupStore.getState().getZoneCache(cacheKey);
      const now = Date.now();
      const CACHE_TTL = 30 * 1000;

      if (cachedStore) {
        setSubGroups(cachedStore.subGroups);
        setPendingCount(cachedStore.pendingCount);
        setIsLoading(false);

        if (now - cachedStore.lastFetchTime < CACHE_TTL) {
          return;
        }
      } else {
        setIsLoading(true);
      }
      
      try {
        const res = await refresh();
        if (res) {
          useSubGroupStore.getState().setZoneCache(cacheKey, {
            subGroups: res.groups,
            pendingCount: res.count,
            lastFetchTime: Date.now()
          });
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSubGroups()
  }, [currentZone?.id, isAdmin, refresh])
  
  const approveSubGroup = useCallback(async (subGroupId: string) => {
    if (!user?.uid) return { success: false, error: 'Not authenticated' }
    
    try {
      await BackendAPI.subgroups.approve(subGroupId);
      await refresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to approve subgroup' };
    }
  }, [user?.uid, refresh])
  
  const rejectSubGroup = useCallback(async (subGroupId: string, reason: string) => {
    if (!user?.uid) return { success: false, error: 'Not authenticated' }
    
    try {
      await BackendAPI.subgroups.reject(subGroupId, { reason });
      await refresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to reject subgroup' };
    }
  }, [user?.uid, refresh])

  const createChurch = useCallback(async (name: string, code: string) => {
    if (!currentZone?.id) return { success: false, error: 'No zone selected' };
    try {
      await BackendAPI.subgroups.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type: 'church',
        zoneId: currentZone.id,
      });
      await refresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create church' };
    }
  }, [currentZone?.id, refresh]);

  const assignCoordinator = useCallback(async (churchId: string, email: string) => {
    try {
      await BackendAPI.subgroups.addCoordinator(churchId, {
        identifier: email.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
      });
      await refresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to assign coordinator' };
    }
  }, [refresh]);

  const getChurchMembers = useCallback(async (churchId: string) => {
    try {
      const res: any = await BackendAPI.subgroups.getMembers(churchId);
      const members = Array.isArray(res) ? res : (res?.data || []);
      return { success: true, data: members };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || 'Failed to load church members' };
    }
  }, []);

  const addChurchMember = useCallback(async (churchId: string, userId: string) => {
    try {
      await BackendAPI.subgroups.addChurchMember(churchId, userId, 'member');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to add member to church' };
    }
  }, []);

  const removeChurchMember = useCallback(async (churchId: string, userId: string) => {
    try {
      await BackendAPI.subgroups.removeChurchMember(churchId, userId);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to remove member from church' };
    }
  }, []);
  
  return {
    subGroups,
    pendingSubGroups: subGroups.filter(sg => sg.status === 'pending'),
    activeSubGroups: subGroups.filter(sg => sg.status === 'active' || !sg.status),
    pendingCount,
    isLoading,
    approveSubGroup,
    rejectSubGroup,
    createChurch,
    assignCoordinator,
    getChurchMembers,
    addChurchMember,
    removeChurchMember,
    refresh
  }
}
