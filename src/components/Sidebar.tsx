import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Car, 
  Settings, 
  FileText, 
  Shield, 
  Droplets, 
  Battery, 
  User, 
  HelpCircle,
  LayoutDashboard,
  Calendar,
  MessageSquare,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import { slideInLeft } from '@/animations/variants';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Car, label: 'My Vehicles', path: '/add-vehicle' },
  { icon: Settings, label: 'Services', path: '/services' },
  { icon: Calendar, label: 'Book Service', path: '/book-service' },
  { icon: Droplets, label: 'Car Wash', path: '/car-wash' },
  { icon: Battery, label: 'Tires & Battery', path: '/tires-battery' },
  { icon: Shield, label: 'Insurance', path: '/insurance' },
  { icon: FileText, label: 'Documents', path: '/documents' },
  { icon: MessageSquare, label: 'Support', path: '/support' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <>
      {/* Overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial="hidden"
        animate={sidebarOpen ? 'visible' : 'hidden'}
        variants={slideInLeft}
        className={cn(
          'fixed left-0 top-0 h-full w-72 bg-card border-r border-border z-50',
          'lg:translate-x-0 lg:static lg:block',
          !sidebarOpen && 'hidden lg:block'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground">VehicleCare</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Help Card */}
        <div className="absolute bottom-6 left-4 right-4">
          <div className="glass-panel p-4 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-sm">Need Help?</p>
                <p className="text-xs text-muted-foreground">We're here 24/7</p>
              </div>
            </div>
            <Link
              to="/support"
              className="block w-full text-center py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
