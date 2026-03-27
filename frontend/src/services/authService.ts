import api from './api';
import { UserRole } from '@/store/authStore';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup } from 'firebase/auth';

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

export interface ResetPasswordData {
    token: string;
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
    googleLogin: async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();
            
            const response = await api.post('/auth/google', { idToken });
            
            if (response.data.token) {
                sessionStorage.setItem('token', response.data.token);
            }
            return response.data;
        } catch (error) {
            console.error('Google login error:', error);
            throw error;
        }
    },
    forgotPassword: async (email: string) => {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },
    resetPassword: async (data: ResetPasswordData) => {
        const response = await api.post('/auth/reset-password', data);
        return response.data;
    },
    logout: () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('auth-storage');
    },
};
