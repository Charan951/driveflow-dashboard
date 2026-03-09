import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const PublicRoute: React.FC = () => {
  const { isAuthenticated, role } = useAuthStore();

  if (isAuthenticated) {
    // All roles now redirect to the single dashboard route
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
