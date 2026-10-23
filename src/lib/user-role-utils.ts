// User Role Utilities
// Determines user permissions based on email prefix and zone context

import type { UserProfile } from '@/types/supabase'
import { isHQAdmin } from '@/config/roles'

export function isBoss(user: UserProfile | null): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  if (role === 'boss' || user.administration?.toLowerCase() === 'boss') return true;
  if (user.email?.toLowerCase().startsWith('boss')) return true;
  if (isHQAdmin(user)) return true;
  return false;
}

/**
 * Check if user is a Zone Leader (has ZNL prefix in email)
 */
export function isZoneLeader(user: UserProfile | null): boolean {
  if (!user?.email) return false

  return user.email.toLowerCase().startsWith('znl')
}

/**
 * Check if user can see upgrade prompts
 * Only Zone Leaders (ZNL prefix) should see upgrade prompts
 */
export function canSeeUpgradePrompts(_user: UserProfile | null): boolean {
  // Upgrade prompts and payment disabled for now
  return false
}

/**
 * Check if user is a zone coordinator
 * Zone coordinators have administrative privileges within their zone
 */
export function isZoneCoordinator(user: UserProfile | null): boolean {
  if (!user) return false

  const role = (user.role || '').toLowerCase()
  return (
    user.administration === 'Coordinator' ||
    isZoneLeader(user) ||
    ['coordinator', 'zone_admin', 'zone_coordinator', 'admin', 'hq_admin', 'boss'].includes(role)
  )
}

/**
 * Check if user can manage zone subscription
 * Only zone coordinators and zone leaders can manage subscriptions
 */
export function canManageZoneSubscription(user: UserProfile | null): boolean {
  return isZoneCoordinator(user) || isZoneLeader(user)
}

/**
 * Get user display role for UI
 */
export function getUserDisplayRole(user: UserProfile | null): string {
  if (!user) return 'Guest'

  if (isBoss(user)) return 'Central Admin'
  if (isZoneLeader(user)) return 'Zone Leader'
  if (user.administration === 'Coordinator') return 'Zone Coordinator'
  if (user.administration === 'Assistant Coordinator') return 'Assistant Coordinator'
  if (user.administration) return user.administration
  if (user.role === 'admin') return 'Admin'

  return 'Member'
}

/**
 * Check if user has elevated permissions in zone
 */
export function hasZoneElevatedPermissions(user: UserProfile | null): boolean {
  return isZoneLeader(user) || isZoneCoordinator(user)
}

/**
 * Get user permissions summary
 */
export function getUserPermissions(user: UserProfile | null) {
  return {
    isBoss: isBoss(user),
    isZoneLeader: isZoneLeader(user),
    isZoneCoordinator: isZoneCoordinator(user),
    canSeeUpgradePrompts: canSeeUpgradePrompts(user),
    canManageSubscription: canManageZoneSubscription(user),
    hasElevatedPermissions: hasZoneElevatedPermissions(user),
    displayRole: getUserDisplayRole(user)
  }
}