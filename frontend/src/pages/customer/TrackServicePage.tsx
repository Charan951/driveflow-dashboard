import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  Navigation
} from 'lucide-react';
import { bookingService, Booking } from '@/services/bookingService';
import { getMyApprovals, updateApprovalStatus, ApprovalRequest } from '@/services/approvalService';
import { reviewService } from '@/services/reviewService';
import { paymentService } from '@/services/paymentService';
import { socketService } from '@/services/socket';
import Timeline from '@/components/Timeline';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { AlertTriangle, Check, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const TrackServicePage: React.FC = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);

  // Live Tracking State
  const [staffLocation, setStaffLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
        if (!id) return;
        try {
            const data = await bookingService.getBookingById(id);
            setOrder(data);
            if (data.status === 'DELIVERED') setDeliveryConfirmed(true);
        } catch (error) {
            console.error("Failed to fetch booking", error);
            toast.error("Failed to load booking details");
        } finally {
            setIsLoading(false);
        }
    };
    fetchOrder();

    // Socket Connection for Live Tracking
    if (id) {
      socketService.connect();
      socketService.joinRoom(`booking_${id}`);

      socketService.on('liveLocation', (data) => {
        // data: { lat, lng, ... }
        if (data.lat && data.lng) {
          setStaffLocation({ lat: data.lat, lng: data.lng });
        }
      });

      socketService.on('bookingUpdated', (updatedBooking: Booking) => {
        if (updatedBooking._id === id) {
             setOrder(updatedBooking);
             // toast.info(`Status updated: ${updatedBooking.status}`);
        }
      });

      return () => {
        socketService.leaveRoom(`booking_${id}`);
        socketService.off('liveLocation');
        socketService.off('bookingUpdated');
        // Don't disconnect socket fully as it might be used elsewhere, 
        // but socketService.disconnect() usually handles ref counting or single instance logic. 
        // For now, let's just leave room.
      };
    }
  }, [id]);

  useEffect(() => {
    if (order?._id) {
        fetchPendingApprovals();
    }
  }, [order?._id]);

  const fetchPendingApprovals = async () => {
      if (!order?._id) return;
      try {
          const approvals = await getMyApprovals();
          // Filter for this booking and pending status
          const filtered = approvals.filter(a => 
              a.relatedId === order._id && 
              a.status === 'Pending' &&
              a.type === 'PartReplacement'
          );
          setPendingApprovals(filtered);
      } catch (error) {
          console.error("Failed to fetch approvals", error);
      }
  };

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

  const handleConfirmDelivery = async () => {
    if (!order?._id) return;
    try {
      await bookingService.updateBookingStatus(order._id, 'DELIVERED');
      setOrder(prev => prev ? { ...prev, status: 'DELIVERED' } : null);
      setDeliveryConfirmed(true);
      setShowRatingModal(true);
      toast.success('Delivery confirmed! Order completed.');
    } catch (error) {
      console.error("Failed to confirm delivery", error);
      toast.error("Failed to confirm delivery");
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      await reviewService.createReview({
        target: order?.merchant?._id,
        booking: order?._id,
        rating,
        comment,
        category: order?.merchant ? 'Merchant' : 'Platform'
      });
      toast.success('Thank you for your feedback!');
      setShowRatingModal(false);
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Failed to submit review');
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
      
      const options: RazorpayOptions = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '', 
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Vehicle Care',
        description: 'Service Payment',
        order_id: orderData.id,
        handler: async function (response: any) {
            try {
                await paymentService.verifyPayment({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    bookingId: order._id
                });
                toast.success('Payment Successful!');
                // Refresh order
                const updatedOrder = await bookingService.getBookingById(order._id);
                setOrder(updatedOrder);
            } catch (err) {
                console.error("Payment Verification Error", err);
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
      case 'JOB_CARD':
        return 2;
      case 'SERVICE_STARTED':
        return 3;
      case 'SERVICE_COMPLETED':
      case 'OUT_FOR_DELIVERY':
        return 4;
      case 'DELIVERED':
        return 5;
      default:
        return 0;
    }
  };

  const currentStatusIndex = getStatusStep(order.status);
  
  const timelineSteps = [
    { step: 'Booking Confirmed', completed: currentStatusIndex >= 0, time: order.date },
    { 
      step: order.status === 'REACHED_CUSTOMER' ? 'Staff is waiting to pickup vehicle' : 'Pickup Scheduled', 
      completed: currentStatusIndex >= 1 
    },
    { step: 'At Service Center', completed: currentStatusIndex >= 2 },
    { step: 'Service In Progress', completed: currentStatusIndex >= 3 },
    { step: 'Ready for Delivery', completed: currentStatusIndex >= 4 },
    { step: 'Delivered', completed: currentStatusIndex >= 5 },
  ];

  // Helper to safely access vehicle properties
  const vehicle = (typeof order.vehicle === 'object' && order.vehicle !== null) ? order.vehicle : { 
      make: 'Unknown', model: 'Vehicle', year: 0, licensePlate: 'N/A', image: '' 
  };
  
  // Helper for merchant
  const merchantName = order.merchant?.name || 'Service Center';
  const merchantEmail = order.merchant?.email;
  const merchantPhone = order.merchant?.phone;
  
  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24">
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
          <p className="text-sm text-muted-foreground">Order #{order._id}</p>
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

      {/* Progress Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-6">Service Progress</h2>
        <Timeline steps={timelineSteps} />
      </motion.div>

      {/* Live Tracking Map */}
      {(['VEHICLE_PICKED', 'REACHED_MERCHANT', 'OUT_FOR_DELIVERY'].includes(order.status) || staffLocation) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border overflow-hidden"
        >
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              Live Tracking
            </h3>
            {staffLocation && <span className="text-xs text-green-500 font-medium animate-pulse">● Live</span>}
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
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={[staffLocation.lat, staffLocation.lng]}>
                    <Popup>
                      Staff is here
                    </Popup>
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

      {/* Map Section - Only show if we have location data or just show address text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Service Location
          </h2>
        </div>
        
        {typeof order.location === 'object' && order.location?.lat && order.location?.lng ? (
             <div className="h-64 bg-muted relative">
               <iframe
                 src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${order.location.lng}!3d${order.location.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1234567890`}
                 width="100%"
                 height="100%"
                 style={{ border: 0 }}
                 allowFullScreen
                 loading="lazy"
                 referrerPolicy="no-referrer-when-downgrade"
                 title="Location Map"
               />
            </div>
        ) : (
            <div className="p-6 text-center text-muted-foreground">
                <p>Location map not available.</p>
                {order.location && <p className="mt-2 text-foreground font-medium">{typeof order.location === 'string' ? order.location : order.location.address}</p>}
            </div>
        )}
      </motion.div>

      {/* Pending Approvals Section */}
      {pendingApprovals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6 border-l-4 border-l-yellow-500"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Approval Required
          </h2>
          
          <div className="space-y-4">
            {pendingApprovals.map((approval) => (
              <div key={approval._id} className="bg-muted/30 rounded-xl p-4 border border-border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{approval.data.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {approval.data.quantity} • Price: ₹{approval.data.price}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-foreground">₹{approval.data.price * approval.data.quantity}</span>
                  </div>
                </div>

                {/* Images */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                   {/* New Part */}
                   <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">New Part</p>
                      {approval.data.image ? (
                          <div className="aspect-square rounded-lg overflow-hidden bg-background border border-border">
                              <img src={approval.data.image} alt="New Part" className="w-full h-full object-cover" />
                          </div>
                      ) : (
                          <div className="aspect-square rounded-lg bg-background border border-border flex items-center justify-center text-xs text-muted-foreground">
                              No image
                          </div>
                      )}
                   </div>

                   {/* Old Part */}
                   <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Old Part (Replaced)</p>
                      {approval.data.oldImage ? (
                          <div className="aspect-square rounded-lg overflow-hidden bg-background border border-border">
                              <img src={approval.data.oldImage} alt="Old Part" className="w-full h-full object-cover" />
                          </div>
                      ) : (
                          <div className="aspect-square rounded-lg bg-background border border-border flex items-center justify-center text-xs text-muted-foreground">
                              No image
                          </div>
                      )}
                   </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprovalAction(approval._id, 'Rejected')}
                    className="flex-1 py-2 bg-destructive/10 text-destructive rounded-lg font-medium hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprovalAction(approval._id, 'Approved')}
                    className="flex-1 py-2 bg-green-500/10 text-green-600 rounded-lg font-medium hover:bg-green-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Payment Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
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

      {/* Delivery Confirmation */}
      {(order.status === 'SERVICE_COMPLETED' || order.status === 'OUT_FOR_DELIVERY') && !deliveryConfirmed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl border border-border p-6 text-center"
        >
          <h2 className="text-xl font-bold text-foreground mb-2">Vehicle Ready</h2>
          <p className="text-muted-foreground mb-6">Your vehicle is ready for pickup/delivery.</p>
          <button
            onClick={handleConfirmDelivery}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Confirm Receipt
          </button>
        </motion.div>
      )}

      {/* Merchant Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
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
            {merchantPhone && (
                <a href={`tel:${merchantPhone}`} className="p-3 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
                <Phone className="w-5 h-5 text-foreground" />
                </a>
            )}
            <Link
              to={`/chat/${order._id}`}
              className="p-3 bg-primary rounded-xl hover:bg-primary/90 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </Link>
          </div>
        </div>
      </motion.div>

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
              <div className="p-6 text-center space-y-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <ThumbsUp className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Rate Service</h2>
                  <p className="text-muted-foreground">How was your experience with {order.merchant?.name}?</p>
                </div>

                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience..."
                  rows={4}
                  className="w-full p-4 bg-muted/50 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRatingModal(false)}
                    className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleSubmitRating}
                    className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Submit
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