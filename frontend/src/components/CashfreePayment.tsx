import React, { useState } from 'react';
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
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const safeBookingId =
    bookingId && /^[a-fA-F0-9]{24}$/.test(bookingId) ? bookingId : undefined;

  const handlePayment = async () => {
    if (!window.Cashfree) {
      toast.error('Payment gateway not loaded. Please refresh the page.');
      return;
    }
    setIsLoading(true);
    setPaymentStatus('processing');
    try {
      const order: PaymentOrder = await paymentService.createOrder(safeBookingId, amount, 'INR', tempBookingData);
      const cashfree = window.Cashfree({ mode: order.environment });
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
        disabled={disabled || isLoading || paymentStatus === 'success'}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors ${className}`}
      >
        {getStatusIcon()}
        {getButtonText()}
      </motion.button>
      <div className="text-center text-xs text-muted-foreground">
        <p>Supports UPI, Cards, Net Banking, and Wallets via Cashfree</p>
      </div>
    </div>
  );
};

export default CashfreePayment;
