import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Phone, 
  MapPin, 
  Car,
  ChevronLeft,
  CreditCard,
  Star,
  ThumbsUp,
  Navigation,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { bookingService, Booking } from '@/services/bookingService';
import { getMyApprovals, updateApprovalStatus, ApprovalRequest } from '@/services/approvalService';
import { reviewService } from '@/services/reviewService';
import { paymentService } from '@/services/paymentService';
import { socketService } from '@/services/socket';
import Timeline from '@/components/Timeline';
import { PICKUP_FLOW_ORDER, NO_PICKUP_FLOW_ORDER, STATUS_LABELS, BookingStatus } from '@/lib/statusFlow';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { AlertTriangle, Check, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getETA, ETAResponse } from '@/services/trackingService';
import * as turf from '@turf/turf';

// Fix for default marker icon in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const TrackServicePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [merchantRating, setMerchantRating] = useState(0);
  const [merchantComment, setMerchantComment] = useState('');
  const [platformRating, setPlatformRating] = useState(0);
  const [platformComment, setPlatformComment] = useState('');
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);

  // Live Tracking State
  const [staffLocation, setStaffLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<ETAResponse | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const etaTimer = useRef<number | null>(null);
  const nearAlertedRef = useRef<boolean>(false);
  const orderRef = useRef<Booking | null>(null);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    const fetchOrder = async () => {
        if (!id) return;
        try {
            const data = await bookingService.getBookingById(id);
            setOrder(data);
            if (data.status === 'DELIVERED' && !hasSubmittedFeedback) {
              setDeliveryConfirmed(true);
              // Show rating modal if delivered but not yet reviewed in this session
              setShowRatingModal(true);
            }
            // Restore near-alert state from session to avoid duplicate pop on reloads
            const key = `nearAlert_${id}`;
            nearAlertedRef.current = sessionStorage.getItem(key) === '1';
        } catch (error) {
            console.error("Failed to fetch booking", error);
            toast.error("Failed to load booking details");
        } finally {
            setIsLoading(false);
        }
    };
    fetchOrder();

    if (id) {
      socketService.connect();
      socketService.joinRoom(`booking_${id}`);

      socketService.on('liveLocation', (data: { lat?: number | string; lng?: number | string; role?: string; updatedAt?: string; timestamp?: string }) => {
        const currentOrder = orderRef.current;
        if (!currentOrder) return;
        if (currentOrder.pickupRequired === false) return;
        if (data.role && data.role !== 'staff') return;
        if (
          currentOrder.status === 'VEHICLE_AT_MERCHANT' ||
          currentOrder.status === 'SERVICE_STARTED' ||
          currentOrder.status === 'SERVICE_COMPLETED' ||
          currentOrder.status === 'DELIVERED' ||
          currentOrder.status === 'CANCELLED'
        ) {
          return;
        }
        const latNum = typeof data.lat === 'string' ? Number(data.lat) : data.lat;
        const lngNum = typeof data.lng === 'string' ? Number(data.lng) : data.lng;
        if (typeof latNum === 'number' && isFinite(latNum) && typeof lngNum === 'number' && isFinite(lngNum)) {
          setStaffLocation({ lat: latNum, lng: lngNum });
          const ts = data.updatedAt || data.timestamp;
          if (ts) {
            const dt = new Date(ts);
            if (!Number.isNaN(dt.getTime())) setLastUpdate(dt);
          }
          if (
            !nearAlertedRef.current &&
            currentOrder.location &&
            (currentOrder.status === 'ASSIGNED' ||
              currentOrder.status === 'ACCEPTED' ||
              currentOrder.status === 'REACHED_CUSTOMER')
          ) {
            const destLat = typeof currentOrder.location === 'object' ? currentOrder.location.lat : undefined;
            const destLng = typeof currentOrder.location === 'object' ? currentOrder.location.lng : undefined;
            if (destLat && destLng) {
              const from = turf.point([lngNum, latNum]);
              const to = turf.point([destLng, destLat]);
              const d = turf.distance(from, to, { units: 'meters' });
              if (d <= 300) {
                nearAlertedRef.current = true;
                sessionStorage.setItem(`nearAlert_${id}`, '1');
                toast.success('Staff is near your location (≤300 m)');
              }
            }
          }
        }
      });

      // Server-side proximity notification
      socketService.on('nearbyStaff', (payload: { bookingId: string; distanceMeters?: number }) => {
        if (!id || String(payload?.bookingId) !== String(id)) return;
        const currentOrder = orderRef.current;
        if (currentOrder && currentOrder.pickupRequired === false) return;
        if (!nearAlertedRef.current) {
          nearAlertedRef.current = true;
          sessionStorage.setItem(`nearAlert_${id}`, '1');
          const msg = payload?.distanceMeters
            ? `Staff is near your location (~${Math.max(1, Math.round(payload.distanceMeters))} m)`
            : 'Staff is near your location (≤300 m)';
          toast.success(msg);
        }
      });

      socketService.on('bookingUpdated', (updatedBooking: Booking) => {
        if (updatedBooking._id === id) {
          setOrder(updatedBooking);
          if (
            updatedBooking.status === 'VEHICLE_AT_MERCHANT' ||
            updatedBooking.status === 'SERVICE_STARTED' ||
            updatedBooking.status === 'SERVICE_COMPLETED' ||
            updatedBooking.status === 'DELIVERED' ||
            updatedBooking.status === 'COMPLETED' ||
            updatedBooking.status === 'CANCELLED'
          ) {
            setStaffLocation(null);
            setEta(null);
          }
        }
      });

      return () => {
        socketService.leaveRoom(`booking_${id}`);
        socketService.off('liveLocation');
        socketService.off('nearbyStaff');
        socketService.off('bookingUpdated');
        // Don't disconnect socket fully as it might be used elsewhere, 
        // but socketService.disconnect() usually handles ref counting or single instance logic. 
        // For now, let's just leave room.
      };
    }
  }, [id, hasSubmittedFeedback]);

  const fetchPendingApprovals = useCallback(async () => {
    if (!order?._id) return;
    try {
      const approvals = await getMyApprovals();
      const filtered = approvals.filter((a) => {
        const rawRelated: unknown = a.relatedId as unknown;
        let relatedId = '';
        if (typeof rawRelated === 'string') {
          relatedId = rawRelated;
        } else if (rawRelated && typeof rawRelated === 'object') {
          const obj = rawRelated as { _id?: unknown };
          if (typeof obj._id === 'string') {
            relatedId = obj._id;
          } else if (obj._id) {
            relatedId = String(obj._id);
          } else {
            relatedId = String(rawRelated);
          }
        } else if (rawRelated != null) {
          relatedId = String(rawRelated);
        }
        return (
          relatedId === order._id &&
          a.status === 'Pending' &&
          a.type === 'PartReplacement'
        );
      });
      setPendingApprovals(filtered);
    } catch (error) {
      console.error('Failed to fetch approvals', error);
    }
  }, [order?._id]);

  useEffect(() => {
    if (!order?._id) return;
    fetchPendingApprovals();
    const interval = window.setInterval(fetchPendingApprovals, 15000);
    return () => window.clearInterval(interval);
  }, [order?._id, fetchPendingApprovals]);

  useEffect(() => {
    if (!order || !staffLocation || order.pickupRequired === false) {
      setEta(null);
      return;
    }
    const destLat = typeof order.location === 'object' ? order.location?.lat : undefined;
    const destLng = typeof order.location === 'object' ? order.location?.lng : undefined;
    if (!destLat || !destLng) {
      setEta(null);
      return;
    }
    const showForStatuses = ['ACCEPTED', 'REACHED_CUSTOMER', 'OUT_FOR_DELIVERY'];
    if (!showForStatuses.includes(order.status)) {
      setEta(null);
      return;
    }
    if (etaTimer.current) {
      window.clearTimeout(etaTimer.current);
    }
    etaTimer.current = window.setTimeout(async () => {
      try {
        const res = await getETA(staffLocation.lat, staffLocation.lng, destLat, destLng);
        setEta(res);
      } catch (e) {
        console.error('Failed to calculate ETA', e);
      }
    }, 500);
    return () => {
      if (etaTimer.current) {
        window.clearTimeout(etaTimer.current);
        etaTimer.current = null;
      }
    };
  }, [order, staffLocation]);

  const handleApprovalAction = async (approvalId: string, status: 'Approved' | 'Rejected') => {
      try {
          await updateApprovalStatus(approvalId, status);
          toast.success(`Request ${status.toLowerCase()} successfully`);
          fetchPendingApprovals(); // Refresh list
          
          // Refresh order details if approved as it might update the total amount
          if (status === 'Approved' && order?._id) {
              const updatedOrder = await bookingService.getBookingById(order._id);
              setOrder(updatedOrder);
          }
      } catch (error) {
          console.error(`Failed to ${status.toLowerCase()} request`, error);
          toast.error(`Failed to ${status.toLowerCase()} request`);
      }
  };

  const handleMarkAtMerchant = async () => {
    if (!order?._id) return;
    const confirmed = window.confirm(
      'This button will work only when you are near the workshop (within 200 meters). We will check your location now.'
    );
    if (!confirmed) return;

    const merchantLat = order.merchant?.location?.lat;
    const merchantLng = order.merchant?.location?.lng;
    if (!merchantLat || !merchantLng) {
      toast.error('Workshop location is not available');
      return;
    }
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device');
      return;
    }
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 30000
        });
      });
      const from = turf.point([position.coords.longitude, position.coords.latitude]);
      const to = turf.point([merchantLng, merchantLat]);
      const distance = turf.distance(from, to, { units: 'meters' });
      if (distance > 200) {
        toast.error('You are not close enough to the workshop (within 200 m)');
        return;
      }
      await bookingService.updateBookingStatus(order._id, 'VEHICLE_AT_MERCHANT');
      setOrder(prev => prev ? { ...prev, status: 'VEHICLE_AT_MERCHANT' } : null);
      toast.success('Status updated to At Merchant');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || 'Failed to update status';
      toast.error(message);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!order?._id) return;
    try {
      const otp = window.prompt('Enter the 4-digit delivery OTP sent to you');
      if (!otp) {
        toast.error('Please enter the OTP to confirm delivery');
        return;
      }
      await bookingService.verifyDeliveryOtp(order._id, otp);
      await bookingService.updateBookingStatus(order._id, 'DELIVERED');
      setOrder(prev => prev ? { ...prev, status: 'DELIVERED' } : null);
      setDeliveryConfirmed(true);
      setShowRatingModal(true);
      toast.success('Delivery confirmed! Order completed.');
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Failed to confirm delivery', err);
      toast.error(err?.response?.data?.message || 'Failed to confirm delivery');
    }
  };

  const handleSubmitRating = async () => {
    if (merchantRating === 0 || platformRating === 0) {
      toast.error('Please select ratings for both merchant and platform');
      return;
    }

    setIsRatingSubmitting(true);
    try {
      const reviewPromises = [];

      // Merchant Review
      if (order?.merchant?._id) {
        reviewPromises.push(
          reviewService.createReview({
            target: order.merchant._id,
            booking: order._id,
            rating: merchantRating,
            comment: merchantComment,
            category: 'Merchant'
          })
        );
      }

      // Platform Review
      reviewPromises.push(
        reviewService.createReview({
          booking: order?._id,
          rating: platformRating,
          comment: platformComment,
          category: 'Platform'
        })
      );

      await Promise.all(reviewPromises);
      toast.success('Thank you for your feedback!');
      setHasSubmittedFeedback(true);
      setShowRatingModal(false);
    } catch (error) {
      console.error('Failed to submit reviews:', error);
      toast.error('Failed to submit reviews');
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  const handleCallMerchant = () => {
    if (!merchantPhone) return;
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent || '');
    if (isMobile) {
      window.location.href = `tel:${merchantPhone}`;
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(merchantPhone);
      toast.success('Phone number copied');
    } else {
      toast.message(merchantPhone);
    }
  };

  const handleChatMerchant = () => {
    const phone = merchantPhone ? merchantPhone.replace(/\D/g, '') : '';
    if (phone) {
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(`Hi, I have a query about order #${order?.orderNumber ?? order?._id}`)}`;
      window.open(url, '_blank');
      return;
    }
    if (order?._id) {
      navigate(`/chat/${order._id}`);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!order) return;
    
    setIsPaymentLoading(true);
    const res = await loadRazorpay();

    if (!res) {
      toast.error('Razorpay SDK failed to load. Are you online?');
      setIsPaymentLoading(false);
      return;
    }

    try {
      const orderData = await paymentService.createOrder(order._id);
      
      interface RazorpayHandlerResponse {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }

      const options: RazorpayOptions = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '', 
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Vehicle Care',
        description: 'Service Payment',
        order_id: orderData.id,
        handler: async function (response: RazorpayHandlerResponse) {
          try {
            await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: order._id
            });
            toast.success('Payment Successful!');
            const updatedOrder = await bookingService.getBookingById(order._id);
            setOrder(updatedOrder);
          } catch (err) {
            console.error('Payment Verification Error', err);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
            name: typeof order.user === 'object' ? order.user.name : '',
            email: typeof order.user === 'object' ? order.user.email : '',
            contact: typeof order.user === 'object' ? order.user.phone : ''
        },
        theme: {
            color: '#3399cc'
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
        console.error("Payment Error", error);
        toast.error("Payment failed to initialize");
    } finally {
        setIsPaymentLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!order) {
    return <div className="p-6 text-center">Order not found</div>;
  }

  // Construct timeline steps based on status
  const getStatusStep = (status: string) => {
    switch (status) {
      case 'CREATED':
        return 0;
      case 'ASSIGNED':
      case 'ACCEPTED':
      case 'REACHED_CUSTOMER':
        return 1;
      case 'VEHICLE_PICKED':
      case 'REACHED_MERCHANT':
      case 'VEHICLE_AT_MERCHANT':
        return 2;
      case 'SERVICE_STARTED':
        return 3;
      case 'SERVICE_COMPLETED':
      case 'OUT_FOR_DELIVERY':
        return 4;
      case 'DELIVERED':
        return 5;
      case 'COMPLETED':
        return 5;
      default:
        return 0;
    }
  };

  const pickupStatusFlow: readonly BookingStatus[] = PICKUP_FLOW_ORDER;
  const noPickupStatusFlow: readonly BookingStatus[] = NO_PICKUP_FLOW_ORDER;

  const activeStatusFlow: readonly BookingStatus[] = order.pickupRequired ? pickupStatusFlow : noPickupStatusFlow;
  const currentStatusIndex = Math.max(0, activeStatusFlow.indexOf(order.status as BookingStatus));

  const timelineSteps = activeStatusFlow.map((s) => {
    const index = activeStatusFlow.indexOf(s);
    const isCompleted = index <= currentStatusIndex;
    const label =
      order.pickupRequired && s === 'ACCEPTED' && order.status === 'REACHED_CUSTOMER'
        ? 'Staff waiting at your location'
        : (order.pickupRequired && s === 'OUT_FOR_DELIVERY'
            ? 'Waiting for staff pickup vehicle'
            : STATUS_LABELS[s]);

    return {
      step: label,
      completed: isCompleted,
    };
  });

  // Helper to safely access vehicle properties
  const vehicle = (typeof order.vehicle === 'object' && order.vehicle !== null) ? order.vehicle : { 
      make: 'Unknown', model: 'Vehicle', year: 0, licensePlate: 'N/A', image: '' 
  };
  
  // Helper for merchant
  const merchantName = order.merchant?.name || 'Service Center';
  const merchantEmail = order.merchant?.email;
  const merchantPhone = order.merchant?.phone;
  const merchantLat = order.merchant?.location?.lat;
  const merchantLng = order.merchant?.location?.lng;
  const hasDirectionsCard =
    !order.pickupRequired &&
    !!order.merchant &&
    (merchantLat || order.merchant.location?.address) &&
    ['ASSIGNED', 'ACCEPTED'].includes(order.status);
  const hasApprovalsChat = pendingApprovals.length > 0;
  const hasRightColumnContent = hasDirectionsCard || hasApprovalsChat;
  const showTwoColumnPaymentRow = hasRightColumnContent;

  return (
    <div className="px-4 lg:px-6 py-4 lg:py-6 space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard"
          className="p-2 hover:bg-muted rounded-xl transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Track Service</h1>
          <p className="text-sm text-muted-foreground">
            Order #{order.orderNumber ?? order._id.slice(-6).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Vehicle Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden">
            {vehicle.image ? (
              <img src={vehicle.image} alt={vehicle.model} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-sm text-muted-foreground">{vehicle.licensePlate}</p>
            {/* Display services as comma separated string */}
            <p className="text-sm text-primary font-medium mt-1">
                {Array.isArray(order.services) 
                    ? order.services.map((s) => typeof s === 'string' ? s : s.name).join(', ') 
                    : 'Service'}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Service Location
          </h2>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-muted-foreground">Address</p>
          <p className="mt-1 font-medium text-foreground">
            {order.pickupRequired
              ? (typeof order.location === 'string' 
                  ? order.location 
                  : (order.location?.address || 'Location not available'))
              : (order.merchant?.location?.address || 'Service center address not available')}
          </p>
        </div>
      </motion.div>

      {/* Progress Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-2xl border border-border p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">Status & Workflow</h2>
        <Timeline steps={timelineSteps} vertical={false} className="gap-2" />
      </motion.div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_1fr] items-start">
        {order.pickupRequired && ([
          'ASSIGNED',
          'ACCEPTED',
          'REACHED_CUSTOMER',
          'VEHICLE_PICKED',
          'REACHED_MERCHANT',
          'OUT_FOR_DELIVERY'
        ].includes(order.status)) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border overflow-hidden w-full"
          >
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                Live Tracking
              </h3>
              <div className="flex items-center gap-3">
                {eta && (
                  <div className="text-xs text-muted-foreground">
                    ETA: <span className="font-medium text-foreground">{eta.textDuration}</span>
                    <span className="mx-1">•</span>
                    {eta.textDistance}
                  </div>
                )}
                {staffLocation && (
                  <span className="text-xs text-green-500 font-medium animate-pulse">
                    ● Live{lastUpdate ? ` • ${new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(lastUpdate)}` : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="h-64 w-full relative bg-muted">
              {staffLocation ? (
                <MapContainer
                  center={[staffLocation.lat, staffLocation.lng]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors"
                  />
                  <Marker position={[staffLocation.lat, staffLocation.lng]}>
                    <Popup>Staff is here</Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MapPin className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Waiting for live location...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div className="w-full space-y-6">
          {/* Service Photos Section */}
          {(order.serviceExecution?.beforePhotos?.length || order.serviceExecution?.duringPhotos?.length || order.serviceExecution?.afterPhotos?.length) ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border p-6 space-y-4"
            >
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                Service Photos
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {order.serviceExecution?.beforePhotos && order.serviceExecution.beforePhotos.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Before Service</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {order.serviceExecution.beforePhotos.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => window.open(url, '_blank')}
                          className="aspect-square rounded-xl overflow-hidden border border-border bg-muted hover:opacity-90 transition-opacity"
                        >
                          <img src={url} alt={`Before ${i}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {order.serviceExecution?.duringPhotos && order.serviceExecution.duringPhotos.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">During Service</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {order.serviceExecution.duringPhotos.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => window.open(url, '_blank')}
                          className="aspect-square rounded-xl overflow-hidden border border-border bg-muted hover:opacity-90 transition-opacity"
                        >
                          <img src={url} alt={`During ${i}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {order.serviceExecution?.afterPhotos && order.serviceExecution.afterPhotos.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">After Service</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {order.serviceExecution.afterPhotos.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => window.open(url, '_blank')}
                          className="aspect-square rounded-xl overflow-hidden border border-border bg-muted hover:opacity-90 transition-opacity"
                        >
                          <img src={url} alt={`After ${i}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}

          <div className={showTwoColumnPaymentRow ? 'grid gap-4 md:grid-cols-2 items-start' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border p-6"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Details
              </h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between font-bold text-foreground text-lg">
                  <span>Total Amount</span>
                  <span>₹{order.totalAmount}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Status</span>
                  <span className="capitalize">{order.paymentStatus}</span>
                </div>
              </div>

              {order.paymentStatus !== 'paid' && (
                <button
                  className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  onClick={handlePayment}
                  disabled={isPaymentLoading}
                >
                  {isPaymentLoading ? 'Processing...' : 'Pay Now'}
                </button>
              )}
            </motion.div>

            {hasRightColumnContent && (
              <div className="space-y-4">
                {hasDirectionsCard && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl border border-border p-6 space-y-4"
                  >
                    <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Navigation className="w-5 h-5 text-primary" />
                      Get Directions
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Navigate from your current location to {order.merchant?.name}.
                    </p>
                    <button
                      onClick={() => {
                        const destUrlParam = merchantLat && merchantLng
                          ? `${merchantLat},${merchantLng}`
                          : encodeURIComponent(order.merchant?.location?.address || '');
                        
                        const openWith = (origin?: { lat: number; lng: number }) => {
                          let url = `https://www.google.com/maps/dir/?api=1&destination=${destUrlParam}`;
                          if (origin?.lat && origin?.lng) {
                            url += `&origin=${origin.lat},${origin.lng}`;
                          }
                          window.open(url, '_blank');
                        };
                        
                        try {
                          let done = false;
                          const timer = window.setTimeout(() => {
                            if (!done) {
                              done = true;
                              openWith();
                            }
                          }, 5000);
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                if (done) return;
                                done = true;
                                window.clearTimeout(timer);
                                openWith({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                              },
                              () => {
                                if (done) return;
                                done = true;
                                window.clearTimeout(timer);
                                openWith();
                              },
                              { enableHighAccuracy: true, timeout: 4500, maximumAge: 30000 }
                            );
                          } else {
                            openWith();
                          }
                        } catch {
                          openWith();
                        }
                      }}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      Get Directions to Workshop
                    </button>
                    {['ASSIGNED', 'ACCEPTED'].includes(order.status) && (
                      <button
                        onClick={handleMarkAtMerchant}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        I have reached the workshop
                      </button>
                    )}
                  </motion.div>
                )}

                {hasApprovalsChat && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <h2 className="text-sm font-semibold text-amber-900">Approval Required</h2>
                    </div>
                    
                    <div className={`space-y-2 ${pendingApprovals.length > 2 ? 'max-h-64 overflow-y-auto pr-1' : ''}`}>
                      {pendingApprovals.map((approval) => (
                        <div key={approval._id} className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-semibold">
                            SC
                          </div>
                          <div className="flex-1">
                            <div className="inline-block max-w-full bg-white border border-amber-200 rounded-2xl px-3 py-2">
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <div className="text-xs font-semibold text-foreground">{approval.data.name}</div>
                                  <div className="text-[11px] text-muted-foreground">
                                    Qty: {approval.data.quantity} • Price: ₹{approval.data.price}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-bold text-foreground">
                                    ₹{approval.data.price * approval.data.quantity}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <div>
                                  <div className="text-[11px] font-medium text-muted-foreground mb-1">New Part</div>
                                  {approval.data.image ? (
                                    <div className="aspect-square rounded-lg overflow-hidden bg-background border border-border">
                                      <img src={approval.data.image} alt="New Part" className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="aspect-square rounded-lg bg-background border border-border flex items-center justify-center text-[11px] text-muted-foreground">
                                      No image
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-[11px] font-medium text-muted-foreground mb-1">Old Part</div>
                                  {approval.data.oldImage ? (
                                    <div className="aspect-square rounded-lg overflow-hidden bg-background border border-border">
                                      <img src={approval.data.oldImage} alt="Old Part" className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="aspect-square rounded-lg bg-background border border-border flex items-center justify-center text-[11px] text-muted-foreground">
                                      No image
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2 justify-end">
                              <button
                                onClick={() => handleApprovalAction(approval._id, 'Rejected')}
                                className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-full text-[11px] font-medium hover:bg-destructive/20 transition-colors flex items-center gap-1.5"
                              >
                                <X className="w-3 h-3" />
                                Reject
                              </button>
                              <button
                                onClick={() => handleApprovalAction(approval._id, 'Approved')}
                                className="px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full text-[11px] font-medium hover:bg-green-500/20 transition-colors flex items-center gap-1.5"
                              >
                                <Check className="w-3 h-3" />
                                Approve
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-2xl border border-border p-4"
          >
            <h2 className="font-semibold text-foreground mb-3">Service Center</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{merchantName}</p>
                {merchantEmail && <p className="text-sm text-muted-foreground">{merchantEmail}</p>}
                {merchantPhone && <p className="text-sm text-muted-foreground">{merchantPhone}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCallMerchant}
                  className="p-3 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
                >
                  <Phone className="w-5 h-5 text-foreground" />
                </button>
                <button
                  onClick={handleChatMerchant}
                  className="p-3 bg-primary rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <MessageCircle className="w-5 h-5 text-primary-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      

      {/* Delivery Confirmation */}
      {order.status === 'DELIVERED' && !hasSubmittedFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6 text-center space-y-4"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Service Completed</h2>
            <p className="text-muted-foreground">Your vehicle has been delivered. Thank you for using our service!</p>
          </div>
          <button
            onClick={() => setShowRatingModal(true)}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Star className="w-5 h-5" />
            Give Feedback for Merchant & Admin
          </button>
        </motion.div>
      )}

      {(order.status === 'SERVICE_COMPLETED' || order.status === 'OUT_FOR_DELIVERY') && !deliveryConfirmed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl border border-border p-6 text-center"
        >
          <h2 className="text-xl font-bold text-foreground mb-2">Vehicle Ready</h2>
          <p className="text-muted-foreground mb-3">Your vehicle is ready for pickup/delivery.</p>
          {order.deliveryOtp?.code && order.status === 'OUT_FOR_DELIVERY' && (
            <div className="mb-4 inline-flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-primary/80">Delivery OTP</p>
              <p className="mt-1 text-2xl font-mono font-semibold text-primary">
                {order.deliveryOtp.code}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Share this code only with our staff at the time of delivery.
              </p>
            </div>
          )}
          <button
            onClick={handleConfirmDelivery}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Confirm Receipt
          </button>
        </motion.div>
      )}

      {/* Merchant Info */}
      

      {/* Rating Modal */}
      <AnimatePresence>
        {showRatingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden"
            >
              <div className="p-6 text-center space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <ThumbsUp className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Rate Service</h2>
                  <p className="text-muted-foreground">Please share your experience with us.</p>
                </div>

                {/* Merchant Review */}
                {order?.merchant && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-primary">Service Center ({order.merchant.name})</h3>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setMerchantRating(star)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-7 h-7 transition-colors ${
                              merchantRating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={merchantComment}
                      onChange={(e) => setMerchantComment(e.target.value)}
                      placeholder="Comment for service center..."
                      rows={3}
                      className="w-full p-3 bg-muted/50 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    />
                  </div>
                )}

                {/* Platform Review */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-primary">Platform Feedback (Admin)</h3>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setPlatformRating(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            platformRating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={platformComment}
                    onChange={(e) => setPlatformComment(e.target.value)}
                    placeholder="Comment for platform/company..."
                    rows={3}
                    className="w-full p-3 bg-muted/50 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowRatingModal(false)}
                    className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleSubmitRating}
                    disabled={isRatingSubmitting}
                    className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    {isRatingSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrackServicePage;
