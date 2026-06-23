import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { getApiBaseUrl } from '@/lib/apiBase';
import { clearMemoryAccessToken, getMemoryAccessToken } from '@/lib/authToken';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  withCredentials: true,
});

let handlingUnauthorized = false;

api.interceptors.request.use((config) => {
  config.headers['X-Client-Platform'] = 'web';

  const memoryToken = getMemoryAccessToken();
  if (memoryToken) {
    config.headers.Authorization = `Bearer ${memoryToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error('API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }

    if (error.response?.status === 401) {
      const errorCode = error.response.data?.code;
      const url = String(error.config?.url || '');
      const isAuthRequest = url.includes('/auth/');
      const { isAuthenticated, authHydrated } = useAuthStore.getState();

      if (errorCode === 'PENDING_APPROVAL') {
        return Promise.reject(error);
      }

      if (
        !isAuthRequest &&
        authHydrated &&
        isAuthenticated &&
        !handlingUnauthorized
      ) {
        handlingUnauthorized = true;
        clearMemoryAccessToken();
        useAuthStore.getState().logout();
        window.setTimeout(() => {
          handlingUnauthorized = false;
        }, 1000);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
