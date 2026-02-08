import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const PublicRoute: React.FC = () => {
  const { isAuthenticated, role } = useAuthStore();

  if (isAuthenticated) {
    // Redirect to respective dashboard based on role
    switch (role) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'merchant':
        return <Navigate to="/merchant/dashboard" replace />;
      case 'staff':
        return <Navigate to="/staff/dashboard" replace />;
      case 'customer':
        return <Navigate to="/dashboard" replace />;
      default:
        // If role is unknown but authenticated, maybe logout or go to home?
        // For now, let's stay on public route or go to home
        return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export default PublicRoute;
