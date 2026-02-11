import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'customer' | 'staff' | 'merchant' | 'admin' | null;
export type UserSubRole = 'Driver' | 'Technician' | 'Support' | 'Manager' | null;

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: UserRole;
  subRole?: UserSubRole;
  isShopOpen?: boolean;
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
        set({ user: null, isAuthenticated: false, role: null });
      },
      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
