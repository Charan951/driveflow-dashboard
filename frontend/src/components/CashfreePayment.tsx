import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService, PaymentOrder } from '@/services/paymentService';

interface CashfreePaymentProps {
  bookingId?: string;
  amount: number;
  tempBookingData?: any;
  onSuccess: (paymentData: any) => void;
  onFailure: (error: any) => void;
  disabled?: boolean;
  className?: string;
}

const loadCashfreeScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).Cashfree) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.body.appendChild(script);
  });
};

const CashfreePayment: React.FC<CashfreePaymentProps> = ({
  bookingId,
  amount,
  tempBookingData,
  onSuccess,
  onFailure,
  disabled = false,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  useEffect(() => {
    const preconnectLink = document.createElement('link');
    preconnectLink.rel = 'preconnect';
    preconnectLink.href = 'https://sdk.cashfree.com';
    document.head.appendChild(preconnectLink);
    return () => {
      try {
        document.head.removeChild(preconnectLink);
      } catch (e) {
        // Safe check if already removed
      }
    };
  }, []);

  const safeBookingId =
    bookingId && /^[a-fA-F0-9]{24}$/.test(bookingId) ? bookingId : undefined;

  const handlePayment = async () => {
    setIsScriptLoading(true);
    try {
      await loadCashfreeScript();
    } catch (error) {
      toast.error('Failed to load payment gateway. Please try again.');
      setIsScriptLoading(false);
      return;
    } finally {
      setIsScriptLoading(false);
    }
    if (!(window as any).Cashfree) {
      toast.error('Payment gateway not loaded. Please refresh the page.');
      return;
    }
    setIsLoading(true);
    setPaymentStatus('processing');
    try {
      const order: PaymentOrder = await paymentService.createOrder(safeBookingId, amount, 'INR', tempBookingData);
      const cashfree = (window as any).Cashfree({ mode: order.environment });
      await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: '_modal'
      });
      const verifyResult = await paymentService.verifyPayment({ orderId: order.orderId, bookingId: safeBookingId });
      if (verifyResult?.data?.payment?.status === 'paid') {
        setPaymentStatus('success');
        toast.success('Payment successful!');
        onSuccess(verifyResult.data);
      } else {
        setPaymentStatus('failed');
        toast.error('Payment is pending or failed');
        onFailure(verifyResult);
      }
    } catch (error: any) {
      setPaymentStatus('failed');
      toast.error(error.response?.data?.message || 'Failed to process payment');
      onFailure(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (paymentStatus === 'processing') return <Loader2 className="w-4 h-4 animate-spin" />;
    if (paymentStatus === 'success') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (paymentStatus === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
    return <CreditCard className="w-4 h-4" />;
  };

  const getButtonText = () => {
    if (paymentStatus === 'processing') return 'Processing...';
    if (paymentStatus === 'success') return 'Payment Successful';
    if (paymentStatus === 'failed') return 'Retry Payment';
    return `Pay ₹${amount}`;
  };

  return (
    <div className="space-y-4">
      <motion.button
        onClick={handlePayment}
        disabled={disabled || isLoading || isScriptLoading || paymentStatus === 'success'}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors ${className}`}
      >
        {isScriptLoading || isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : getStatusIcon()}
        {isScriptLoading ? 'Loading Payment Gateway...' : getButtonText()}
      </motion.button>
      <div className="text-center text-xs text-muted-foreground">
        <p>Supports UPI, Cards, Net Banking, and Wallets via Cashfree</p>
      </div>
    </div>
  );
};

export default CashfreePayment;
