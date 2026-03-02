import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  ChevronRight, 
  X, 
  Loader2,
  Clock,
  Navigation2
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socketService } from '@/services/socket';
import { bookingService, Booking } from '@/services/bookingService';
import { useAuthStore } from '@/store/authStore';
import { getETA, ETAResponse } from '@/services/trackingService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const TRACKING_STATUSES = [
  'ASSIGNED', 
  'ACCEPTED', 
  'REACHED_CUSTOMER', 
  'VEHICLE_PICKED', 
  'REACHED_MERCHANT',
  'OUT_FOR_DELIVERY'
];

const LiveTrackingNotification: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [staffLocation, setStaffLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<ETAResponse | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  // Don't show if user is not customer or merchant
  const isEligibleUser = user?.role === 'customer' || user?.role === 'merchant';
  
  // Don't show if user is already on the tracking page
  const isAlreadyOnTrackingPage = routerLocation.pathname.includes('/track/') || routerLocation.pathname.includes('/order-detail/');

  useEffect(() => {
    if (!isEligibleUser) return;

    const fetchActiveBooking = async () => {
      try {
        let bookings: Booking[] = [];
        if (user?.role === 'customer') {
          bookings = await bookingService.getMyBookings();
        } else if (user?.role === 'merchant') {
          bookings = await bookingService.getMerchantBookings(user._id);
        }

        const trackingBooking = bookings.find(b => TRACKING_STATUSES.includes(b.status));
        
        if (trackingBooking) {
          setActiveBooking(trackingBooking);
          setIsVisible(true);
          
          // Join booking room
          socketService.connect();
          socketService.joinRoom(`booking_${trackingBooking._id}`);
        } else {
          setActiveBooking(null);
          setIsVisible(false);
        }
      } catch (error) {
        console.error("Failed to fetch active bookings for notification", error);
      }
    };

    fetchActiveBooking();

    // Listen for booking updates to show/hide notification
    const handleBookingUpdated = (updatedBooking: Booking) => {
      if (TRACKING_STATUSES.includes(updatedBooking.status)) {
        setActiveBooking(updatedBooking);
        setIsVisible(true);
        socketService.joinRoom(`booking_${updatedBooking._id}`);
      } else if (activeBooking?._id === updatedBooking._id) {
        setIsVisible(false);
        setActiveBooking(null);
      }
    };

    const handleLiveLocation = (data: any) => {
      if (activeBooking && data.bookingId === activeBooking._id) {
        const lat = typeof data.lat === 'string' ? Number(data.lat) : data.lat;
        const lng = typeof data.lng === 'string' ? Number(data.lng) : data.lng;
        
        if (typeof lat === 'number' && typeof lng === 'number') {
          setStaffLocation({ lat, lng });
          
          // Update ETA every 30 seconds
          const now = Date.now();
          if (now - lastUpdateRef.current > 30000) {
            updateETA(lat, lng);
            lastUpdateRef.current = now;
          }
        }
      }
    };

    socketService.on('bookingUpdated', handleBookingUpdated);
    socketService.on('liveLocation', handleLiveLocation);

    return () => {
      socketService.off('bookingUpdated', handleBookingUpdated);
      socketService.off('liveLocation', handleLiveLocation);
    };
  }, [user?._id, user?.role, activeBooking?._id]);

  const updateETA = async (lat: number, lng: number) => {
    if (!activeBooking) return;
    
    // For ETA, we need destination. 
    // If status is ASSIGNED/ACCEPTED/REACHED_CUSTOMER, destination is customer location.
    // If status is VEHICLE_PICKED/REACHED_MERCHANT, destination is merchant location.
    // If status is OUT_FOR_DELIVERY, destination is customer location.
    
    let destLat, destLng;
    if (activeBooking.status === 'VEHICLE_PICKED' || activeBooking.status === 'REACHED_MERCHANT') {
      destLat = activeBooking.merchant?.location?.lat;
      destLng = activeBooking.merchant?.location?.lng;
    } else {
      destLat = typeof activeBooking.location === 'object' ? activeBooking.location.lat : undefined;
      destLng = typeof activeBooking.location === 'object' ? activeBooking.location.lng : undefined;
    }

    if (destLat && destLng) {
      try {
        const res = await getETA(lat, lng, destLat, destLng);
        setEta(res);
      } catch (error) {
        console.error("Failed to get ETA", error);
      }
    }
  };

  const handleTrackClick = () => {
    if (!activeBooking) return;
    if (user?.role === 'customer') {
      navigate(`/track/${activeBooking._id}`);
    } else {
      navigate(`/merchant/orders/${activeBooking._id}`);
    }
  };

  const getStatusText = () => {
    if (!activeBooking) return '';
    switch (activeBooking.status) {
      case 'ASSIGNED':
      case 'ACCEPTED':
        return 'Staff is on the way';
      case 'REACHED_CUSTOMER':
        return 'Staff reached your location';
      case 'VEHICLE_PICKED':
        return 'Vehicle picked & heading to workshop';
      case 'REACHED_MERCHANT':
        return 'Staff reached workshop';
      case 'OUT_FOR_DELIVERY':
        return 'Vehicle is out for delivery';
      default:
        return 'Order in progress';
    }
  };

  const getProgressValue = () => {
    if (!activeBooking) return 0;
    const statuses = [
      'ASSIGNED', 
      'ACCEPTED', 
      'REACHED_CUSTOMER', 
      'VEHICLE_PICKED', 
      'REACHED_MERCHANT', 
      'SERVICE_STARTED',
      'SERVICE_COMPLETED',
      'OUT_FOR_DELIVERY',
      'DELIVERED'
    ];
    const index = statuses.indexOf(activeBooking.status);
    return ((index + 1) / statuses.length) * 100;
  };

  if (!isEligibleUser || isAlreadyOnTrackingPage || !isVisible || isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-8 md:bottom-8 md:w-[400px]"
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white leading-tight">
                  Track Your Delivery
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Order #{activeBooking?.orderNumber || activeBooking?._id.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {getStatusText()}
                  </span>
                </div>
                
                {eta ? (
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{eta.duration.text}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Navigation2 className="w-3 h-3" />
                      <span>{eta.distance.text} away</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Calculating ETA...
                  </div>
                )}
              </div>

              {/* Mini Map Placeholder / Icon */}
              <div className="w-16 h-16 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700">
                <MapPin className="w-6 h-6 text-red-500" />
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <Progress value={getProgressValue()} className="h-1.5 bg-gray-100 dark:bg-gray-800" />
              <div className="flex justify-between items-center text-[10px] text-gray-400 uppercase font-medium tracking-wider">
                <span>Pickup</span>
                <span>Workshop</span>
                <span>Delivery</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                onClick={handleTrackClick}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-sm font-semibold transition-all shadow-md shadow-blue-500/20"
              >
                Track Live
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button 
                variant="outline"
                onClick={handleTrackClick}
                className="flex-1 border-gray-200 dark:border-gray-700 rounded-xl h-10 text-sm font-semibold"
              >
                Details
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LiveTrackingNotification;
