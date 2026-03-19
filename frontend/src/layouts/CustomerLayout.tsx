import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Bell,
  CreditCard,
  Car,
  Calendar,
  FileText,
  User,
  HeadphonesIcon,
  LogOut,
  Menu,
  X,
  Wrench,
  Droplets,
  Shield,
  UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import PageTransition from '@/components/PageTransition';
import BottomNav from '@/components/BottomNav';
import { TrackingProvider } from '@/context/TrackingProvider';

const customerMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Calendar, label: 'My Bookings', path: '/bookings' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
  { icon: Car, label: 'Add Vehicle', path: '/add-vehicle' },
  { icon: Wrench, label: 'Services', path: '/dashboard/services' },
  { icon: Droplets, label: 'Car Wash', path: '/car-wash' },
  { icon: Shield, label: 'Insurance', path: '/insurance' },
  { icon: FileText, label: 'Documents', path: '/documents' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: HeadphonesIcon, label: 'Support', path: '/support' },
];

interface CustomerLayoutProps {
  children?: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <TrackingProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
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
        <aside
          className={cn(
            'fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-50 transition-transform duration-300 flex flex-col',
            'lg:translate-x-0 lg:static',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <UserCircle className="w-6 h-6 text-primary" />
              <span className="font-semibold text-lg">Customer Portal</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu */}
          <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
            {customerMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 shrink-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6 bg-card/95 backdrop-blur-xl border-b border-border">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-muted rounded-xl"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="font-semibold text-lg">Customer Portal</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/notifications"
                className="p-2 text-muted-foreground hover:text-foreground relative transition-colors rounded-lg hover:bg-muted"
              >
                <Bell className="w-5 h-5" />
              </Link>
              <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
          </header>

          <main className="flex-1 pb-20 lg:pb-6 min-w-0">
            <div className="w-full h-full min-w-0 px-4 sm:px-6 lg:px-8">
              <PageTransition>
                {children || <Outlet />}
              </PageTransition>
            </div>
          </main>
          <BottomNav />
        </div>
      </div>
    </TrackingProvider>
  );
};

export default CustomerLayout;
