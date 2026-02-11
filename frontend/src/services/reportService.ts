import api from './api';

export const reportService = {
  getDashboardStats: async () => {
    const response = await api.get('/reports/dashboard');
    return response.data;
  },
  getRevenueAnalytics: async () => {
    const response = await api.get('/reports/revenue');
    return response.data;
  },
  getTopServices: async () => {
    const response = await api.get('/reports/top-services');
    return response.data;
  },
  getMerchantPerformance: async () => {
    const response = await api.get('/reports/merchants');
    return response.data;
  },
};
