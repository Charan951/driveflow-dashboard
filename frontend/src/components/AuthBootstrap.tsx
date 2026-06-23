import React, { useEffect } from 'react';
import { authService } from '@/services/authService';
import { getMemoryAccessToken } from '@/lib/authToken';
import { useAuthStore } from '@/store/authStore';

const AuthBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { login, logout, setAuthHydrated } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const session = await authService.getSession();
        if (cancelled) return;
        login({
          _id: session._id,
          name: session.name,
          email: session.email,
          phone: session.phone ?? '',
          role: session.role,
          subRole: session.subRole,
          addresses: session.addresses ?? [],
          location: session.location,
          address: session.address ?? session.location?.address ?? '',
        });
      } catch {
        if (cancelled) return;
        // A failed bootstrap check must not wipe a login that just completed.
        if (getMemoryAccessToken()) return;
        if (useAuthStore.getState().isAuthenticated) {
          logout();
        }
      } finally {
        if (!cancelled) {
          setAuthHydrated(true);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [login, logout, setAuthHydrated]);

  return <>{children}</>;
};

export default AuthBootstrap;
