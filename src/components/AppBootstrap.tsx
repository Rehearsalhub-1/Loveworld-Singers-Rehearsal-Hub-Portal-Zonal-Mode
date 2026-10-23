"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ViewportHeightFix } from '@/utils/viewport-height-fix';
import { NavigationManager } from '@/utils/navigation';
import { SafeAreaUtils } from '@/utils/safe-area-utils';
import { DeviceSafeArea } from '@/utils/device-safe-area';
import { lowDataOptimizer } from '@/utils/low-data-optimizer';
import { useAuthStore } from '@/stores/authStore';
import { useZoneStore } from '@/stores/zoneStore';
import { useNotificationStore } from '@/stores/notificationStore';

/**
 * AppBootstrap — Runs once on client mount.
 *
 * Responsibilities:
 * 1. Initialize all Zustand stores (auth, zone, notifications)
 * 2. Wire up cross-store reactivity (zone loads when user is ready,
 *    notifications start when user + zone are both ready)
 * 3. Initialize misc utilities (viewport, navigation, service workers)
 *
 * This is the ONLY place store initialization happens — never in components.
 */
export default function AppBootstrap() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // ── Track navigation changes ──────────────────────────────────────────────
    useEffect(() => {
        if (pathname) {
            const fullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
            NavigationManager.saveCurrentPath(fullPath);
        }
    }, [pathname, searchParams]);

    // ── Initialize Auth Store (fires onAuthStateChanged) ─────────────────────
    useEffect(() => {
        const { initialize } = useAuthStore.getState();
        initialize();

        return () => {
            useAuthStore.getState().cleanup();
        };
    }, []);

    // ── Wire Zone Store: load zones when user becomes available ───────────────
    useEffect(() => {
        const unsub = useAuthStore.subscribe(
            (state) => ({ user: state.user, loading: state.loading }),
            ({ user, loading }) => {
                const userId = user?.id || user?.uid;
                if (!loading && userId && user?.email) {
                    useZoneStore.getState().loadUserZones(userId, user.email);
                } else if (!user) {
                    useZoneStore.getState().clearZoneState();
                }
            },
            { equalityFn: (a, b) => (a.user?.id || a.user?.uid) === (b.user?.id || b.user?.uid) && a.loading === b.loading }
        );

        // Handle the case where user is already logged in when this mounts
        const { user, loading } = useAuthStore.getState();
        const userId = user?.id || user?.uid;
        if (!loading && userId && user?.email) {
            useZoneStore.getState().loadUserZones(userId, user.email);
        }

        return () => unsub();
    }, []);

    // ── Wire Notification Store: start listeners when user + zone are ready ───
    useEffect(() => {
        let lastKey = '';

        const startListeners = () => {
            const { user } = useAuthStore.getState();
            const { currentZone } = useZoneStore.getState();
            const userId = user?.id || user?.uid;

            if (userId && currentZone?.id) {
                const key = `${userId}:${currentZone.id}`;
                if (key !== lastKey) {
                    lastKey = key;
                    useNotificationStore.getState().initialize(userId, currentZone.id);
                }
            }
        };

        // Subscribe to both stores for changes
        const unsubAuth = useAuthStore.subscribe(startListeners);
        const unsubZone = useZoneStore.subscribe(startListeners);

        // Fire immediately in case both are already ready
        startListeners();

        return () => {
            unsubAuth();
            unsubZone();
            useNotificationStore.getState().cleanup();
        };
    }, []);

    // ── Misc utilities ────────────────────────────────────────────────────────
    useEffect(() => {
        ViewportHeightFix.init();

        (async () => {
            await NavigationManager.init();
            const { navigationStateManager } = await import('@/utils/navigation-state');
            await navigationStateManager.init();
        })();

        SafeAreaUtils.init();
        DeviceSafeArea.getInstance().init();
        lowDataOptimizer.init();

        if (typeof window !== 'undefined') {
            (window as any).ViewportHeightFix = ViewportHeightFix;
            (window as any).SafeAreaUtils = SafeAreaUtils;
            (window as any).DeviceSafeArea = DeviceSafeArea;
            (window as any).lowDataOptimizer = lowDataOptimizer;
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw-optimized.js')
                .catch((error) => console.warn('️ Service Worker registration failed:', error));
        }
    }, []);

    return null;
}
