import api from './api';

interface DateRange {
  startDate?: string;
  endDate?: string;
}

export const reportService = {
  getDashboardStats: async (params?: DateRange) => {
    const response = await api.get('/reports/dashboard', { params });
    return response.data;
  },
  getRevenueAnalytics: async (params?: DateRange) => {
    const response = await api.get('/reports/revenue', { params });
    return response.data;
  },
  getTopServices: async (params?: DateRange) => {
    const response = await api.get('/reports/top-services', { params });
    return response.data;
  },
  getMerchantPerformance: async (params?: DateRange) => {
    const response = await api.get('/reports/merchants', { params });
    return response.data;
  },
  exportReport: async (params?: DateRange) => {
    const response = await api.get('/reports/export', { params, responseType: 'blob' });
    return response.data;
  },
};
