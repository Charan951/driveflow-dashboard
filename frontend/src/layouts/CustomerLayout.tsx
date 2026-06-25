import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
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
  UserCircle,
  Battery
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { logoutUser } from '@/lib/logout';
import PageTransition from '@/components/PageTransition';
import BottomNav from '@/components/BottomNav';


const customerMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/customer/dashboard' },
  { icon: Calendar, label: 'My Bookings', path: '/bookings' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
  { icon: Car, label: 'Add Vehicle', path: '/add-vehicle' },
  { icon: Wrench, label: 'Services', path: '/book-service?category=Periodic' },
  { icon: Droplets, label: 'Car Wash', path: '/book-service?category=Wash' },
  { icon: Battery, label: 'Battery/Tyres', path: '/book-service?category=Tyres' },
  { icon: Shield, label: 'Essentials', path: '/book-service?category=Essentials' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: HeadphonesIcon, label: 'Support', path: '/support' },
];

interface CustomerLayoutProps {
  children?: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { notifications, fetchNotifications } = useAppStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  React.useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Close sidebar when location changes
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  React.useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = () => {
    void logoutUser().then(() => navigate('/login', { replace: true }));
  };

  return (
    <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        {sidebarOpen && (
          <motion.div
            style={{ overscrollBehavior: 'contain' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[990]"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          style={{ overscrollBehavior: 'contain' }}
          className={cn(
            'fixed left-0 top-0 h-[100dvh] w-64 bg-card border-r border-border z-[1000] transition-transform duration-300 flex flex-col overflow-hidden',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
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
              className="p-2 hover:bg-muted rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu */}
          <nav 
            style={{ overscrollBehavior: 'contain' }}
            className="p-4 space-y-1 flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
          >
            {customerMenuItems.map((item) => {
              const isActive = location.pathname + location.search === item.path || 
                              (item.path === '/customer/dashboard' && location.pathname === '/customer/dashboard');
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

          {/* Profile & Logout */}
          <div className="p-4 pt-3 border-t border-border shrink-0 bg-card pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3 px-2 py-2 mb-2 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden text-left">
                <p className="text-sm font-semibold truncate">{user?.name || 'Customer'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || user?.phone || ''}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSidebarOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 max-w-full">
          {/* Header */}
          <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6 bg-card/95 backdrop-blur-xl border-b border-border">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-muted rounded-xl"
              >
                <Menu className="w-6 h-6" />
              </button>
              <img src="/footer.png" alt="Carzzi Logo" width={144} height={40} loading="lazy" className="h-10 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/notifications"
                className="p-2 text-muted-foreground hover:text-foreground relative transition-colors rounded-lg hover:bg-muted"
              >
                <Bell className="w-5 h-5" />
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-card"
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

            </div>
          </header>

          <main className="flex-1 pb-20 lg:pb-6 min-w-0 overflow-x-hidden">
            <div className="w-full h-full min-w-0 max-w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
              <PageTransition>
                {children || <Outlet />}
              </PageTransition>
            </div>
          </main>
          {!sidebarOpen && <BottomNav />}
        </div>
      </div>
  );
};

export default CustomerLayout;
