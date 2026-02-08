import api from './api';

export interface AuditLog {
  _id: string;
  action: string;
  targetModel: string;
  targetId: string;
  details: Record<string, unknown>;
  user: {
    _id: string;
    name: string;
    role: string;
  };
  createdAt: string;
}

export interface AuditFilters {
  action?: string;
  user?: string;
  startDate?: string;
  endDate?: string;
}

export const auditService = {
  getAuditLogs: async (params?: AuditFilters): Promise<AuditLog[]> => {
    const response = await api.get('/audit', { params });
    return response.data;
  },
};
