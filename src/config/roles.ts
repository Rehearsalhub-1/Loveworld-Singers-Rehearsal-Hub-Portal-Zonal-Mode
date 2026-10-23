import { isHQGroup } from '@/config/zones'
import { useAuthStore } from '@/stores/authStore'

export type UserRole = 'boss' | 'zone_coordinator' | 'zone_member' | 'hq_admin' | 'hq_member';

export interface RolePermissions {
  // Zone Management
  canManageZone: boolean;
  canViewZoneSettings: boolean;
  canUpgradeSubscription: boolean;
  canCancelSubscription: boolean;
  canViewPaymentHistory: boolean;

  // Member Management
  canAddMembers: boolean;
  canRemoveMembers: boolean;
  canViewMembers: boolean;
  canShareInviteLink: boolean;

  // Content Management
  canCreatePraiseNight: boolean;
  canEditPraiseNight: boolean;
  canDeletePraiseNight: boolean;
  canCreateSong: boolean;
  canEditSong: boolean;
  canDeleteSong: boolean;
  canCreateCategory: boolean;
  canEditCategory: boolean;
  canDeleteCategory: boolean;

  // Admin Access
  canViewAllZones: boolean;
  canAccessBoss: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  // Boss - Can view everything across all zones but cannot edit super admin content
  // Has full visibility but limited editing rights
  boss: {
    // Zone Management - VIEW ONLY
    canManageZone: false,
    canViewZoneSettings: true,
    canUpgradeSubscription: false,
    canCancelSubscription: false,
    canViewPaymentHistory: true,

    // Member Management - VIEW ONLY
    canAddMembers: false,
    canRemoveMembers: false,
    canViewMembers: true,
    canShareInviteLink: false,

    // Content Management - VIEW ONLY
    canCreatePraiseNight: false,
    canEditPraiseNight: false,
    canDeletePraiseNight: false,
    canCreateSong: false,
    canEditSong: false,
    canDeleteSong: false,
    canCreateCategory: false,
    canEditCategory: false,
    canDeleteCategory: false,

    // Boss Access
    canViewAllZones: true,
    canAccessBoss: true
  },

  // Zone Coordinator - The person who pays for the zone
  // Has FULL ADMIN rights for THEIR zone only
  zone_coordinator: {
    // Zone Management - FULL ACCESS
    canManageZone: true,
    canViewZoneSettings: true,
    canUpgradeSubscription: true,
    canCancelSubscription: true,
    canViewPaymentHistory: true,

    // Member Management - FULL ACCESS
    canAddMembers: true,
    canRemoveMembers: true,
    canViewMembers: true,
    canShareInviteLink: true,

    // Content Management - FULL ACCESS
    canCreatePraiseNight: true,
    canEditPraiseNight: true,
    canDeletePraiseNight: true,
    canCreateSong: true,
    canEditSong: true,
    canDeleteSong: true,
    canCreateCategory: true,
    canEditCategory: true,
    canDeleteCategory: true,

    // Coordinator Access
    canViewAllZones: false,
    canAccessBoss: false
  },

  // Zone Member - Regular user
  // Can only VIEW content, no admin rights
  zone_member: {
    // Zone Management - NO ACCESS
    canManageZone: false,
    canViewZoneSettings: false,
    canUpgradeSubscription: false,
    canCancelSubscription: false,
    canViewPaymentHistory: false,

    // Member Management - NO ACCESS
    canAddMembers: false,
    canRemoveMembers: false,
    canViewMembers: true, // Can see other members
    canShareInviteLink: false,

    // Content Management - NO ACCESS
    canCreatePraiseNight: false,
    canEditPraiseNight: false,
    canDeletePraiseNight: false,
    canCreateSong: false,
    canEditSong: false,
    canDeleteSong: false,
    canCreateCategory: false,
    canEditCategory: false,
    canDeleteCategory: false,

    // Member Access
    canViewAllZones: false,
    canAccessBoss: false
  },

