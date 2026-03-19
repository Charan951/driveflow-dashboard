import { create } from 'zustand';
import { notificationService, UserNotification } from '../services/notificationService';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
  data?: {
    type?: string;
    bookingId?: string;
    ticketId?: string;
    orderId?: string;
    status?: string;
    distance?: number;
    [key: string]: any;
  };
}

interface AppState {
  sidebarOpen: boolean;
  notifications: Notification[];
  notificationsLoading: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => Promise<void>;
  clearNotifications: () => void;
  clearAllNotifications: () => Promise<void>;
}

const mapUserNotification = (item: UserNotification): Notification => ({
  id: item._id,
  title: item.title,
  message: item.message,
  type: item.type,
  read: item.isRead,
  createdAt: new Date(item.createdAt),
  data: item.data,
});

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  notifications: [],
  notificationsLoading: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  fetchNotifications: async () => {
    set({ notificationsLoading: true });
    try {
      const data = await notificationService.getMyNotifications();
      set({
        notifications: data.map(mapUserNotification),
      });
    } catch (error) {
      console.error(error);
    } finally {
      set({ notificationsLoading: false });
    }
  },
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: Date.now().toString(),
          read: false,
          createdAt: new Date(),
        },
        ...state.notifications,
      ],
    })),
  markAsRead: async (id) => {
    try {
      await notificationService.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      }));
    } catch (error) {
      console.error(error);
    }
  },
  clearNotifications: () => set({ notifications: [] }),
  clearAllNotifications: async () => {
    set({ notificationsLoading: true });
    try {
      await notificationService.clearMyNotifications();
      set({ notifications: [] });
    } catch (error: any) {
      // Only log in development
      if (import.meta.env.DEV) {
        console.error('Clear notifications error:', error);
      }
      
      // Handle specific error cases
      const errorCode = error?.response?.data?.code;
      if (errorCode === 'PENDING_APPROVAL') {
        // Don't clear session for pending approval
        throw error;
      } else if (error?.response?.status === 401) {
        // Clear session for other 401 errors
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('auth-storage');
      }
      
      throw error;
    } finally {
      set({ notificationsLoading: false });
    }
  },
}));
