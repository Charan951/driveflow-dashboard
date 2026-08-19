import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

import {
  isValidEmail,
  isValidPhone10,
  hasLeadingTrailingSpaces,
  isPasswordTooLong,
  MAX_PASSWORD_LENGTH,
} from '@/lib/formValidation';

type LoginStep = 'identifier' | 'password' | 'emailOtp' | 'phoneOtp';
type IdentifierKind = 'email' | 'phone' | null;

const detectIdentifierKind = (value: string): IdentifierKind => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isValidPhone10(trimmed)) return 'phone';
  if (isValidEmail(trimmed).valid) return 'email';
  return null;
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const locationState = location.state as { from?: { pathname?: string } | string; service?: unknown } | null;

  const [step, setStep] = useState<LoginStep>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const otpSentRef = useRef(false);

  // Locked in once the user moves past the identifier step, so a stray
  // re-render doesn't reclassify "email" vs "phone" mid-flow.
  const [identifierKind, setIdentifierKind] = useState<IdentifierKind>(null);

  const redirectAfterLogin = () => {
    const from =
      locationState?.from && typeof locationState.from === 'object'
        ? locationState.from.pathname
        : typeof locationState?.from === 'string'
          ? locationState.from
          : '/dashboard';
    const serviceState = locationState?.service ? { service: locationState.service } : undefined;
    navigate(from || '/dashboard', { replace: true, state: serviceState });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyLoggedInUser = (data: any) => {
    login({
      _id: data._id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      subRole: data.subRole,
      addresses: data.addresses ?? [],
      location: data.location,
      address: data.address ?? data.location?.address ?? '',
    });
    toast.success('Welcome back!');
    redirectAfterLogin();
  };

  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    const kind = detectIdentifierKind(trimmed);

    if (!kind) {
      toast.error('Enter a valid email address or 10-digit mobile number');
      return;
    }

    if (kind === 'email') {
      if (hasLeadingTrailingSpaces(identifier)) {
        toast.error('Enter a valid email address');
        return;
      }
      setIdentifierKind('email');
      setPassword('');
      setStep('password');
      return;
    }

    // Phone — send the login OTP right away, no password step.
    setIdentifierKind('phone');
    setIsLoading(true);
    try {
      const result = await authService.sendPhoneLoginOtp({ phone: trimmed });
      setMaskedPhone(result.mobile || '');
      setOtp('');
      setStep('phoneOtp');
      const channels: string[] = result.channels || [];
      const label =
        channels.includes('whatsapp') && channels.includes('sms')
          ? 'WhatsApp and SMS'
          : channels.includes('sms')
            ? 'SMS'
            : 'WhatsApp';
      toast.success(`OTP sent to your ${label}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = isValidEmail(identifier);
    if (!emailValidation.valid) {
      toast.error(emailValidation.error || 'invalid email id');
      return;
    }
    if (!password) {
      toast.error('Please enter your password');
      return;
    }
    if (isPasswordTooLong(password)) {
      toast.error('Too long data not accept');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.prepareLogin({ email: identifier, password });
      if (result.skipOtp) {
        applyLoggedInUser(result);
      } else {
        setMaskedPhone(result.mobile || '');
        setOtp('');
        otpSentRef.current = false;
        setStep('emailOtp');
        toast.success('Email and password verified');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 'emailOtp' || otpSentRef.current) return;

    const sendOtp = async () => {
      setIsLoading(true);
      try {
        const result = await authService.sendLoginOtp({ email: identifier });
        otpSentRef.current = true;
        setMaskedPhone(result.mobile || maskedPhone);
        const channels: string[] = result.channels || [];
        const label =
          channels.includes('whatsapp') && channels.includes('sms')
            ? 'WhatsApp and SMS'
            : channels.includes('sms')
              ? 'SMS'
              : 'WhatsApp';
        toast.success(`OTP sent to your ${label}`);
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || 'Failed to send OTP');
      } finally {
        setIsLoading(false);
      }
    };

    sendOtp();
  }, [step, identifier, maskedPhone]);

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.verifyLoginOtp({ email: identifier, otp });
      applyLoggedInUser(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    setIsLoading(true);
    try {
      const result = await authService.sendLoginOtp({ email: identifier });
      setOtp('');
      const channels: string[] = result.channels || [];
      const label =
        channels.includes('whatsapp') && channels.includes('sms')
          ? 'WhatsApp and SMS'
          : channels.includes('sms')
            ? 'SMS'
            : 'WhatsApp';
      toast.success(`OTP resent to your ${label}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.verifyPhoneLoginOtp({ phone: identifier.trim(), otp });
      applyLoggedInUser(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendPhoneOtp = async () => {
    setIsLoading(true);
    try {
      const result = await authService.sendPhoneLoginOtp({ phone: identifier.trim() });
      setOtp('');
      const channels: string[] = result.channels || [];
      const label =
        channels.includes('whatsapp') && channels.includes('sms')
          ? 'WhatsApp and SMS'
          : channels.includes('sms')
            ? 'SMS'
            : 'WhatsApp';
      toast.success(`OTP resent to your ${label}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const data = await authService.googleLogin({ signupIfMissing: true });
      applyLoggedInUser(data);
    } catch (error: unknown) {
      const err = error as {
        code?: string;
        response?: {
          status?: number;
          data?: {
            code?: string;
            message?: string;
            email?: string;
            name?: string;
          };
        };
      };

      if (err.code === 'auth/popup-closed-by-user') {
        return;
      }

      if (
        err.response?.status === 404 &&
        err.response?.data?.code === 'GOOGLE_ACCOUNT_NOT_FOUND'
      ) {
        toast.info('Create an account to continue with Google');
        navigate('/register', {
          replace: false,
          state: {
            ...locationState,
            prefilledEmail: err.response.data.email,
            prefilledName: err.response.data.name,
            fromGoogle: true,
          },
        });
        return;
      }

      toast.error(err.response?.data?.message || 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const backToIdentifier = () => {
    setStep('identifier');
    setIdentifierKind(null);
    setPassword('');
    setOtp('');
    otpSentRef.current = false;
  };

  const stepTitle =
    step === 'identifier'
      ? 'Welcome'
      : step === 'password'
        ? 'Enter Password'
        : 'Verify OTP';

  const stepSubtitle =
    step === 'identifier'
      ? 'Sign in with your email or mobile number'
      : step === 'password'
        ? identifier
        : `Enter the code sent to ${maskedPhone || 'your WhatsApp'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="glass-panel-strong p-5 md:p-6 rounded-3xl shadow-xl">
        <div className="text-center mb-2.5 md:mb-3">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{stepTitle}</h1>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 break-all">
            {stepSubtitle}
          </p>
        </div>

        {step === 'identifier' && (
          <form onSubmit={handleIdentifierSubmit} className="space-y-2.5">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email or mobile number"
                required
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-2.5">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoFocus
                maxLength={MAX_PASSWORD_LENGTH}
                className="w-full pl-10 pr-10 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-[10px] md:text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>

            <button
              type="button"
              onClick={backToIdentifier}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </form>
        )}

        {(step === 'emailOtp' || step === 'phoneOtp') && (
          <form onSubmit={step === 'emailOtp' ? handleVerifyEmailOtp : handleVerifyPhoneOtp} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                autoFocus
                className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-center text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            <motion.button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Verify & Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={backToIdentifier}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={step === 'emailOtp' ? handleResendEmailOtp : handleResendPhoneOtp}
                disabled={isLoading}
                className="text-primary font-medium hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        {step === 'identifier' && (
          <>
            <p className="mt-2 text-[9px] text-center text-muted-foreground">
              By continuing, you agree to our{' '}
              <Link to="/terms" className="underline hover:text-primary">Terms</Link> &{' '}
              <Link to="/privacy" className="underline hover:text-primary">Privacy</Link>
            </p>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                <span className="px-3 bg-card text-muted-foreground">Or</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-1.5 bg-muted/50 rounded-xl font-medium text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-70"
            >
              Google
            </button>
          </>
        )}

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/register" state={locationState} className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </motion.div>
  );
};

export default LoginPage;
