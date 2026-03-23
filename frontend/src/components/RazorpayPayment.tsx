import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, Shield, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService, PaymentOrder } from '@/services/paymentService';

interface RazorpayPaymentProps {
  bookingId?: string;
  amount: number;
  tempBookingData?: any;
  userDetails: {
    name: string;
    email: string;
    phone: string;
  };
  onSuccess: (paymentData: any) => void;
  onFailure: (error: any) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({
  bookingId,
  amount,
  tempBookingData,
  userDetails,
  onSuccess,
  onFailure,
  disabled = false,
  className = '',
  children
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  const handlePayment = async () => {
    if (!window.Razorpay) {
      toast.error('Payment gateway not loaded. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    setPaymentStatus('processing');

    try {
      // Create order
      const order: PaymentOrder = await paymentService.createOrder(
        bookingId,
        amount,
        'INR',
        tempBookingData
      );

      console.log('Order created:', order);

      // Open Razorpay checkout
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'DriveFlow',
        description: 'Service Payment',
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            console.log('Payment response:', response);
            
            // Verify payment
            const verificationData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId,
              tempBookingData
            };

            const result = await paymentService.verifyPayment(verificationData);
            
            setPaymentStatus('success');
            toast.success('Payment successful!');
            onSuccess(result.data);
          } catch (verificationError: any) {
            console.error('Payment verification failed:', verificationError);
            setPaymentStatus('failed');
            toast.error(verificationError.response?.data?.message || 'Payment verification failed');
            onFailure(verificationError);
          } finally {
            setIsLoading(false);
          }
        },
        prefill: {
          name: userDetails.name,
          email: userDetails.email,
          contact: userDetails.phone
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
            setIsLoading(false);
            setPaymentStatus('failed');
            onFailure({ error: 'Payment cancelled by user' });
          }
        }
      };

      console.log('Opening Razorpay with options:', options);
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (error: any) {
      console.error('Failed to create order:', error);
      setIsLoading(false);
      setPaymentStatus('failed');
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
      onFailure(error);
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getButtonText = () => {
    switch (paymentStatus) {
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Payment Successful';
      case 'failed':
        return 'Retry Payment';
      default:
        return children || `Pay ₹${amount}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Shield className="w-4 h-4" />
        <span>Secured by Razorpay</span>
      </div>

      {/* Payment Button */}
      <motion.button
        onClick={handlePayment}
        disabled={disabled || isLoading || paymentStatus === 'success'}
        className={`
          w-full flex items-center justify-center gap-2 px-6 py-3 
          bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
          text-white font-medium rounded-lg transition-colors
          ${className}
        `}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
      >
        {getStatusIcon()}
        {getButtonText()}
      </motion.button>

      {/* Payment Methods Info */}
      <div className="text-center text-xs text-muted-foreground">
        <p>Supports UPI, Cards, Net Banking, and Wallets</p>
      </div>

      {/* Amount Breakdown */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Service Amount:</span>
          <span>₹{amount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Platform Fee:</span>
          <span>₹0</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-medium">
          <span>Total Amount:</span>
          <span>₹{amount}</span>
        </div>
      </div>
    </div>
  );
};

export default RazorpayPayment;