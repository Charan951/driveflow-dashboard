import { create } from 'zustand';
import { clearMemoryAccessToken, getMemoryAccessToken } from '@/lib/authToken';

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

interface DecodedToken {
  id: string;
  role?: string;
  tokenVersion?: number;
  exp?: number;
}

const decodeToken = (token: string): DecodedToken | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      if (pad === 1) return null;
      base64 += new Array(5 - pad).join('=');
    }
    const jsonStr = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr) as DecodedToken;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  authHydrated: false,
  role: null,
  login: (user) => {
    const token = getMemoryAccessToken();
    if (token) {
      const decoded = decodeToken(token);
      const tokenRole = decoded?.role;
      if (!tokenRole || tokenRole !== user.role) {
        console.warn('Invalid token role or role mismatch. Session aborted.');
        clearMemoryAccessToken();
        set({ user: null, isAuthenticated: false, role: null, authHydrated: true });
        return;
      }
    }
    set({ user, isAuthenticated: true, role: user.role });
  },
  logout: () => {
    clearMemoryAccessToken();
    sessionStorage.removeItem('hasSeenNoVehicleModal');
    set({ user: null, isAuthenticated: false, role: null, authHydrated: true });
  },
  setAuthHydrated: (hydrated) => set({ authHydrated: hydrated }),
  updateUser: (data) =>
    set((state) => {
      const updatedUser = state.user ? { ...state.user, ...data } : null;
      if (updatedUser) {
        const token = getMemoryAccessToken();
        if (token) {
          const decoded = decodeToken(token);
          const tokenRole = decoded?.role;
          if (!tokenRole || tokenRole !== updatedUser.role) {
            console.warn('Invalid token role or role mismatch in update. Session terminated.');
            clearMemoryAccessToken();
            return { user: null, isAuthenticated: false, role: null, authHydrated: true };
          }
        }
      }
      return {
        user: updatedUser,
        role: data.role !== undefined ? data.role : state.role,
      };
    }),
}));
