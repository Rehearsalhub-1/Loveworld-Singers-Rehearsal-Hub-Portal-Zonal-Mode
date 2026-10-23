'use client';

import { useEffect, useRef, useCallback } from 'react';
import { BackendAPI } from '@/lib/api-client';

type EventHandler = (data: unknown, event?: { sequence?: number; resource: string; id: string }) => void;

/**
 * React Hook for declarative WebSocket subscriptions matching rehearsalhubv2.
 * Automatically manages subscription lifecycle and teardown.
 *
 * @param resource - e.g. 'songs', 'song', 'praise_nights', 'chats', 'messages', 'programs', 'calls'
 * @param id - Entity ID or 'all'
 * @param handler - Event callback function
 * @param enabled - Optional flag to conditionally enable/disable
 */
export function useWebSocket(
  resource: string,
  id: string,
  handler: EventHandler,
  enabled = true
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const stableHandler = useCallback((data: unknown, ev: any) => {
    handlerRef.current(data, ev);
  }, []);

  useEffect(() => {
    if (!enabled || !resource || !id) return;
    const unsub = BackendAPI.realtime.subscribe(resource, id, stableHandler);
    return unsub;
  }, [resource, id, enabled, stableHandler]);
}

export default useWebSocket;
