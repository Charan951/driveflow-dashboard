import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locationState = location.state as any;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const data = await authService.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: formData.role as any,
        phone: formData.phone
      });

      if (formData.role === 'customer') {
        login({
          id: data._id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
        });
        toast.success('Account created successfully!');
        
        const from = locationState?.from?.pathname || (typeof locationState?.from === 'string' ? locationState.from : '/dashboard');
        const serviceState = locationState?.service ? { service: locationState.service } : undefined;
        
        navigate(from, { replace: true, state: serviceState });
      } else {
        // For merchant and staff, don't auto-login to dashboard.
        // The backend might return a token, but we should clear it or not use it
        // because they need approval.
        authService.logout(); // Clear any session data
        toast.success('Registration successful! Please wait for admin approval.');
        if (formData.role === 'merchant') {
            navigate('/merchant/login');
        } else {
            navigate('/staff/login');
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { label: 'At least 8 characters', met: formData.password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(formData.password) },
    { label: 'Contains uppercase', met: /[A-Z]/.test(formData.password) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="glass-panel-strong p-8 rounded-3xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Create Account
          </h1>
          <p className="text-muted-foreground">
            Start managing your vehicles today
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
            {/* Name Field */}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full name"
                required
                className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            {/* Role Selection */}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none"
              >
                <option value="customer">Customer</option>
                <option value="merchant">Merchant</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            {/* Email Field */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email address"
                required
                className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            {/* Phone Field */}
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone number"
                required
                className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                required
                className="w-full pl-12 pr-12 py-4 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Requirements */}
            {formData.password && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-xl">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${req.met ? 'bg-success' : 'bg-muted'}`}>
                      {req.met && <Check className="w-3 h-3 text-success-foreground" />}
                    </div>
                    <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Confirm Password Field */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                required
                className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>

            <p className="mt-4 text-xs text-center text-muted-foreground">
              By continuing, you agree to our{' '}
              <Link to="/terms" className="underline hover:text-primary">
                Terms & Conditions
              </Link>{' '}
              &{' '}
              <Link to="/privacy" className="underline hover:text-primary">
                Privacy Policy
              </Link>
            </p>
          </form>

        {/* Sign In Link */}
        <p className="mt-8 text-center text-muted-foreground">
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
