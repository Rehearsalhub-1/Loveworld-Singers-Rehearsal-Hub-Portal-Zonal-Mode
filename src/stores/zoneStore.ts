/**
 * ZONE STORE — Centralized Zone State (Thin UI / API-backed)
 *
 */

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { ZONES, Zone, isHQGroup, getZoneById, getZoneByInvitationCode } from '@/config/zones'
import { UserRole, hasPermission as checkPermission, isHQAdmin } from '@/config/roles'
import { useAuthStore } from './authStore'
import { BackendAPI } from '@/lib/api-client'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ZoneState {
  // Data
  currentZone: Zone | null
  userZones: Zone[]
  userRole: UserRole
  currentZoneMembership: any

  // Loading
  isLoading: boolean
  isInitialized: boolean
  _lastLoadedUserId: string | null

  // Actions
  loadUserZones: (userId: string, email: string) => Promise<void>
  switchZone: (zoneId: string, userId?: string, email?: string) => Promise<boolean>
  refreshZones: (userId?: string, email?: string) => Promise<void>
  clearZoneState: () => void
  hasPermission: (permission: string) => boolean
}

// ─── localStorage zone preference (per user) ─────────────────────────────────

function getUserZonePrefKey(userId: string) {
  return `lwsrh-user-zone-${userId}`
}

function getUserZonePref(userId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(getUserZonePrefKey(userId))
  } catch {
    return null
  }
}

function setUserZonePref(userId: string, zoneId: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getUserZonePrefKey(userId), zoneId)
  } catch {}
}

let _isFetchingZones = false

function getInitialZoneState(): { currentZone: Zone | null; isInitialized: boolean } {
  if (typeof window === 'undefined') return { currentZone: null, isInitialized: false }
  try {
    const raw = localStorage.getItem('lwsrh_current_zone')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.id) {
        return { currentZone: parsed, isInitialized: true }
      }
    }
  } catch {}
  try {
    const rawStorage = localStorage.getItem('lwsrh-zone-storage')
    if (rawStorage) {
      const parsed = JSON.parse(rawStorage)
      if (parsed?.state?.currentZone?.id) {
        return { currentZone: parsed.state.currentZone, isInitialized: true }
      }
    }
  } catch {}
  // Default fallback so app is never stuck uninitialized
  return { currentZone: ZONES[0] || null, isInitialized: true }
}

