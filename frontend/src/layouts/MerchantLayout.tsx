import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  Star,
  LogOut,
  Menu,
  X,
  Store,
  Users,
  ClipboardList,
  Layers,
  MessageSquare,
  Car,
  User,
  Home
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import PageTransition from '@/components/PageTransition';
import BottomNav, { NavItem } from '@/components/BottomNav';

const merchantMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ClipboardList, label: 'Orders', path: '/merchant/orders' },
  { icon: MessageSquare, label: 'Feedback', path: '/merchant/feedback' },
  { icon: User, label: 'Profile', path: '/merchant/profile' },
];

const merchantBottomNavItems: NavItem[] = [
  { icon: ClipboardList, label: 'Orders', path: '/merchant/orders' },
  { icon: Home, label: 'Home', path: '/dashboard', isMain: true },
  { icon: User, label: 'Profile', path: '/merchant/profile' },
];

interface MerchantLayoutProps {
  children?: React.ReactNode;
}

export const MerchantLayout: React.FC<MerchantLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

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
    logout();
    navigate('/login', { replace: true });
  };

  const filteredMenuItems = merchantMenuItems.map(item => {
    if (item.label === 'Dashboard' && user?.role === 'admin') {
      return { ...item, path: '/dashboard' };
    }
    return item;
  });

  return (
    <div className="min-h-screen flex w-full bg-background">
      {sidebarOpen && (
        <motion.div
          style={{ overscrollBehavior: 'contain' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        style={{ overscrollBehavior: 'contain' }}
        className={cn(
          'fixed left-0 top-0 h-[100dvh] w-64 max-w-[85vw] bg-card border-r border-border z-50 transition-transform duration-300 flex flex-col overflow-hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            <span className="font-semibold text-lg">
              {user?.role === 'admin' ? 'Admin Portal' : 'Merchant Portal'}
            </span>
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
          {filteredMenuItems.map((item) => {
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

        {/* User profile & Logout */}
        <div className="p-4 pt-3 border-t border-border shrink-0 bg-card pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 px-2 py-2 mb-2 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden text-left">
              <p className="font-medium text-sm truncate">{user?.name || 'Merchant User'}</p>
              <p className="text-xs text-muted-foreground truncate uppercase">{user?.role || 'merchant'}</p>
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
            <h1 className="font-semibold text-lg">
              {user?.role === 'admin' ? 'Admin Portal' : 'Merchant Portal'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Store className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
        </header>

        <main className={cn(
          "flex-1 overflow-x-hidden bg-muted/20 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-full min-w-0",
          sidebarOpen ? "overflow-y-hidden" : "overflow-y-auto"
        )}>
          <div className="max-w-full min-w-0 overflow-x-hidden">
            <PageTransition>
              {children || <Outlet />}
            </PageTransition>
          </div>
        </main>
        {!sidebarOpen && <BottomNav items={merchantBottomNavItems} />}
      </div>
    </div>
  );
};

export default MerchantLayout;
