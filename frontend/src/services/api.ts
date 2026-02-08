import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't redirect if it's a login/register failure (handled by component)
      const isAuthRequest = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register');
      
      if (!isAuthRequest) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('auth-storage'); // Clear zustand store
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
