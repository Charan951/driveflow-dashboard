import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type LoginStep = 'credentials' | 'otp';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const locationState = location.state as { from?: { pathname?: string } | string; service?: unknown } | null;

  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const otpSentRef = useRef(false);

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

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.prepareLogin({ email, password });
      setMaskedPhone(result.mobile || '');
      setOtp('');
      otpSentRef.current = false;
      setStep('otp');
      toast.success('Email and password verified');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 'otp' || otpSentRef.current) return;

    const sendOtp = async () => {
      setIsLoading(true);
      try {
        const result = await authService.sendLoginOtp({ email });
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
  }, [step, email, maskedPhone]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.verifyLoginOtp({ email, otp });
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const result = await authService.sendLoginOtp({ email });
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="glass-panel-strong p-5 md:p-6 rounded-3xl shadow-xl">
        <div className="text-center mb-2.5 md:mb-3">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            {step === 'credentials' ? 'Welcome Back' : 'Verify OTP'}
          </h1>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
            {step === 'credentials'
              ? 'Sign in to your account'
              : `Enter the code sent to ${maskedPhone || 'your WhatsApp'}`}
          </p>
        </div>

        {step === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-2.5">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
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
                onClick={() => {
                  setStep('credentials');
                  otpSentRef.current = false;
                }}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading}
                className="text-primary font-medium hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        {step === 'credentials' && (
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