export const useZoneStore = create<ZoneState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state (synchronously hydrated from local storage to avoid 0ms freeze)
        ...getInitialZoneState(),
        userZones: [],
        userRole: 'zone_member',
        currentZoneMembership: null,
        isLoading: false,
        _lastLoadedUserId: null,

        // ── hasPermission ─────────────────────────────────────────────────────
        hasPermission: (permission: string) =>
          checkPermission(get().userRole, permission as any),

        // ── clearZoneState ────────────────────────────────────────────────────
        clearZoneState: () => {
          set({
            currentZone: null,
            userZones: [],
            userRole: 'zone_member',
            currentZoneMembership: null,
            isLoading: false,
            isInitialized: false,
            _lastLoadedUserId: null,
          })
        },

        // ── loadUserZones ─────────────────────────────────────────────────────
        loadUserZones: async (userId: string, email: string) => {
          const { _lastLoadedUserId, isInitialized, userZones } = get()
          if (_lastLoadedUserId === userId && isInitialized && userZones.length > 0) return
          if (_isFetchingZones) return
          _isFetchingZones = true

          set({ isLoading: true })
          const savedZoneId = getUserZonePref(userId)

          try {
            // 1. Fetch live zones from backend API
            let allDbZones: any[] = []
            try {
              const res = await BackendAPI.zones.getAll().catch(() => null)
              const rawZones = res?.data || res
              if (Array.isArray(rawZones)) {
                allDbZones = rawZones
              }
            } catch (e) {
              console.warn('[ZoneStore] Failed to fetch organizations from API:', e)
            }
            if (allDbZones.length === 0) {
              allDbZones = ZONES
            }

            const formatZone = (z: any): Zone => ({
              id: String(z.id),
              name: z.name || 'Your Loveworld Singers',
              slug: z.slug || z.code || String(z.id),
              region: z.region || 'Headquarters',
              invitationCode: z.invitationCode || z.code || '',
              themeColor: z.themeColor || '#9333EA',
              isHq: Boolean(z.isHq || isHQGroup(String(z.id))),
            })

            // 2. Fetch memberships from /members/mine (exact mobile app logic in useUser.tsx)
            let allMemberships: any[] = []
            try {
              const memRes = await BackendAPI.members.mine().catch(() => null)
              const rawMem = memRes?.data || memRes
              if (rawMem) {
                if (Array.isArray(rawMem.memberships)) {
                  allMemberships = rawMem.memberships
                } else if (Array.isArray(rawMem)) {
                  allMemberships = rawMem
                } else {
                  allMemberships = [
                    ...(rawMem.zoneMembers || []),
                    ...(rawMem.hqMembers || [])
                  ]
                }
              }
            } catch (e) {
              console.warn('[ZoneStore] Failed to load memberships from /members/mine:', e)
            }

            // Fallback to authStore memberships if /members/mine was empty
            const authUser = useAuthStore.getState().user
            if (allMemberships.length === 0 && Array.isArray((authUser as any)?.memberships)) {
              allMemberships = (authUser as any).memberships
            }

            const profile = useAuthStore.getState().profile

            // 3. Resolve user's actual joined zones from memberships (matching mobile app useUser.tsx)
            const joinedZones: Zone[] = []
            for (const mem of allMemberships) {
              const zId = mem.organizationId || mem.organization_id || mem.zoneId || mem.zone_id || mem.hqGroupId || mem.hq_group_id || mem.zoneCode || mem.zone_code || mem.id
              const orgName = mem.organization?.name || mem.organizationName || mem.zoneName || mem.hqGroupName || mem.name || zId
              const orgCode = mem.organization?.slug || mem.organization?.code || mem.zoneCode || mem.invitationCode || zId

              if (zId) {
                const normId = String(zId).toLowerCase()
                const normCode = String(orgCode || '').toLowerCase()
                const normName = String(orgName || '').toLowerCase()

                const matchedDb = allDbZones.find((z: any) =>
                  String(z.id).toLowerCase() === normId ||
                  (z.invitationCode && String(z.invitationCode).toLowerCase() === normId) ||
                  (z.invitationCode && String(z.invitationCode).toLowerCase() === normCode) ||
                  (z.code && String(z.code).toLowerCase() === normCode) ||
                  (z.name && String(z.name).toLowerCase() === normName)
                )

                const zoneConfig: Zone = matchedDb
                  ? formatZone(matchedDb)
                  : {
                      id: String(zId),
                      name: orgName,
                      slug: orgCode || String(zId),
                      region: mem.organization?.region || 'Headquarters',
                      invitationCode: orgCode || '',
                      themeColor: '#9333EA',
                      isHq: isHQGroup(String(zId)),
                    }

                if (!joinedZones.some((z) => String(z.id).toLowerCase() === String(zoneConfig.id).toLowerCase())) {
                  joinedZones.push({
                    ...zoneConfig,
                    membershipId: mem.id,
                    role: mem.role || 'member',
                  } as Zone & { membershipId?: string; role?: string })
                }
              }
            }

            // 4. If no memberships found from /members/mine, resolve from user profile
            if (joinedZones.length === 0) {
              const userZoneKey = (authUser?.zone_id || authUser?.zoneId || authUser?.zone_code || authUser?.zoneCode || authUser?.zone) as string | undefined
              if (userZoneKey) {
                const normKey = String(userZoneKey).trim().toLowerCase()
                const matchedDb = allDbZones.find((z: any) =>
                  String(z.id || '').toLowerCase() === normKey ||
                  String(z.invitationCode || '').toLowerCase() === normKey ||
                  String(z.code || '').toLowerCase() === normKey ||
                  String(z.name || '').toLowerCase() === normKey
                )
                if (matchedDb) {
                  joinedZones.push(formatZone(matchedDb))
                } else {
                  const fallback = getZoneByInvitationCode(userZoneKey) || getZoneById(userZoneKey)
                  if (fallback) joinedZones.push(fallback)
                }
              }
            }

            // 5. Select targetZone (currentZone)
            let targetZone: Zone | undefined

            // Check if savedZoneId matches one of user's valid joined zones
            if (savedZoneId) {
              targetZone = joinedZones.find((z) => z.id === savedZoneId)
            }

            // If not found in savedZoneId, use the first joined zone
            if (!targetZone && joinedZones.length > 0) {
              targetZone = joinedZones[0]
            }

            // If user has zero zones, fallback to ZONES[0]
            if (!targetZone) {
              targetZone = formatZone(allDbZones[0] || ZONES[0])
              joinedZones.push(targetZone)
            }

            // Ensure currentZone is in joinedZones
            if (!joinedZones.some((z) => String(z.id) === String(targetZone!.id))) {
              joinedZones.push(targetZone)
            }

            // Save to localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('lwsrh_current_zone', JSON.stringify(targetZone))
            }
            setUserZonePref(userId, targetZone.id)

            let role: UserRole = 'zone_member'
            const userRole = (authUser?.role || '').toLowerCase()
            if (isHQAdmin(profile) || userRole === 'hq_admin' || userRole === 'admin' || userRole === 'boss') {
              role = 'hq_admin'
            } else if (userRole === 'coordinator' || userRole === 'zone_coordinator' || userRole === 'zone_admin') {
              role = 'zone_coordinator'
            } else if (targetZone && isHQGroup(targetZone.id)) {
              role = 'hq_member'
            }

            set({
              currentZone: targetZone,
              userZones: joinedZones, // ONLY user's actual joined zones!
              userRole: role,
              currentZoneMembership: {
                userId,
                zoneId: targetZone.id,
                role: role,
              },
              isLoading: false,
              isInitialized: true,
              _lastLoadedUserId: userId,
            })
          } catch (error) {
            console.error('[ZoneStore] Error loading zones:', error)
            set({ isLoading: false, isInitialized: true })
          } finally {
            _isFetchingZones = false
          }
        },

        // ── switchZone ────────────────────────────────────────────────────────
        switchZone: async (zoneId: string, userId?: string, email?: string) => {
          const { userZones } = get()
          let zone = userZones.find((z) => z.id === zoneId)
          if (!zone) zone = ZONES.find((z) => z.id === zoneId)
          if (!zone) return false

          const authUser = useAuthStore.getState().user
          const effectiveUserId = userId || (authUser?.id || authUser?.uid || 'guest') as string
          const effectiveEmail = email || (authUser?.email || '') as string

          setUserZonePref(effectiveUserId, zoneId)
          if (typeof window !== 'undefined') {
            localStorage.setItem('lwsrh_current_zone', JSON.stringify(zone))
          }

          if (effectiveUserId && effectiveUserId !== 'guest') {
            BackendAPI.profiles.update(effectiveUserId, { zone_code: zone.invitationCode }).catch(() => {})
          }

          let role: UserRole = get().userRole
          if (isHQGroup(zoneId) && role !== 'hq_admin') {
            role = 'hq_member'
          }

          set({
            currentZone: zone,
            userRole: role,
            currentZoneMembership: {
              userId: effectiveUserId,
              zoneId: zone.id,
              role,
            },
          })

          return true
        },

        // ── refreshZones ──────────────────────────────────────────────────────
        refreshZones: async (userId?: string, email?: string) => {
          const authUser = useAuthStore.getState().user
          const effectiveUserId = userId || (authUser?.id || authUser?.uid || '') as string
          const effectiveEmail = email || (authUser?.email || '') as string
          set({ _lastLoadedUserId: null })
          if (effectiveUserId) {
            await get().loadUserZones(effectiveUserId, effectiveEmail)
          }
        },
      }),
      {
        name: 'lwsrh-zone-storage',
        partialize: (state) => ({
          currentZone: state.currentZone,
          userRole: state.userRole,
        }),
      }
    )
  )
)

