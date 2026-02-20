import { create } from 'zustand';
import { notificationService, UserNotification } from '../services/notificationService';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
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
}

const mapUserNotification = (item: UserNotification): Notification => ({
  id: item._id,
  title: item.title,
  message: item.message,
  type: item.type,
  read: item.isRead,
  createdAt: new Date(item.createdAt),
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
}));
