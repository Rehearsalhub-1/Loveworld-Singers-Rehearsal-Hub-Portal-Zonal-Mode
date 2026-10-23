'use client'

import React, { createContext, useContext, useMemo } from 'react'
import { SubscriptionTier, SubscriptionStatus, SubscriptionFeatures } from '@/config/subscriptions'

export interface Subscription {
  id: string;
  zoneId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startDate: Date;
  expiresAt: Date | null;
  paymentMethod?: string;
  amount?: number;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
  type?: 'zone' | 'individual' | 'official';
}

export interface SubscriptionContextType {
  subscription: Subscription | null;
  isLoading: boolean;
  hasFeature: (feature: keyof SubscriptionFeatures) => boolean;
  canAddMember: () => Promise<boolean>;
  memberLimit: number;
  isFreeTier: boolean;
  isPremiumTier: boolean;
  isIndividualPremium: boolean;
  isOfficialAccess: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number | null;
  refreshSubscription: () => Promise<void>;
}

const defaultValue: SubscriptionContextType = {
  subscription: null,
  isLoading: false,
  hasFeature: () => true, // All features unlocked while payment is disabled
  canAddMember: async () => true,
  memberLimit: 999999,
  isFreeTier: false,
  isPremiumTier: true,
  isIndividualPremium: true,
  isOfficialAccess: true,
  isExpiringSoon: false,
  daysRemaining: null,
  refreshSubscription: async () => {},
};

const SubscriptionContext = createContext<SubscriptionContextType>(defaultValue);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => defaultValue, []);
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  return context || defaultValue;
}
