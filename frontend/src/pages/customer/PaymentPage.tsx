import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Car, Calendar, MapPin, Wrench, Tag, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import CashfreePayment from '@/components/CashfreePayment';
import { couponService, ValidatedCoupon, Coupon } from '@/services/couponService';
import { socketService } from '@/services/socket';
import { bookingService } from '@/services/bookingService';

type PaymentLocationState = {
  tempBookingData?: Record<string, unknown>;
  tempBookingId?: string;
  /** Pay for an already-created workshop booking (e.g. general service after invoice). */
  payExistingBookingId?: string;
};

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as PaymentLocationState | null;
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [tempBookingData, setTempBookingData] = useState<any>(null);
  const [tempBookingId, setTempBookingId] = useState<string>('');
  const [isPayingExistingBooking, setIsPayingExistingBooking] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<ValidatedCoupon['coupon'] | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  useEffect(() => {
    const payExistingId = state?.payExistingBookingId;

    const loadCashfreeScript = () => {
      return new Promise((resolve, reject) => {
        if (window.Cashfree) {
          resolve(true);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
        script.onload = () => {
          resolve(true);
        };
        script.onerror = () => {
          console.error('Failed to load Cashfree script');
          reject(new Error('Failed to load Cashfree script'));
        };
        document.body.appendChild(script);
      });
    };

    loadCashfreeScript().catch((error) => {
      console.error('Cashfree script loading error:', error);
      toast.error('Failed to load payment gateway. Please refresh the page.');
    });

    if (payExistingId) {
      let cancelled = false;
      (async () => {
        try {
          const booking = await bookingService.getBookingById(payExistingId);
          if (cancelled) return;
          const billed = booking.billing?.total;
          const total = typeof billed === 'number' && billed > 0 ? billed : Number(booking.totalAmount) || 0;
          const loc = booking.location;
          setTempBookingData({
            totalAmount: total,
            date: booking.date,
            location:
              typeof loc === 'object' && loc && 'address' in loc
                ? loc
                : { address: typeof loc === 'string' ? loc : 'Location not specified' },
            notes: booking.notes || 'Workshop service',
            requiresPaymentService: true,
            services: booking.services,
          });
          setTempBookingId(booking._id);
          setIsPayingExistingBooking(true);
        } catch {
          if (!cancelled) {
            toast.error('Could not load booking for payment');
            navigate(`/track/${payExistingId}`, { replace: true });
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (state?.tempBookingData) {
      setTempBookingData(state.tempBookingData);
      setTempBookingId(state.tempBookingId || '');
      return;
    }

    toast.error('No booking data found');
    navigate('/book-service');
  }, [state?.payExistingBookingId, state?.tempBookingData, state?.tempBookingId, navigate]);

  // Load coupons when tempBookingData is available
  useEffect(() => {
    if (tempBookingData) {
      loadCoupons();
    }
  }, [tempBookingData]);

  // Listen for coupon updates via socket
  useEffect(() => {
    socketService.connect();

    const globalSyncHandler = (data: any) => {
      if (!data) return;
      const entity = (data as any).entity;
      const action = (data as any).action;

      if (entity === 'coupon' && action) {
        loadCoupons();
      }
    };

    socketService.on('global:sync', globalSyncHandler);

    return () => {
      socketService.off('global:sync', globalSyncHandler);
    };
  }, []);

  // Determine service type for display
  const getSelectedServiceType = () => {
    if (!tempBookingData) return undefined;
    
    if (tempBookingData.isCarWashService) return 'Car Wash';
    if (tempBookingData.isEssentialsService) return 'Essentials';
    
    // Check if services are provided in the booking data
    if (tempBookingData.services && Array.isArray(tempBookingData.services) && tempBookingData.services.length > 0) {
      const firstService = tempBookingData.services[0];
      // Check if firstService is an object with a category property
      const category = (typeof firstService === 'object' && firstService !== null && 'category' in (firstService as any))
        ? ((firstService as any).category || '').toLowerCase()
        : '';
      
      if (category.includes('periodic') || category.includes('general')) return 'General Service';
      if (category.includes('wash')) return 'Car Wash';
      if (category.includes('essential')) return 'Essentials';
      if (category.includes('tyre') || category.includes('battery')) return 'Tyres and Battery';
    }
    
    return undefined;
  };

  const getServiceInfo = () => {
    if (!tempBookingData) {
      return { type: 'Service', icon: Wrench, color: 'blue' };
    }
    
    // Check if this is a car wash service
    if (tempBookingData.isCarWashService) {
      return { type: 'Car Wash', icon: Car, color: 'blue' };
    }

    // Check if this is an essentials service
    if (tempBookingData.isEssentialsService) {
      return { type: 'Essentials', icon: Wrench, color: 'blue' };
    }
    
    // For new payment flow, check service categories from the booking data
    if (tempBookingData.requiresPaymentService) {
      const serviceType = getSelectedServiceType();
      if (serviceType) {
        return { type: serviceType, icon: Wrench, color: 'blue' };
      }
    }
    
    // Default to generic service
    return { type: 'Service', icon: Wrench, color: 'blue' };
  };

  const serviceInfo = getServiceInfo();

  const billAmount = Number(tempBookingData?.totalAmount);
  const orderSubtotal = Number.isFinite(billAmount) ? billAmount : 0;

  const calculateFinalAmount = () => {
    if (!tempBookingData) return 0;
    const baseAmount = Number(tempBookingData.totalAmount) || 0;
    if (appliedCoupon) {
      const discount = Number(appliedCoupon.discountAmount) || 0;
      return Math.max(0, baseAmount - discount);
    }
    return baseAmount;
  };

  const loadCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const coupons = await couponService.getCoupons();
      const serviceType = getSelectedServiceType();
      
      const filteredCoupons = coupons.filter(coupon => {
        if (!coupon.isActive) return false;
        
        // Filter by service applicability
        if (serviceType && coupon.applicableServices && coupon.applicableServices.length > 0) {
          const isAllApplicable = coupon.applicableServices.includes('All');
          if (!isAllApplicable && !coupon.applicableServices.includes(serviceType)) {
            return false;
          }
        }
        
        // Filter by targeted users
        if (coupon.targetUsers && coupon.targetUsers.length > 0) {
          const isTargeted = coupon.targetUsers.some(target => 
            (user?.email && target.email && target.email.toLowerCase() === user.email.toLowerCase()) ||
            (user?.phone && target.mobile && target.mobile === user.phone)
          );
          if (!isTargeted) return false;
        }
        
        return true;
      });
      
      setAvailableCoupons(filteredCoupons);
    } catch (error) {
      console.error('Failed to load coupons:', error);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const applyCouponByCode = async (code: string) => {
    setValidatingCoupon(true);
    try {
      const result = await couponService.validateCoupon(
        code, 
        tempBookingData.totalAmount,
        getSelectedServiceType(),
        user?.email,
        user?.phone
      );
      if (result.valid && result.coupon) {
        setAppliedCoupon(result.coupon);
        toast.success('Coupon applied successfully!');
      } else {
        toast.error(result.message || 'Invalid coupon');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to apply coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast.info('Coupon removed');
  };

  const handlePaymentSuccess = (paymentData: any) => {
    setIsLoading(false);
    if (isPayingExistingBooking && tempBookingId) {
      toast.success('Payment successful!');
      navigate(`/track/${tempBookingId}`, { replace: true });
      return;
    }
    toast.success('Payment successful! Your service booking has been created.');
    navigate('/dashboard', {
      replace: true,
      state: {
        showAssignmentToast: true
      }
    });
  };

  const handlePaymentFailure = (error: any) => {
    setIsLoading(false);
    console.error('Payment Error:', error);
    // Error is already toasted in CashfreePayment component
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
          onClick={() => {
            if (isPayingExistingBooking && tempBookingId) {
              navigate(`/track/${tempBookingId}`);
            } else {
              navigate(-1);
            }
          }}
          className="p-2 hover:bg-muted rounded-full transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Complete Payment</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isPayingExistingBooking
              ? 'Apply a coupon if you have one, then pay to confirm your workshop bill.'
              : 'Complete payment to create your service booking'}
          </p>
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

      {/* Coupon Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-2xl border border-border p-4 sm:p-6"
      >
        <h2 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Apply Coupon
        </h2>

        <div className="space-y-4">
          {loadingCoupons ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading coupons...
            </div>
          ) : availableCoupons.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Available coupons:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableCoupons.map((coupon, index) => {
                  const isSelected = appliedCoupon?._id === coupon._id;
                  const minRequired = Number(coupon.minOrderAmount) || 0;
                  const meetsMinOrder = minRequired === 0 || orderSubtotal >= minRequired;
                  const isDisabledByMinOrder = !meetsMinOrder;
                  const colors = [
                    'from-blue-500 to-blue-600',
                    'from-purple-500 to-purple-600',
                    'from-pink-500 to-pink-600',
                    'from-indigo-500 to-indigo-600',
                    'from-teal-500 to-teal-600',
                    'from-orange-500 to-orange-600',
                    'from-red-500 to-red-600',
                    'from-green-500 to-green-600',
                    'from-cyan-500 to-cyan-600',
                    'from-lime-500 to-lime-600',
                    'from-emerald-500 to-emerald-600',
                    'from-violet-500 to-violet-600'
                  ];
                  const colorIndex = index % colors.length;
                  const bgGradient = colors[colorIndex];
                  
                  return (
                    <button
                      type="button"
                      key={coupon._id}
                      onClick={() => {
                        if (isDisabledByMinOrder) return;
                        applyCouponByCode(coupon.code);
                      }}
                      disabled={validatingCoupon || isDisabledByMinOrder}
                      aria-disabled={isDisabledByMinOrder}
                      title={
                        isDisabledByMinOrder && minRequired > 0
                          ? `Minimum order ₹${minRequired} required (current ₹${orderSubtotal})`
                          : undefined
                      }
                      className={`relative overflow-hidden rounded-xl text-left transition-all disabled:cursor-not-allowed ${
                        isDisabledByMinOrder
                          ? 'opacity-55 grayscale'
                          : 'transform hover:scale-[1.02] disabled:opacity-50'
                      } ${isSelected && meetsMinOrder ? 'ring-4 ring-green-400 ring-offset-2' : ''}`}
                    >
                      <div
                        className={`bg-gradient-to-br p-5 text-white ${
                          isDisabledByMinOrder ? 'from-slate-500 to-slate-600' : bgGradient
                        }`}
                      >
                        {isSelected && meetsMinOrder && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="w-6 h-6 text-yellow-300" />
                          </div>
                        )}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <Tag className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-3xl font-bold">Upto {coupon.discountPercentage}% off</p>
                          </div>
                        </div>
                        <p className="font-bold text-lg mb-1">{coupon.code}</p>
                        {coupon.description && (
                          <p className="text-sm opacity-90 mb-2">{coupon.description}</p>
                        )}
                        {minRequired > 0 && (
                          <p className="text-xs opacity-80">
                            Min. order: ₹{minRequired}
                            {isDisabledByMinOrder ? (
                              <span className="block mt-1 font-medium">
                                Not available — cart is ₹{orderSubtotal}
                              </span>
                            ) : null}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">{appliedCoupon.code}</p>
                      <p className="text-xs text-green-600">{appliedCoupon.description || `${appliedCoupon.discountPercentage}% off`}</p>
                    </div>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No coupons available at this time
            </div>
          )}
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

          {appliedCoupon && (
            <div className="flex justify-between text-green-600">
              <span className="text-sm sm:text-base">Discount ({appliedCoupon.discountPercentage}%)</span>
              <span className="font-semibold text-sm sm:text-base">-₹{appliedCoupon.discountAmount}</span>
            </div>
          )}
          
          <div className="flex justify-between text-foreground pt-3 border-t border-border">
            <span className="font-semibold text-sm sm:text-base">Total Amount</span>
            <span className="text-lg sm:text-xl font-bold text-primary">₹{calculateFinalAmount()}</span>
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
        {/* Cashfree Payment Component */}
        {user && (
          <CashfreePayment
            bookingId={tempBookingId || undefined}
            amount={calculateFinalAmount()}
            tempBookingData={{
              ...tempBookingData,
              totalAmount: Number(tempBookingData.totalAmount) || 0,
              customerEmail: user.email,
              customerPhone: user.phone,
              coupon: appliedCoupon?._id || null,
              discountAmount: appliedCoupon?.discountAmount || 0,
              finalAmount: calculateFinalAmount()
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
        <p>Powered by Cashfree Payments</p>
      </motion.div>
    </div>
  );
};

export default PaymentPage;