  // HQ Admin - Headquarters administrator
  // Can manage ALL HQ groups and their members
  hq_admin: {
    // Zone Management - FULL ACCESS for HQ groups
    canManageZone: true,
    canViewZoneSettings: true,
    canUpgradeSubscription: false, // HQ doesn't need subscriptions
    canCancelSubscription: false,
    canViewPaymentHistory: false,

    // Member Management - FULL ACCESS (can manage HQ group members)
    canAddMembers: true,
    canRemoveMembers: true,
    canViewMembers: true,
    canShareInviteLink: true,

    // Content Management - FULL ACCESS for HQ groups
    canCreatePraiseNight: true,
    canEditPraiseNight: true,
    canDeletePraiseNight: true,
    canCreateSong: true,
    canEditSong: true,
    canDeleteSong: true,
    canCreateCategory: true,
    canEditCategory: true,
    canDeleteCategory: true,

    // HQ Admin Access - Can view all HQ groups and access admin features
    canViewAllZones: true, // Can view all HQ groups
    canAccessBoss: false
  },

  // HQ Member - Headquarters group member
  // Full access like coordinator but for HQ groups (no subscription needed)
  hq_member: {
    // Zone Management - FULL ACCESS (no subscription needed)
    canManageZone: true,
    canViewZoneSettings: true,
    canUpgradeSubscription: false, // HQ doesn't need subscriptions
    canCancelSubscription: false,
    canViewPaymentHistory: false,

    // Member Management - FULL ACCESS
    canAddMembers: true,
    canRemoveMembers: true,
    canViewMembers: true,
    canShareInviteLink: true,

    // Content Management - FULL ACCESS
    canCreatePraiseNight: true,
    canEditPraiseNight: true,
    canDeletePraiseNight: true,
    canCreateSong: true,
    canEditSong: true,
    canDeleteSong: true,
    canCreateCategory: true,
    canEditCategory: true,
    canDeleteCategory: true,

    // Member Access
    canViewAllZones: false,
    canAccessBoss: false
  }
};

// Helper function to check permission
export function hasPermission(
  role: UserRole,
  permission: keyof RolePermissions
): boolean {
  return ROLE_PERMISSIONS[role][permission];
}

export function isHQAdmin(profile: any): boolean {
  if (!profile) return false;
  const role = (profile.role || profile.raw?.role || '').toLowerCase();
  if (['hq_admin', 'admin', 'boss', 'president', 'director', 'oftp', 'executive'].includes(role)) {
    return true;
  }
  const adminField = (profile.administration || profile.raw?.administration || '').toLowerCase();
  if (['boss', 'hq admin', 'admin'].includes(adminField)) {
    return true;
  }
  return false;
}

export function getUserRoleInZone(
  userId: string,
  zoneId: string,
  zoneMembership: any,
  userEmail?: string
): UserRole {
  if (zoneMembership?.role === 'boss' || zoneId === 'zone-boss') {
    return 'boss';
  }

  if (isHQGroup(zoneId)) {
    if (zoneMembership?.role === 'hq_admin' || isHQAdmin(zoneMembership)) {
      return 'hq_admin';
    }
    const profile = typeof window !== 'undefined' ? useAuthStore.getState().profile : null;
    if (isHQAdmin(profile)) {
      return 'hq_admin';
    }
    return 'hq_member';
  }

  if (zoneMembership?.role === 'coordinator') {
    return 'zone_coordinator';
  }

  return 'zone_member';
}

export function getUserGlobalRole(userEmail: string | null | undefined): UserRole | null {
  if (!userEmail) return null;
  const profile = typeof window !== 'undefined' ? useAuthStore.getState().profile : null;
  if (isHQAdmin(profile)) {
    return 'hq_admin';
  }
  return null;
}

export function canAccessAllHQGroups(role: UserRole): boolean {
  return role === 'boss' || role === 'hq_admin';
}

export function isHQAdministrator(role: UserRole): boolean {
  return role === 'hq_admin';
}

export const HQ_ADMIN_EMAILS: string[] = [];

export function isHQAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  try {
    const profile = typeof window !== 'undefined' ? useAuthStore.getState().profile : null;
    if (profile && (profile.email || '').toLowerCase() === email.toLowerCase()) {
      return isHQAdmin(profile);
    }
  } catch {
    // Ignore if store uninitialized
  }
  return false;
}

export function shouldShowAdminButton(
  userEmail: string | null | undefined,
  currentRole?: UserRole
): boolean {
  const profile = typeof window !== 'undefined' ? useAuthStore.getState().profile : null;
  if (isHQAdmin(profile)) {
    return true;
  }

  if (currentRole && (
    currentRole === 'boss' ||
    currentRole === 'zone_coordinator' ||
    currentRole === 'hq_admin'
  )) {
    return true;
  }

  return false;
}
