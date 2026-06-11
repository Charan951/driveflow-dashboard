import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';

const PublicLayout: React.FC = () => {
  const { pathname } = useLocation();
  const isTrackPage = pathname.startsWith('/track/');

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden w-full">
      {!isTrackPage && <PublicNavbar />}
      <main className="flex-1 min-w-0 overflow-x-hidden w-full">
        <Outlet />
      </main>
      {!isTrackPage && <Footer />}
    </div>
  );
};

export default PublicLayout;
