import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await authService.forgotPassword(email);
      toast.success(response.message || 'If an account exists, a reset link has been sent.');
      const state = location.state as unknown as { from?: string };
      const from = state?.from || '/login';
      navigate(from, { replace: true });
    } catch (error) {
      toast.error('Failed to send reset link. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="glass-panel-strong p-5 md:p-6 rounded-3xl shadow-xl">
        <div className="text-center mb-5 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-1">Forgot Password</h1>
          <p className="text-xs text-muted-foreground">
            Enter your email to receive a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileTap={{ scale: 0.98 }}
            className="w-full py-2.5 md:py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                Send Reset Link
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Remember?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Back to login
            </Link>
          </p>
        </form>
      </div>
    </motion.div>
  );
};

export default ForgotPasswordPage;

