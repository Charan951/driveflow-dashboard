import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import PageTransition from '@/components/PageTransition';

interface CustomerLayoutProps {
  children?: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <Navbar />
        
        <main className="flex-1 pb-20 lg:pb-6">
          {children || <Outlet />}
        </main>

        {/* Bottom Navigation - Mobile */}
        <BottomNav />
      </div>
    </div>
  );
};

export default CustomerLayout;
