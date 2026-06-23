import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Skeleton } from '@/components/ui/skeleton';

const PublicRoute: React.FC = () => {
  const { isAuthenticated, authHydrated } = useAuthStore();

  if (!authHydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
