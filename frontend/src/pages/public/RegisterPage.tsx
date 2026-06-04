import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

import { isStrongPassword, isValidEmail, isValidPhone10, isEmailTooLong, hasLeadingTrailingSpaces, isPasswordTooLong, isValidName, isNameTooLong, MAX_NAME_LENGTH, MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH, isDisposableEmail } from '@/lib/formValidation';

type RegisterStep = 'form' | 'otp';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locationState = location.state as any;

  const [step, setStep] = useState<RegisterStep>('form');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const otpSentRef = useRef(false);

  useEffect(() => {
    const state = location.state as {
      prefilledEmail?: string;
      prefilledName?: string;
      fromGoogle?: boolean;
    } | null;

    if (state?.prefilledEmail) {
      setFormData((prev) => ({
        ...prev,
        email: state.prefilledEmail || prev.email,
        name: state.prefilledName || prev.name,
      }));
    }
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Please enter your full name');
      return false;
    }
    if (isNameTooLong(formData.name)) {
      toast.error('Too long data not accept');
      return false;
    }
    if (!isValidName(formData.name)) {
      toast.error('Please enter a valid full name (must contain letters only with spaces, apostrophes, or hyphens)');
      return false;
    }

    const emailValidation = isValidEmail(formData.email);
    if (!emailValidation.valid) {
      toast.error(emailValidation.error || 'invalid email id');
      return false;
    }

    if (!isValidPhone10(formData.phone)) {
      toast.error('Please enter a valid 10-digit WhatsApp number');
      return false;
    }

    if (isPasswordTooLong(formData.password)) {
      toast.error('Too long data not accept');
      return false;
    }
    if (isPasswordTooLong(formData.confirmPassword)) {
      toast.error('Too long data not accept');
      return false;
    }
    if (!isStrongPassword(formData.password)) {
      toast.error('Password must be 8+ chars with upper, lower, and number');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    return true;
  };

  const completeLoginAndRedirect = (data: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    subRole?: string;
    addresses?: unknown[];
    location?: unknown;
    address?: string;
  }) => {
    login({
      _id: data._id,
      name: data.name,
      email: data.email,
      phone: data.phone ?? '',
      role: data.role as 'customer',
      subRole: data.subRole as 'Driver' | 'Support' | 'Manager' | null,
      addresses: (data.addresses ?? []) as {
        label: string;
        address: string;
        lat: number;
        lng: number;
        isDefault: boolean;
      }[],
      location: data.location as {
        lat: number;
        lng: number;
        address: string;
        updatedAt?: string;
      } | undefined,
      address: data.address ?? '',
    });
    toast.success('Account created successfully!');

    const from =
      locationState?.from?.pathname ||
      (typeof locationState?.from === 'string' ? locationState.from : '/dashboard');
    const serviceState = locationState?.service ? { service: locationState.service } : undefined;

    navigate(from, { replace: true, state: serviceState });
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await authService.prepareSignup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
      });
      if (result.skipOtp && result.token) {
        completeLoginAndRedirect(result);
        toast.success('Account created');
        return;
      }
      setMaskedPhone(result.mobile || `******${formData.phone.slice(-4)}`);
      setOtp('');
      otpSentRef.current = false;
      setStep('otp');
      toast.success('Details verified');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not verify details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 'otp' || otpSentRef.current) return;

    const sendOtp = async () => {
      setIsLoading(true);
      try {
        const result = await authService.sendSignupOtp({ phone: formData.phone });
        otpSentRef.current = true;
        const channels: string[] = result.channels || [];
        const label =
          channels.includes('whatsapp') && channels.includes('sms')
            ? 'WhatsApp and SMS'
            : channels.includes('sms')
              ? 'SMS'
              : 'WhatsApp';
        toast.success(`OTP sent to your ${label}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to send OTP');
      } finally {
        setIsLoading(false);
      }
    };

    sendOtp();
  }, [step, formData.phone]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.verifySignupOtp({
        phone: formData.phone,
        otp,
      });
      completeLoginAndRedirect(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const result = await authService.sendSignupOtp({ phone: formData.phone });
      setMaskedPhone(result.mobile || `******${formData.phone.slice(-4)}`);
      setOtp('');
      const channels: string[] = result.channels || [];
      const label =
        channels.includes('whatsapp') && channels.includes('sms')
          ? 'WhatsApp and SMS'
          : channels.includes('sms')
            ? 'SMS'
            : 'WhatsApp';
      toast.success(`OTP resent to your ${label}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
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
      <div className="glass-panel-strong p-4 md:p-5 rounded-3xl shadow-xl">
        <div className="text-center mb-2.5 md:mb-3">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            {step === 'form' ? 'Create Account' : 'Verify WhatsApp OTP'}
          </h1>
          <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5">
            {step === 'form'
              ? 'Start managing your vehicles today'
              : `Enter the 6-digit code sent to ${maskedPhone || 'your WhatsApp'}`}
          </p>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleContinue} className="space-y-1.5 md:space-y-2">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full name"
                required
                maxLength={MAX_NAME_LENGTH}
                className="w-full pl-10 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email address"
                required
                maxLength={MAX_EMAIL_LENGTH}
                readOnly={Boolean((location.state as { fromGoogle?: boolean })?.fromGoogle && formData.email)}
                className="w-full pl-10 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all read-only:opacity-80"
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Mobile number"
                required
                maxLength={10}
                className="w-full pl-10 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                required
                maxLength={MAX_PASSWORD_LENGTH}
                className="w-full pl-10 pr-10 py-2 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm"
                required
                maxLength={MAX_PASSWORD_LENGTH}
                className="w-full pl-10 pr-10 py-2 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>Verify</>
              )}
            </motion.button>

            <p className="mt-2 text-[9px] text-center text-muted-foreground">
              By continuing, you agree to our{' '}
              <Link to="/terms" className="underline hover:text-primary">
                Terms
              </Link>{' '}
              &{' '}
              <Link to="/privacy" className="underline hover:text-primary">
                Privacy
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-center text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Verify & Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
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

        <p className="mt-1 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" state={locationState} className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
};

export default RegisterPage;
