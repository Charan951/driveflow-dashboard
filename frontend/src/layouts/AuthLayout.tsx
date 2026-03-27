import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PageTransition from '@/components/PageTransition';

export const AuthLayout: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-gradient-hero relative overflow-hidden">
      <PublicNavbar />
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 pt-12 md:pt-14">
        <div className="w-full max-w-[340px] md:max-w-[360px]">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>

        {/* Footer inside main to ensure visibility */}
        <footer className="mt-2 text-center">
          <p className="text-[9px] md:text-[10px] text-primary-foreground/50">
            © 2024 Speshway Solutions. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default AuthLayout;
