import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Car, Calendar, MapPin, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService } from '@/services/paymentService';

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    }
  }, [location.state, navigate]);

  const handlePayment = async () => {
    if (!tempBookingData) return;

    setIsLoading(true);
    try {
      const result = await paymentService.processDummyPayment('', tempBookingData);
      
      toast.success('Payment successful! Your car wash booking has been created.');
      
      // Navigate to the newly created booking's tracking page
      navigate(`/track/${result.bookingId}`);
    } catch (error: any) {
      console.error('Payment Error:', error);
      toast.error(error.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!tempBookingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Complete Payment</h1>
          <p className="text-muted-foreground">Complete payment to create your car wash booking</p>
        </div>
      </motion.div>

      {/* Car Wash Notice */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Car className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">Car Wash Service</h3>
            <p className="text-sm text-blue-700">
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
        className="bg-card rounded-2xl border border-border p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold mb-4">Booking Summary</h2>
        
        {/* Services */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Car Wash Services</p>
              <p className="text-sm text-muted-foreground">
                {tempBookingData.notes || 'Car wash service'}
              </p>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-3 pt-3 border-t border-border">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {new Date(tempBookingData.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-sm text-muted-foreground">
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
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Pickup Location
            </p>
            <p className="text-sm font-medium text-foreground leading-relaxed">
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
        className="bg-card rounded-2xl border border-border p-6"
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Payment Details
        </h2>
        
        <div className="space-y-3">
          <div className="flex justify-between text-foreground">
            <span>Service Amount</span>
            <span className="font-semibold">₹{tempBookingData.totalAmount}</span>
          </div>
          
          <div className="flex justify-between text-foreground pt-3 border-t border-border">
            <span className="font-semibold">Total Amount</span>
            <span className="text-xl font-bold text-primary">₹{tempBookingData.totalAmount}</span>
          </div>
        </div>
      </motion.div>

      {/* Payment Button */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="pt-4"
      >
        <button
          onClick={handlePayment}
          disabled={isLoading}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Pay ₹{tempBookingData.totalAmount} & Create Booking
            </>
          )}
        </button>
      </motion.div>

      {/* Security Notice */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-xs text-muted-foreground"
      >
        <p>🔒 This is a demo payment. No actual payment will be processed.</p>
      </motion.div>
    </div>
  );
};

export default PaymentPage;