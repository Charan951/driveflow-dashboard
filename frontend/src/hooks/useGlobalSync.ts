import { useEffect, useRef } from 'react';
import { GLOBAL_SYNC_EVENT, normalizeGlobalSyncPayload, type GlobalSyncPayload } from '@/lib/globalSync';

type UseGlobalSyncOptions = {
  entities?: string[];
  onSync: (payload: GlobalSyncPayload) => void;
  enabled?: boolean;
};

/**
 * Subscribe to app-wide sync events (from SocketNotificationListener + socket sync:*).
 */
export function useGlobalSync({ entities, onSync, enabled = true }: UseGlobalSyncOptions) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: Event) => {
      const payload = normalizeGlobalSyncPayload((event as CustomEvent).detail);
      if (!payload) return;

      if (entities?.length && !entities.includes(payload.entity)) {
        return;
      }

      onSyncRef.current(payload);
    };

    window.addEventListener(GLOBAL_SYNC_EVENT, handler);
    return () => window.removeEventListener(GLOBAL_SYNC_EVENT, handler);
  }, [enabled, entities?.join(',')]);
}
