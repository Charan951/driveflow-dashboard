import axios from 'axios';

const API_URL = 'http://localhost:5000/api/reports';

const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return { headers: { Authorization: `Bearer ${user.token}` } };
};

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
