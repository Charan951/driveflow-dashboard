import api from './api';
import { UserRole } from '@/store/authStore';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup } from 'firebase/auth';
import {
  clearMemoryAccessToken,
  setMemoryAccessToken,
} from '@/lib/authToken';

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
}

export interface PrepareSignupData {
    name: string;
    email: string;
    password: string;
    phone: string;
}

export interface SendSignupOtpData {
    phone: string;
}

export interface PrepareLoginData {
    email: string;
    password: string;
}

export interface SendLoginOtpData {
    email: string;
}

export interface VerifyLoginOtpData {
    email: string;
    otp: string;
}

export interface VerifySignupOtpData {
    phone: string;
    otp: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface ResetPasswordData {
    token: string;
    email?: string;
    password: string;
}

const storeAuthToken = (data: { token?: string }) => {
  if (data.token) {
    setMemoryAccessToken(data.token);
  }
};

export const authService = {
    getSession: async () => {
        const response = await api.get('/auth/session');
        return response.data;
    },
    prepareSignup: async (data: PrepareSignupData) => {
        const response = await api.post('/auth/signup/prepare', data);
        storeAuthToken(response.data);
        return response.data;
    },
    sendSignupOtp: async (data: SendSignupOtpData) => {
        const response = await api.post('/auth/signup/send-otp', data);
        return response.data;
    },
    prepareLogin: async (data: PrepareLoginData) => {
        const response = await api.post('/auth/login/prepare', data);
        storeAuthToken(response.data);
        return response.data;
    },
    sendLoginOtp: async (data: SendLoginOtpData) => {
        const response = await api.post('/auth/login/send-otp', data);
        return response.data;
    },
    verifyLoginOtp: async (data: VerifyLoginOtpData) => {
        const response = await api.post('/auth/login/verify-otp', data);
        storeAuthToken(response.data);
        return response.data;
    },
    verifySignupOtp: async (data: VerifySignupOtpData) => {
        const response = await api.post('/auth/signup/verify-otp', data);
        storeAuthToken(response.data);
        return response.data;
    },
    register: async (data: RegisterData) => {
        const response = await api.post('/auth/register', data);
        storeAuthToken(response.data);
        return response.data;
    },
    login: async (data: LoginData) => {
        const response = await api.post('/auth/login', data);
        storeAuthToken(response.data);
        return response.data;
    },
    googleLogin: async (options?: { signupIfMissing?: boolean }) => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();

            const response = await api.post('/auth/google', {
                idToken,
                signupIfMissing: options?.signupIfMissing ?? false,
            });

            storeAuthToken(response.data);
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
    logout: async () => {
        clearMemoryAccessToken();
        try {
            await api.post('/auth/logout');
        } catch {
            // Cookie may already be cleared or session expired
        }
    },
};
