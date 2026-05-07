import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const AUTH_PERSIST_KEY = 'auth-storage';

/** One-time: move auth from localStorage so existing tabs keep login after this change. */
const migrateAuthToSessionStorage = () => {
  try {
    if (!sessionStorage.getItem(AUTH_PERSIST_KEY) && localStorage.getItem(AUTH_PERSIST_KEY)) {
      sessionStorage.setItem(AUTH_PERSIST_KEY, localStorage.getItem(AUTH_PERSIST_KEY)!);
      localStorage.removeItem(AUTH_PERSIST_KEY);
    }
    if (!sessionStorage.getItem('token') && localStorage.getItem('token')) {
      sessionStorage.setItem('token', localStorage.getItem('token')!);
      localStorage.removeItem('token');
    }
  } catch {
    /* private mode / quota */
  }
};
migrateAuthToSessionStorage();

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
  role: UserRole;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      role: null,
      login: (user) => set({ user, isAuthenticated: true, role: user.role }),
      logout: () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('hasSeenNoVehicleModal');
        sessionStorage.removeItem(AUTH_PERSIST_KEY);
        localStorage.removeItem('token');
        localStorage.removeItem(AUTH_PERSIST_KEY);
        set({ user: null, isAuthenticated: false, role: null });
      },
      updateUser: (data) =>
        set((state) => {
          const updatedUser = state.user ? { ...state.user, ...data } : null;
          return {
            user: updatedUser,
            role: data.role !== undefined ? data.role : state.role,
          };
        }),
    }),
    {
      name: AUTH_PERSIST_KEY,
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
