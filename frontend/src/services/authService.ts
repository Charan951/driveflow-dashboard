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

export interface CompleteSignupData {
    name: string;
    email: string;
    password: string;
    phone: string;
    otp: string;
}

export interface SendPhoneLoginOtpData {
    phone: string;
}

export interface VerifyPhoneLoginOtpData {
    phone: string;
    otp: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface ResetPasswordData {
    email: string;
    otp: string;
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
    checkEmailExists: async (data: { email: string }): Promise<{ exists: boolean }> => {
        const response = await api.post('/auth/login/check-email', data);
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
    sendPhoneLoginOtp: async (data: SendPhoneLoginOtpData) => {
        const response = await api.post('/auth/login/phone/send-otp', data);
        return response.data;
    },
    verifyPhoneLoginOtp: async (data: VerifyPhoneLoginOtpData) => {
        const response = await api.post('/auth/login/phone/verify-otp', data);
        storeAuthToken(response.data);
        return response.data;
    },
    verifySignupOtp: async (data: VerifySignupOtpData) => {
        const response = await api.post('/auth/signup/verify-otp', data);
        storeAuthToken(response.data);
        return response.data;
    },
    /** Phone-first signup step 1 — OTP-verifies the number on its own, before name/email/password exist. */
    sendPhoneSignupOtp: async (data: SendSignupOtpData) => {
        const response = await api.post('/auth/signup/phone/send-otp', data);
        return response.data;
    },
    /** Phone-first signup step 2 — verifies the OTP and creates the account in one call. */
    completeSignup: async (data: CompleteSignupData) => {
        const response = await api.post('/auth/signup/complete', data);
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
        // Revoke the token server-side first — bumps tokenVersion so this
        // token (and any other still-cached copy of it) is rejected from
        // here on. Clear the in-memory token only after, so the request
        // above still authenticates even if the httpOnly cookie is ever
        // unavailable for some reason.
        try {
            await api.post('/auth/logout');
        } catch {
            // Cookie may already be cleared or session expired
        }
        clearMemoryAccessToken();
    },
    /** Permanently deletes the account (profile, vehicles, notifications) —
     * bookings/payments are kept server-side for admin audits, but a new
     * signup with the same email/phone starts fresh since it gets a new
     * user id. Only clears the local session once the server confirms the
     * deletion, so a failed request doesn't leave the app thinking it
     * succeeded. */
    deleteAccount: async () => {
        await api.delete('/users/me');
        clearMemoryAccessToken();
    },
};
