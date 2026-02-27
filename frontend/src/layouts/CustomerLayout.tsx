import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import PageTransition from '@/components/PageTransition';
import { TrackingProvider } from '@/context/TrackingProvider';

interface CustomerLayoutProps {
  children?: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  return (
    <TrackingProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          <Navbar />
          <main className="flex-1 pb-20 lg:pb-6">
            <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              {children || <Outlet />}
            </div>
          </main>
          <BottomNav />
        </div>
      </div>
    </TrackingProvider>
  );
};

export default CustomerLayout;
