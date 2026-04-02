import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  ClipboardList, 
  LogOut,
  Menu,
  X,
  User,
  UserCog,
  Bell,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import PageTransition from '@/components/PageTransition';
import LiveTracker from '@/components/LiveTracker';
import { TrackingProvider } from '@/context/TrackingProvider';
import BottomNav, { NavItem } from '@/components/BottomNav';

const staffMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ClipboardList, label: 'Orders', path: '/staff/orders' },
  { icon: User, label: 'Profile', path: '/staff/profile' },
];

const staffBottomNavItems: NavItem[] = [
  { icon: ClipboardList, label: 'Orders', path: '/staff/orders' },
  { icon: Home, label: 'Home', path: '/dashboard', isMain: true },
  { icon: User, label: 'Profile', path: '/staff/profile' },
];

interface StaffLayoutProps {
  children?: React.ReactNode;
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <TrackingProvider>
      <div className="min-h-screen flex w-full max-w-full bg-background">
        {/* Overlay */}
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed left-0 top-0 h-[100dvh] w-64 bg-card border-r border-border z-50 transition-transform duration-300 flex flex-col',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-primary" />
              <span className="font-semibold text-lg">
                Staff Portal
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
          <nav className="p-4 space-y-1 flex-1 overflow-y-auto overflow-x-hidden">
            {staffMenuItems.map((item) => {
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

          {/* Bottom Section - Live Tracker and User Profile */}
          <div className="border-t border-border shrink-0">
            {/* Live Tracker */}
            <div className="p-4">
              <LiveTracker className="bg-muted/50 border-none shadow-none" />
            </div>
            
            {/* User Profile */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium text-sm truncate">{user?.name || 'Staff Member'}</p>
                  <p className="text-xs text-muted-foreground truncate uppercase">{user?.role || 'Staff'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 max-w-full">
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-3 lg:px-4 shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-muted rounded-lg shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-base lg:text-lg font-semibold truncate">Staff Portal</h1>
            </div>
            
            <div className="flex items-center shrink-0 ml-2">
              <Link
                to="/staff/notifications"
                className="p-2 text-muted-foreground hover:text-foreground relative transition-colors rounded-lg hover:bg-muted"
              >
                <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-card" />
              </Link>
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-muted/20 p-3 lg:p-4 pb-24 lg:pb-8 max-w-full">
            <div className="max-w-full overflow-hidden">
              <PageTransition>
                {children || <Outlet />}
              </PageTransition>
            </div>
          </main>
          {!sidebarOpen && <BottomNav items={staffBottomNavItems} />}
        </div>
      </div>
    </TrackingProvider>
  );
};

export default StaffLayout;
