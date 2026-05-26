import React from 'react';
import { useGlobalSync } from '@/hooks/useGlobalSync';
import type { GlobalSyncPayload } from '@/lib/globalSync';

type GlobalSyncRefreshProps = {
  entities?: string[];
  onSync: (payload: GlobalSyncPayload) => void;
  enabled?: boolean;
  children: React.ReactNode;
};

/**
 * Re-runs [onSync] when a global socket sync event matches [entities].
 * Wrap list/detail pages instead of hand-rolling `global:sync` listeners.
 */
const GlobalSyncRefresh = ({ entities, onSync, enabled = true, children }: GlobalSyncRefreshProps) => {
  useGlobalSync({ entities, onSync, enabled });
  return <>{children}</>;
};

export default GlobalSyncRefresh;
