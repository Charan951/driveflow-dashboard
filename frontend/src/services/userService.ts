import api from './api';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  subRole?: 'Driver' | 'Technician' | 'Support' | 'Manager' | null;
  status?: 'Active' | 'Inactive' | 'On Leave';
  isOnline?: boolean;
  isShopOpen?: boolean;
  lastSeen?: string;
  phone?: string;
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
  };
  isApproved?: boolean;
  rejectionReason?: string | null;
}

export const userService = {
  getAllUsers: async (filters?: { role?: string; subRole?: string }) => {
    const params = new URLSearchParams(filters as any).toString();
    const response = await api.get(`/users?${params}`);
    return response.data;
  },

  addStaff: async (data: Partial<User> & { password?: string }) => {
    const response = await api.post('/users', data);
    return response.data;
  },

  updateUserRole: async (id: string, data: { role?: string, subRole?: string, status?: string }) => {
    const response = await api.put(`/users/${id}/role`, data);
    return response.data;
  },

  getUserById: async (id: string) => {
    // Note: The backend currently doesn't have a specific getUserById for admin.
    // However, we can use getAllUsers and find in frontend or we should add it.
    // For now, I will add it to the backend as well to be clean, or I will filter from getAllUsers if I am lazy.
    // But since I am adding a detail page, a direct fetch is better.
    // Let's assume I will add `getUserById` to backend as well.
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  updateProfile: async (data: Partial<User> & { password?: string }) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  approveUser: async (id: string) => {
    const response = await api.put(`/users/${id}/approve`);
    return response.data;
  },

  rejectUser: async (id: string, reason: string) => {
    const response = await api.put(`/users/${id}/reject`, { reason });
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};
