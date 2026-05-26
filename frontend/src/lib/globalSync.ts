export type GlobalSyncPayload = {
  entity: string;
  action: string;
  data?: unknown;
  timestamp?: string;
};

export const GLOBAL_SYNC_EVENT = 'carzzi:global-sync';

export const dispatchGlobalSync = (payload: GlobalSyncPayload) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(GLOBAL_SYNC_EVENT, { detail: payload }));
};

export const normalizeGlobalSyncPayload = (raw: unknown): GlobalSyncPayload | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const entity = typeof record.entity === 'string' ? record.entity.toLowerCase() : '';
  const action = typeof record.action === 'string' ? record.action.toLowerCase() : '';
  if (!entity || !action) return null;
  return {
    entity,
    action,
    data: record.data,
    timestamp: typeof record.timestamp === 'string' ? record.timestamp : undefined,
  };
};
