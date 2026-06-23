import { create } from 'zustand';
import { clearMemoryAccessToken } from '@/lib/authToken';

const LEGACY_AUTH_PERSIST_KEY = 'auth-storage';

// Drop stale persisted auth flags that caused login/dashboard redirect loops.
try {
  sessionStorage.removeItem(LEGACY_AUTH_PERSIST_KEY);
  sessionStorage.removeItem('token');
  localStorage.removeItem('token');
  localStorage.removeItem(LEGACY_AUTH_PERSIST_KEY);
} catch {
  /* private mode */
}

export type UserRole = 'customer' | 'staff' | 'merchant' | 'admin' | null;
export type UserSubRole = 'Driver' | 'Support' | 'Manager' | null;

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: UserRole;
  subRole?: UserSubRole;
  status?: string;
  category?: string[];
  isShopOpen?: boolean;
  address?: string;
  addresses?: {
    label: string;
    address: string;
    lat: number;
    lng: number;
    isDefault: boolean;
  }[];
  paymentMethods?: {
    type: string;
    label: string;
    details?: string;
    isDefault: boolean;
  }[];
  location?: {
    lat: number;
    lng: number;
    address: string;
    updatedAt?: string;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  authHydrated: boolean;
  role: UserRole;
  login: (user: User) => void;
  logout: () => void;
  setAuthHydrated: (hydrated: boolean) => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  authHydrated: false,
  role: null,
  login: (user) => set({ user, isAuthenticated: true, role: user.role }),
  logout: () => {
    clearMemoryAccessToken();
    sessionStorage.removeItem('hasSeenNoVehicleModal');
    set({ user: null, isAuthenticated: false, role: null, authHydrated: true });
  },
  setAuthHydrated: (hydrated) => set({ authHydrated: hydrated }),
  updateUser: (data) =>
    set((state) => {
      const updatedUser = state.user ? { ...state.user, ...data } : null;
      return {
        user: updatedUser,
        role: data.role !== undefined ? data.role : state.role,
      };
    }),
}));
