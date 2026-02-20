import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  title?: string;
  showBack?: boolean;
  transparent?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  title = 'VehicleCare', 
  showBack = false,
  transparent = false 
}) => {
  const { toggleSidebar, notifications, fetchNotifications } = useAppStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6',
        transparent
          ? 'bg-transparent'
          : 'bg-card/95 backdrop-blur-xl border-b border-border'
      )}
    >
      {/* Left - Menu/Back */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-muted rounded-xl transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="font-semibold text-lg hidden sm:block">{title}</h1>
      </div>

      {/* Right - Notifications & Avatar */}
      <div className="flex items-center gap-3">
        <Link
          to={
            user?.role === 'admin'
              ? '/admin/my-notifications'
              : user?.role === 'merchant'
                ? '/merchant/notifications'
                : user?.role === 'staff'
                  ? '/staff/notifications'
                  : '/notifications'
          }
          className="relative p-2 hover:bg-muted rounded-xl transition-colors"
        >
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
              >
                {unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <div className="flex items-center gap-2 p-1 hover:bg-muted rounded-xl transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-primary-foreground" />
                )}
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer w-full flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer w-full flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Navbar;