export const selectCurrentZone = (s: ZoneState) => s.currentZone
export const selectUserZones = (s: ZoneState) => s.userZones
export const selectUserRole = (s: ZoneState) => s.userRole
export const selectZoneLoading = (s: ZoneState) => s.isLoading
export const selectIsInitialized = (s: ZoneState) => s.isInitialized
export const selectSwitchZone = (s: ZoneState) => s.switchZone
export const selectRefreshZones = (s: ZoneState) => s.refreshZones
export const selectHasPermission = (s: ZoneState) => s.hasPermission

export function useZone() {
  const currentZone = useZoneStore(selectCurrentZone)
  const userZones = useZoneStore(selectUserZones)
  const userRole = useZoneStore(selectUserRole)
  const isLoading = useZoneStore(selectZoneLoading)
  const isInitialized = useZoneStore(selectIsInitialized)
  const switchZone = useZoneStore(selectSwitchZone)
  const refreshZones = useZoneStore(selectRefreshZones)
  const hasPermission = useZoneStore(selectHasPermission)

  const isZoneCoordinator =
    userRole === 'zone_coordinator' ||
    userRole === 'hq_admin'

  return {
    currentZone,
    userZones,
    userRole,
    isZoneCoordinator,
    isLoading,
    isInitialized,
    switchZone,
    refreshZones,
    hasPermission,
    currentZoneId: currentZone?.id,
    zoneName: currentZone?.name,
  }
}
