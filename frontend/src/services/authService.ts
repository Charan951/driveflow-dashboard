import api from './api';
import { UserRole } from '@/store/authStore';

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export const authService = {
    register: async (data: RegisterData) => {
        const response = await api.post('/auth/register', data);
        if (response.data.token) {
            sessionStorage.setItem('token', response.data.token);
        }
        return response.data;
    },
    login: async (data: LoginData) => {
        const response = await api.post('/auth/login', data);
        if (response.data.token) {
            sessionStorage.setItem('token', response.data.token);
        }
        return response.data;
    },
    logout: () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('auth-storage');
    },
};
