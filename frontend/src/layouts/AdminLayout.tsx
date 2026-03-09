import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  Calendar, 
  UserCog, 
  Store, 
  CheckSquare, 
  Map, 
  DollarSign, 
  FileText, 
  Shield, 
  Package, 
  Headphones, 
  Star, 
  BarChart, 
  Settings, 
  FileClock,
  LogOut,
  X,
  Menu,
  Bell
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Customers', path: '/admin/customers' },
  { icon: Car, label: 'Vehicles', path: '/admin/vehicles' },
  { icon: Calendar, label: 'Bookings', path: '/admin/bookings' },
  { icon: UserCog, label: 'Staff', path: '/admin/staff' },
  { icon: Store, label: 'Merchants', path: '/admin/merchants' },
  { icon: CheckSquare, label: 'Approvals', path: '/admin/approvals' },
  { icon: Map, label: 'Live Tracking', path: '/admin/tracking' },
  { icon: DollarSign, label: 'Payments', path: '/admin/payments' },
  { icon: FileText, label: 'Documents', path: '/admin/documents' },
  { icon: Shield, label: 'Insurance', path: '/admin/insurance' },
  { icon: Package, label: 'Stock', path: '/admin/stock' },
  { icon: Package, label: 'Services', path: '/admin/services' },
  { icon: Headphones, label: 'Support', path: '/admin/support' },
  { icon: Star, label: 'Feedback', path: '/admin/feedback' },
  { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
  { icon: BarChart, label: 'Reports', path: '/admin/reports' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
  { icon: FileClock, label: 'Audit Logs', path: '/admin/audit' },
];

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
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
        <div className="flex items-center justify-between h-16 px-6 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <span className="font-semibold text-lg">
              Admin Portal
            </span>
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
          {adminMenuItems.map((item) => {
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

        {/* User Profile */}
        <div className="p-4 border-t border-border shrink-0">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 overflow-hidden text-left">
              <p className="font-medium text-sm truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate uppercase">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-muted-foreground hover:text-foreground relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-card" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-6 lg:p-8">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );};

export default AdminLayout;
