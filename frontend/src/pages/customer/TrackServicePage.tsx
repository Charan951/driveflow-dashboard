import React, { useState, useEffect } from 'react';
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
  ThumbsUp
} from 'lucide-react';
import { bookingService, Booking } from '@/services/bookingService';
import { reviewService } from '@/services/reviewService';
import Timeline from '@/components/Timeline';
import { toast } from 'sonner';

const TrackServicePage: React.FC = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
        if (!id) return;
        try {
            const data = await bookingService.getBookingById(id);
            setOrder(data);
            if (data.status === 'Delivered') setDeliveryConfirmed(true);
        } catch (error) {
            console.error("Failed to fetch booking", error);
            toast.error("Failed to load booking details");
        } finally {
            setIsLoading(false);
        }
    };
    fetchOrder();
  }, [id]);

  const handleConfirmDelivery = async () => {
    if (!order?._id) return;
    try {
      await bookingService.updateBookingStatus(order._id, 'Delivered');
      setOrder(prev => prev ? { ...prev, status: 'Delivered' } : null);
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

  if (isLoading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!order) {
    return <div className="p-6 text-center">Order not found</div>;
  }

  // Construct timeline steps based on status
  const statuses = ['Booked', 'Pickup Assigned', 'In Garage', 'Servicing', 'Ready', 'Delivered'];
  const currentStatusIndex = statuses.indexOf(order.status);
  
  const timelineSteps = [
    { step: 'Booking Confirmed', completed: currentStatusIndex >= 0, time: order.date },
    { step: 'Pickup Scheduled', completed: currentStatusIndex >= 1 },
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
  // Use merchant location if available (lat/lng), otherwise generic
  const merchantLocation = order.merchant?.location;
  
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
        
        {merchantLocation && merchantLocation.lat && merchantLocation.lng ? (
             <div className="h-64 bg-muted relative">
               <iframe
                 src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${merchantLocation.lng}!3d${merchantLocation.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1234567890`}
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
                {order.location && <p className="mt-2 text-foreground font-medium">{order.location}</p>}
            </div>
        )}
      </motion.div>

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
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                disabled
            >
                Payment Integration Coming Soon
            </button>
        )}
      </motion.div>

      {/* Delivery Confirmation */}
      {order.status === 'Ready' && !deliveryConfirmed && (
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