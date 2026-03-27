import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  timeout: 10000, // 10 second timeout
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
      '/auth/google',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/services',
      '/reviews',
      '/products',
      '/settings/public'
    ];
    
    const isPublicRequest = publicEndpoints.some(endpoint => config.url?.includes(endpoint));
    
    if (!isPublicRequest) {
      // Return a rejected promise to stop the request
      return Promise.reject({
        message: 'Authentication required',
        code: 'NO_TOKEN',
        config
      });
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only log errors in development
    if (import.meta.env.DEV) {
      console.error('API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }

    if (error.response && error.response.status === 401) {
      const errorCode = error.response.data?.code;
      const isAuthRequest = error.config?.url?.includes('/auth/');
      
      // Handle different types of 401 errors
      if (errorCode === 'PENDING_APPROVAL') {
        // Don't auto-logout for pending approval - let component handle it
        return Promise.reject(error);
      }
      
      if (!isAuthRequest) {
        // Clear session and redirect for other 401 errors
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('auth-storage');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
