import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';

const PublicLayout: React.FC = () => {
  const { pathname } = useLocation();
  const isTrackPage = pathname.startsWith('/track/');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isTrackPage && <PublicNavbar />}
      <main className={isTrackPage ? 'flex-1 min-w-0 overflow-x-hidden' : 'flex-1'}>
        <Outlet />
      </main>
      {!isTrackPage && <Footer />}
    </div>
  );
};

export default PublicLayout;
