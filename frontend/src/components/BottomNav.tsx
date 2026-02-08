import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Settings, Droplets, Battery, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Settings, label: 'Services', path: '/dashboard/services' },
  { icon: Shield, label: 'Insurance', path: '/insurance' },
  { icon: Home, label: 'Home', path: '/dashboard', isMain: true },
  { icon: Droplets, label: 'Car Wash', path: '/car-wash' },
  { icon: Battery, label: 'Tires', path: '/tires-battery' },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border pb-safe lg:hidden z-40">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const isMain = item.isMain;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center min-w-[60px] py-1 relative',
                isMain && '-mt-6'
              )}
            >
              {isMain ? (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center shadow-lg',
                    'bg-gradient-primary'
                  )}
                >
                  <item.icon className="w-6 h-6 text-primary-foreground" />
                </motion.div>
              ) : (
                <>
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                      isActive ? 'bg-primary/10' : 'bg-transparent'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'w-5 h-5 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                  </motion.div>
                  <span
                    className={cn(
                      'text-[10px] mt-0.5 font-medium',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
              {isActive && !isMain && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
