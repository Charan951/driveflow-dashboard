import api from './api';

export interface Setting {
  key: string;
  value: string | number;
  group?: string;
  description?: string;
}

export const settingService = {
  getSettings: async (): Promise<Setting[]> => {
    const response = await api.get('/settings');
    return response.data;
  },
  updateSetting: async (data: Setting) => {
    const response = await api.put('/settings', data);
    return response.data;
  },
  bulkUpdateSettings: async (settings: Setting[]) => {
    const response = await api.put('/settings/bulk', { settings });
    return response.data;
  },
};
