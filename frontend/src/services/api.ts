import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // List of public endpoints that don't need a token
    const publicEndpoints = [
      '/auth/login',
      '/auth/register',
      '/services',
      '/reviews',
      '/products',
      '/settings/public'
    ];
    
    const isPublicRequest = publicEndpoints.some(endpoint => config.url?.includes(endpoint));
    
    if (!isPublicRequest) {
      // Return a rejected promise to stop the request
      return Promise.reject({
        message: 'No authentication token found',
        config
      });
    }
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
