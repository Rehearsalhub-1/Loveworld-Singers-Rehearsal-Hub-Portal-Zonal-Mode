/**
 * AUTH STORE — JWT-based authentication
 * Uses BackendAPI.auth endpoints (/auth/login, /auth/kingschat-login, /auth/register, /auth/me, /auth/refresh)
 */

'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { BackendAPI } from '@/lib/api-client'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  uid?: string
  email: string
  first_name: string
  last_name: string
  display_name?: string
  username?: string
  role?: string
  zone?: string
  zone_id?: string
  zoneId?: string
  zone_code?: string
  zoneCode?: string
  zone_name?: string
  zoneName?: string
  memberships?: any[]
  avatar_url?: string
  phone?: string
  designation?: string
  is_active?: boolean
  created_at?: string
  [key: string]: unknown
}

export interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
  zone_code: string
  designation?: string
  kingschat_id?: string
}

interface AuthState {
  // Core state
  user: UserProfile | null
  profile: UserProfile | null
  accessToken: string | null
  refreshToken: string | null
  loading: boolean
  backendOffline: boolean
  isInitialized: boolean

  // Actions
  setUser: (user: UserProfile | null) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  setBackendOffline: (offline: boolean) => void
  setTokens: (access: string, refresh: string) => void

  // Public methods
  signIn: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>
  signInWithKingsChat: (
    accessToken: string,
    selectedUserId?: string,
    selectedEmail?: string,
    kingschatUserId?: string,
    email?: string
  ) => Promise<{
    success: boolean
    code?: string
    accounts?: any[]
    kingschatUserId?: string
    profile?: any
    error?: string
  }>
  signUp: (data: RegisterData) => Promise<{ success: boolean; pendingApproval?: boolean; message?: string; error?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  initialize: () => void
  cleanup: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setSessionCookie() {
  if (typeof document === 'undefined') return
  document.cookie = 'lwsrh_is_logged_in=true; path=/; max-age=31536000; SameSite=Lax'
}

function clearSessionCookie() {
  if (typeof document === 'undefined') return
  document.cookie = 'lwsrh_is_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

function saveCachedProfile(profile: UserProfile | null) {
  if (typeof localStorage === 'undefined') return
  try {
    if (profile) {
      localStorage.setItem('lwsrh_user_profile', JSON.stringify(profile))
    } else {
      localStorage.removeItem('lwsrh_user_profile')
    }
  } catch {}
}

function loadCachedProfile(): UserProfile | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem('lwsrh_user_profile')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveTokens(access: string, refresh: string, userId?: string, profile?: UserProfile | null) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem('lwsrh_access_token', access)
  localStorage.setItem('lwsrh_refresh_token', refresh)
  localStorage.setItem('lwsrh_has_user', 'true')
  if (userId) {
    localStorage.setItem('lwsrh_user_id', userId)
  }
  if (profile) {
    saveCachedProfile(profile)
  }
  setSessionCookie()
}

function loadTokens(): { access: string | null; refresh: string | null } {
  if (typeof localStorage === 'undefined') return { access: null, refresh: null }
  return {
    access: localStorage.getItem('lwsrh_access_token'),
    refresh: localStorage.getItem('lwsrh_refresh_token'),
  }
}

function clearTokens() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem('lwsrh_access_token')
  localStorage.removeItem('lwsrh_refresh_token')
  localStorage.removeItem('lwsrh_user_id')
  localStorage.removeItem('lwsrh_user_profile')
  localStorage.setItem('lwsrh_has_user', 'false')
  clearSessionCookie()
}

export function parseUserProfile(rawInput: any): UserProfile | null {
  if (!rawInput) return null
  let rawData = rawInput.rawData || rawInput.raw_data || {}
  if (typeof rawData === 'string') {
    try { rawData = JSON.parse(rawData) } catch {}
  }
  const d = { ...rawInput, ...rawData }
  const uid = rawInput.id || rawInput.uid || d.id || d.uid || ''
  const firstName = d.first_name || d.firstName || ''
  const lastName = d.last_name || d.lastName || ''
  const role = (d.role || 'member').toLowerCase()
  const isCoordinator = ['zone_admin', 'coordinator', 'admin', 'hq_admin', 'boss', 'zone_coordinator'].includes(role)

  // Extract canonical membership details if present (from API /auth/me or /auth/login)
  const rawMemberships = Array.isArray(d.memberships) ? d.memberships : (Array.isArray(rawInput.memberships) ? rawInput.memberships : [])
  const firstMembership = rawMemberships.length > 0 ? rawMemberships[0] : null
  const firstOrg = firstMembership?.organization || null

  const zoneId = d.zone_id || d.zoneId || firstOrg?.id || firstMembership?.organizationId || firstMembership?.zoneId || d.organizationId || d.organization_id || ''
  const zoneCode = d.zone_code || d.zoneCode || firstOrg?.invitationCode || firstOrg?.code || firstMembership?.zoneCode || d.zone || ''
  const zoneName = d.zone_name || d.zoneName || firstOrg?.name || firstMembership?.zoneName || firstMembership?.organizationName || (typeof d.zone === 'string' && !d.zone.startsWith('ZNL') && !d.zone.startsWith('ZONE') ? d.zone : '')
  const zone = d.zone || zoneName || zoneCode || ''

  return {
    ...d,
    id: uid,
    uid,
    email: d.email || '',
    first_name: firstName,
    firstName,
    last_name: lastName,
    lastName,
    name: `${firstName} ${lastName}`.trim() || d.name || d.displayName || '',
    displayName: `${firstName} ${lastName}`.trim() || d.name || d.displayName || '',
    username: d.username || d.user_name || '',
    role,
    zone,
    zone_id: zoneId,
    zoneId,
    zone_code: zoneCode,
    zoneCode,
    zone_name: zoneName,
    zoneName,
    memberships: rawMemberships,
    church: d.church || firstMembership?.subgroup?.name || firstMembership?.churchName || '',
    church_id: d.church_id || d.churchId || firstMembership?.subgroupId || firstMembership?.groupId || '',
    designation: d.designation || d.voicePart || d.voice_part || '',
    administration: d.administration || '',
    phone: d.phone_number || d.phoneNumber || d.phone || '',
    phone_number: d.phone_number || d.phoneNumber || d.phone || '',
    gender: d.gender || '',
    birthday: d.birthday || '',
    region: d.region || firstOrg?.region || '',
    avatar_url: d.profile_image_url || d.avatar_url || d.avatar || d.photoURL || '',
    avatar: d.profile_image_url || d.avatar_url || d.avatar || d.photoURL || '',
    has_hq_access: !!(d.has_hq_access || d.hasHqAccess || ['president', 'director', 'oftp', 'executive', 'hq_admin', 'admin'].includes(role)),
    hasHqAccess: !!(d.has_hq_access || d.hasHqAccess || ['president', 'director', 'oftp', 'executive', 'hq_admin', 'admin'].includes(role)),
    can_access_archive: !!(d.can_access_archive || d.canAccessArchive || d.canSeeArchive),
    canAccessArchive: !!(d.can_access_archive || d.canAccessArchive || d.canSeeArchive),
    can_access_pre_rehearsal: !!(d.can_access_pre_rehearsal || d.canAccessPreRehearsal),
    canAccessPreRehearsal: !!(d.can_access_pre_rehearsal || d.canAccessPreRehearsal),
    isZoneCoordinator: isCoordinator,
    is_zone_coordinator: isCoordinator,
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

const initialCachedProfile = loadCachedProfile()
const initialTokens = loadTokens()

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    user: initialCachedProfile,
    profile: initialCachedProfile,
    accessToken: initialTokens.access,
    refreshToken: initialTokens.refresh,
    loading: !initialCachedProfile && !!initialTokens.access,
    backendOffline: false,
    isInitialized: false,

    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setLoading: (loading) => set({ loading }),
    setBackendOffline: (backendOffline) => set({ backendOffline }),
    setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),

    // ── Sign In (Password) ───────────────────────────────────────────────────
    signIn: async (identifier: string, password: string) => {
      set({ loading: true })
      try {
        const rawRes = await BackendAPI.auth.login({
          identifier,
          email: identifier,
          username: identifier,
          password,
        })
        const res = rawRes?.data || rawRes
        const { accessToken, refreshToken, user: rawUser } = res
        const user = parseUserProfile(rawUser)
        if (accessToken) saveTokens(accessToken, refreshToken, user?.id || user?.uid || rawUser?.id, user)
        saveCachedProfile(user)
        set({
          user,
          profile: user,
          accessToken,
          refreshToken,
          loading: false,
          backendOffline: false,
        })
        return { success: true }
      } catch (err: unknown) {
        set({ loading: false })
        const msg = err instanceof Error ? err.message : 'Login failed'
        return { success: false, error: msg }
      }
    },

    // ── Sign In (KingsChat) ──────────────────────────────────────────────────
    signInWithKingsChat: async (
      accessToken: string,
      selectedUserId?: string,
      selectedEmail?: string,
      kingschatUserId?: string,
      email?: string
    ) => {
      set({ loading: true })
      try {
        const rawRes = await BackendAPI.auth.kingsChatLogin({
          accessToken,
          selectedUserId,
          userId: selectedUserId,
          selectedEmail: selectedEmail || undefined,
          email: selectedEmail || email || undefined,
          kingschatUserId: kingschatUserId || undefined,
        })

        if (!rawRes.success) {
          set({ loading: false })
          return {
            success: false,
            code: rawRes.code,
            accounts: rawRes.accounts,
            kingschatUserId: rawRes.kingschatUserId,
            profile: rawRes.profile,
            error: rawRes.error || 'KingsChat login failed',
          }
        }

        const res = rawRes.data || rawRes
        const { accessToken: jwtAccess, refreshToken: jwtRefresh, user: rawUser } = res
        const user = parseUserProfile(rawUser)
        if (jwtAccess) saveTokens(jwtAccess, jwtRefresh, user?.id || user?.uid || rawUser?.id, user)
        saveCachedProfile(user)
        set({
          user,
          profile: user,
          accessToken: jwtAccess,
          refreshToken: jwtRefresh,
          loading: false,
          backendOffline: false,
        })
        return { success: true }
      } catch (err: unknown) {
        set({ loading: false })
        const msg = err instanceof Error ? err.message : 'KingsChat login failed'
        return { success: false, error: msg }
      }
    },

    // ── Sign Up ──────────────────────────────────────────────────────────────
    signUp: async (data: RegisterData) => {
      set({ loading: true })
      try {
        const rawRes = await BackendAPI.auth.register(data)
        if (rawRes?.pendingApproval) {
          set({ loading: false })
          return {
            success: true,
            pendingApproval: true,
            message: rawRes.message || 'Your application to join an HQ group has been submitted for admin approval.',
          } as any
        }
        const res = rawRes?.data || rawRes
        const { accessToken, refreshToken, user: rawUser } = res
        const user = parseUserProfile(rawUser)
        if (accessToken) saveTokens(accessToken, refreshToken, user?.id || user?.uid || rawUser?.id)
        set({
          user,
          profile: user,
          accessToken,
          refreshToken,
          loading: false,
          backendOffline: false,
        })
        return { success: true }
      } catch (err: unknown) {
        set({ loading: false })
        const msg = err instanceof Error ? err.message : 'Registration failed'
        return { success: false, error: msg }
      }
    },

    // ── Sign Out ─────────────────────────────────────────────────────────────
    signOut: async () => {
      const { refreshToken } = get()
      try {
        if (refreshToken) {
          await BackendAPI.auth.logout(refreshToken).catch(() => {})
        }
      } finally {
        clearTokens()
        set({
          user: null,
          profile: null,
          accessToken: null,
          refreshToken: null,
          backendOffline: false,
        })
        if (typeof window !== 'undefined') {
          window.location.replace('/auth')
        }
      }
    },

    // ── Refresh Profile ───────────────────────────────────────────────────────
    refreshProfile: async () => {
      const { accessToken } = get()
      if (!accessToken) return
      try {
        const data = await BackendAPI.auth.me()
        const rawProfile = data?.user ?? data?.data ?? data
        const profile = parseUserProfile(rawProfile)
        saveCachedProfile(profile)
        set({ profile, user: profile })
      } catch {
        // silent
      }
    },

    cleanup: () => {},

    // ── Initialize (call once at app boot) ────────────────────────────────────
    initialize: () => {
      const { isInitialized } = get()
      if (isInitialized) return

      set({ isInitialized: true })

      const { access, refresh } = loadTokens()

      if (!access) {
        set({ loading: false })
        return
      }

      set({ accessToken: access, refreshToken: refresh })

      BackendAPI.auth.me()
        .then((rawData) => {
          const data = rawData?.data || rawData
          const rawProfile = data?.user ?? data
          const profile = parseUserProfile(rawProfile)
          saveCachedProfile(profile)
          set({ user: profile, profile, loading: false, backendOffline: false })
        })
        .catch(async () => {
          if (refresh) {
            try {
              const rawRes = await BackendAPI.auth.refresh(refresh)
              const res = rawRes?.data || rawRes
              const { accessToken: newAccess, refreshToken: newRefresh, user: rawUser } = res
              const user = parseUserProfile(rawUser)
              if (newAccess) saveTokens(newAccess, newRefresh, user?.id || user?.uid || rawUser?.id, user)
              saveCachedProfile(user)
              set({
                user,
                profile: user,
                accessToken: newAccess,
                refreshToken: newRefresh,
                loading: false,
              })
            } catch {
              clearTokens()
              set({ user: null, profile: null, accessToken: null, refreshToken: null, loading: false })
            }
          } else {
            clearTokens()
            set({ loading: false })
          }
        })
    },
  }))
)

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectUser = (s: AuthState) => s.user
export const selectProfile = (s: AuthState) => s.profile
export const selectAuthLoading = (s: AuthState) => s.loading
export const selectBackendOffline = (s: AuthState) => s.backendOffline
export const selectSignOut = (s: AuthState) => s.signOut
export const selectRefreshProfile = (s: AuthState) => s.refreshProfile
export const selectAccessToken = (s: AuthState) => s.accessToken

export function useAuth() {
  const user = useAuthStore(selectUser)
  const profile = useAuthStore(selectProfile)
  const loading = useAuthStore(selectAuthLoading)
  const signOut = useAuthStore(selectSignOut)
  const refreshProfile = useAuthStore(selectRefreshProfile)
  const backendOffline = useAuthStore(selectBackendOffline)
  const accessToken = useAuthStore(selectAccessToken)

  return {
    user,
    profile,
    isLoading: loading && !user,
    isProfileLoading: false,
    loading,
    signOut,
    refreshProfile,
    backendOffline,
    initialLoadComplete: !loading,
    accessToken,
  }
}
