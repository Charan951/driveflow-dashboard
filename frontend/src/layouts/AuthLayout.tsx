import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PageTransition from '@/components/PageTransition';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-hero">
      <PublicNavbar />
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 pt-24">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-primary-foreground/60 text-sm">
        © 2024 Speshway Solutions. All rights reserved.
      </footer>
    </div>
  );
};

export default AuthLayout;
