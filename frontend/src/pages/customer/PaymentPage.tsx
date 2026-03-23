import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Car, Calendar, MapPin, Wrench, Battery, Disc } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import RazorpayPayment from '@/components/RazorpayPayment';
import RazorpayTest from '@/components/RazorpayTest';
import { paymentService } from '@/services/paymentService';

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [tempBookingData, setTempBookingData] = useState<any>(null);
  const [tempBookingId, setTempBookingId] = useState<string>('');

  useEffect(() => {
    // Get temp booking data from navigation state
    if (location.state?.tempBookingData) {
      setTempBookingData(location.state.tempBookingData);
      setTempBookingId(location.state.tempBookingId || '');
    } else {
      // If no temp data, redirect back
      toast.error('No booking data found');
      navigate('/book-service');
      return;
    }

    // Load Razorpay script
    const loadRazorpayScript = () => {
      return new Promise((resolve, reject) => {
        // Check if Razorpay is already loaded
        if (window.Razorpay) {
          resolve(true);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          console.log('Razorpay script loaded successfully');
          resolve(true);
        };
        script.onerror = () => {
          console.error('Failed to load Razorpay script');
          reject(new Error('Failed to load Razorpay script'));
        };
        document.body.appendChild(script);
      });
    };

    loadRazorpayScript().catch((error) => {
      console.error('Razorpay script loading error:', error);
      toast.error('Failed to load payment gateway. Please refresh the page.');
    });
  }, [location.state, navigate]);

  // Determine service type for display
  const getServiceInfo = () => {
    if (!tempBookingData) {
      return { type: 'Service', icon: Wrench, color: 'blue' };
    }
    
    // Check if this is a car wash service
    if (tempBookingData.isCarWashService) {
      return { type: 'Car Wash', icon: Car, color: 'blue' };
    }
    
    // For new payment flow, check service categories from the booking data
    // This assumes the service data is available in tempBookingData
    if (tempBookingData.requiresPaymentService) {
      // We can determine the type based on the service names or categories
      // For now, we'll use a generic approach since we don't have service details
      // In a real implementation, you'd fetch service details by serviceIds
      return { type: 'Service', icon: Wrench, color: 'blue' };
    }
    
    // Default to generic service
    return { type: 'Service', icon: Wrench, color: 'blue' };
  };

  const serviceInfo = getServiceInfo();

  const handlePaymentSuccess = (paymentData: any) => {
    setIsLoading(false);
    toast.success('Payment successful! Your service booking has been created.');
    navigate(`/track/${paymentData.bookingId || paymentData.booking?._id}`, { replace: true });
  };

  const handlePaymentFailure = (error: any) => {
    setIsLoading(false);
    console.error('Payment Error:', error);
    // Error is already toasted in RazorpayPayment component
  };

  if (!tempBookingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full py-4 lg:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 sm:gap-4"
      >
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-full transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Complete Payment</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Complete payment to create your service booking</p>
        </div>
      </motion.div>

      {/* Service Notice */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <serviceInfo.icon className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-blue-900 text-sm sm:text-base">{serviceInfo.type} Service</h3>
            <p className="text-xs sm:text-sm text-blue-700 mt-1">
              Your booking will be created after successful payment. Admin will then assign staff to reach your location.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Booking Summary */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border p-4 sm:p-6 space-y-4"
      >
        <h2 className="text-base sm:text-lg font-semibold mb-4">Booking Summary</h2>
        
        {/* Services */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm sm:text-base">{serviceInfo.type} Services</p>
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                {tempBookingData.notes || `${serviceInfo.type} service`}
              </p>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-3 pt-3 border-t border-border">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground text-sm sm:text-base">
              {new Date(tempBookingData.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {new Date(tempBookingData.date).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-3 pt-3 border-t border-border">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Pickup Location
            </p>
            <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed break-words">
              {tempBookingData.location?.address || 'Location not specified'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Payment Details */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border p-4 sm:p-6"
      >
        <h2 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Payment Details
        </h2>
        
        <div className="space-y-3">
          <div className="flex justify-between text-foreground">
            <span className="text-sm sm:text-base">Service Amount</span>
            <span className="font-semibold text-sm sm:text-base">₹{tempBookingData.totalAmount}</span>
          </div>
          
          <div className="flex justify-between text-foreground pt-3 border-t border-border">
            <span className="font-semibold text-sm sm:text-base">Total Amount</span>
            <span className="text-lg sm:text-xl font-bold text-primary">₹{tempBookingData.totalAmount}</span>
          </div>
        </div>
      </motion.div>

      {/* Payment Button */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="pt-4 space-y-4"
      >
        {/* Razorpay Payment Component */}
        {user && (
          <RazorpayPayment
            bookingId={tempBookingId || undefined}
            amount={tempBookingData.totalAmount}
            tempBookingData={tempBookingData}
            userDetails={{
              name: user.name,
              email: user.email,
              phone: user.phone || ''
            }}
            onSuccess={handlePaymentSuccess}
            onFailure={handlePaymentFailure}
            disabled={isLoading}
            className="text-sm sm:text-base"
          />
        )}
      </motion.div>

      {/* Security Notice */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-xs text-muted-foreground space-y-1"
      >
        <p>🔒 Your payment information is secure and encrypted</p>
        <p>Powered by Razorpay - India's most trusted payment gateway</p>
      </motion.div>
      
      {/* Development Test Component */}
      <RazorpayTest />
    </div>
  );
};

export default PaymentPage;