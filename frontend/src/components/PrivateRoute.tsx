import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore, UserRole } from '@/store/authStore';

interface PrivateRouteProps {
  allowedRoles: UserRole[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, role } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page with the return url
    // If the user was trying to access a merchant page, redirect to merchant login?
    // For now, default to main login, but we can refine this.
    const isMerchantRoute = location.pathname.startsWith('/merchant');
    const isStaffRoute = location.pathname.startsWith('/staff');
    
    if (isMerchantRoute) {
       return <Navigate to="/merchant/login" state={{ from: location }} replace />;
    }
    
    if (isStaffRoute) {
       return <Navigate to="/staff/login" state={{ from: location }} replace />;
    }
    
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && !allowedRoles.includes(role)) {
    // User is logged in but doesn't have permission.
    // Redirect to their respective dashboard.
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
        return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
};

export default PrivateRoute;
