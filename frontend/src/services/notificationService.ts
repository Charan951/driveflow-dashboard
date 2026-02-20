import api from './api';

export interface NotificationPayload {
  userId?: string;
  recipientId?: string;
  targetGroup?: string;
  title: string;
  message: string;
  type?: string;
  read?: boolean;
}

export interface NotificationHistoryItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  targetGroup?: string;
  recipient?: {
    name: string;
    email: string;
  };
}

export interface UserNotification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  sendNotification: async (data: NotificationPayload) => {
    const response = await api.post('/notifications', data);
    return response.data;
  },
  getNotificationHistory: async (): Promise<NotificationHistoryItem[]> => {
    const response = await api.get('/notifications/history');
    return response.data;
  },
  getMyNotifications: async (): Promise<UserNotification[]> => {
    const response = await api.get('/notifications/my');
    return response.data;
  },
  markAsRead: async (id: string) => {
    const response = await api.put(`/notifications/${id}/read`, {});
    return response.data;
  },
};
