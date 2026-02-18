import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  ClipboardList, 
  LogOut,
  Menu,
  X,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import PageTransition from '@/components/PageTransition';
import LiveTracker from '@/components/LiveTracker';
import { TrackingProvider } from '@/context/TrackingContext';
import { useTracking } from '@/context/TrackingContext';

const staffMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/staff/dashboard' },
  { icon: ClipboardList, label: 'Orders', path: '/staff/orders' },
];

export const StaffLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const ActiveBookingChip: React.FC = () => {
    const { activeBookingId, setActiveBookingId, isTracking } = useTracking();
    if (!activeBookingId) return null;
    const shortId = activeBookingId.slice(-6).toUpperCase();
    return (
      <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-1.5 border border-border">
        <span className="text-xs font-medium text-foreground">
          Active #{shortId}
        </span>
        <button
          onClick={() => setActiveBookingId(null)}
          className="text-xs px-2 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
          disabled={!isTracking}
          title={isTracking ? 'Unbind from booking' : 'Start sharing to unbind'}
        >
          Unbind
        </button>
      </div>
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/staff/login', { replace: true });
  };

  return (
    <TrackingProvider>
      <div className="min-h-screen flex w-full bg-background">
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
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
          <span className="font-semibold text-lg">Staff Portal</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className="p-4 space-y-1 flex-1">
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

        {/* Logout */}
        <div className="p-4 border-t border-border mt-auto space-y-4">
          <LiveTracker className="bg-muted/50 border-none shadow-none" />
          
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
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6 bg-card/95 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-muted rounded-xl"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-semibold text-lg">Staff Portal</h1>
          </div>
          <div className="flex items-center gap-3">
            <ActiveBookingChip />
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
    </TrackingProvider>
  );
};

export default StaffLayout;
