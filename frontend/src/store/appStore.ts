import { create } from 'zustand';

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
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  notifications: [
    {
      id: '1',
      title: 'Service Reminder',
      message: 'Your vehicle service is due in 3 days',
      type: 'info',
      read: false,
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'Booking Confirmed',
      message: 'Your car wash booking is confirmed for tomorrow',
      type: 'success',
      read: false,
      createdAt: new Date(),
    },
  ],
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
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
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));
