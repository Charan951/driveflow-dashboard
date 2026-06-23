import { clearMemoryAccessToken } from '@/lib/authToken';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

export const logoutUser = async () => {
  clearMemoryAccessToken();
  await authService.logout();
  useAuthStore.getState().logout();
};
