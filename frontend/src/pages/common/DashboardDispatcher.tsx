import React from 'react';
import { useAuthStore } from '@/store/authStore';
import AdminDashboard from '@/pages/admin/Dashboard';
import MerchantDashboard from '@/pages/merchant/Dashboard';
import StaffDashboardPage from '@/pages/staff/StaffDashboardPage';
import DashboardPage from '@/pages/customer/DashboardPage';
import AdminLayout from '@/layouts/AdminLayout';
import MerchantLayout from '@/layouts/MerchantLayout';
import StaffLayout from '@/layouts/StaffLayout';
import CustomerLayout from '@/layouts/CustomerLayout';

const DashboardDispatcher: React.FC = () => {
  const { role } = useAuthStore();

  switch (role) {
    case 'admin':
      return (
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      );
    case 'merchant':
      return (
        <MerchantLayout>
          <MerchantDashboard />
        </MerchantLayout>
      );
    case 'staff':
      return (
        <StaffLayout>
          <StaffDashboardPage />
        </StaffLayout>
      );
    case 'customer':
      return (
        <CustomerLayout>
          <DashboardPage />
        </CustomerLayout>
      );
    default:
      return (
        <CustomerLayout>
          <DashboardPage />
        </CustomerLayout>
      );
  }
};

export default DashboardDispatcher;
