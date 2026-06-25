import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const DashboardDispatcher: React.FC = () => {
  const { role } = useAuthStore();

  switch (role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'merchant':
      return <Navigate to="/merchant/dashboard" replace />;
    case 'staff':
      return <Navigate to="/staff/dashboard" replace />;
    case 'customer':
      return <Navigate to="/customer/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default DashboardDispatcher;
