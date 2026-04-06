import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import { pageVariants } from '@/animations/variants';

interface PageTransitionProps {
  children?: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    <div className="w-full h-full">
      {children || <Outlet />}
    </div>
  );
};

export default PageTransition;
