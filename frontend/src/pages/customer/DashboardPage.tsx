import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Car, 
  Calendar, 
  ChevronRight, 
  Plus,
  Clock,
  ArrowRight,
  Wrench,
  Droplets,
  Battery
} from 'lucide-react';
import { staggerContainer, staggerItem } from '@/animations/variants';
import VehicleCard from '@/components/VehicleCard';
import VehicleDetailModal from '@/components/VehicleDetailModal';
import OrderCard from '@/components/OrderCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

import { vehicleService, Vehicle } from '@/services/vehicleService';
import { bookingService, Booking } from '@/services/bookingService';
import { serviceService, Service } from '@/services/serviceService';
import { reviewService, Review } from '@/services/reviewService';
import { toast } from 'sonner';
import { socketService } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { getTimeBasedGreeting } from '@/lib/timeUtils';
import { cn } from '@/lib/utils';
import { Star, Loader2 } from 'lucide-react';

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABELS } from '@/lib/statusFlow';

const DashboardSkeleton = () => (
  <div className="w-full h-full py-4 lg:py-6 space-y-8 animate-pulse">
    <div className="space-y-2">
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-4 w-[300px]" />
    </div>
    <Skeleton className="h-40 w-full rounded-2xl" />
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-6 w-[120px]" />
        <Skeleton className="h-6 w-[80px]" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-48 w-[300px] flex-shrink-0 rounded-2xl" />
        ))}
      </div>
    </div>
    <div className="space-y-4">
      <Skeleton className="h-6 w-[150px]" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState(getTimeBasedGreeting());
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<Vehicle | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNoVehicleDialogOpen, setIsNoVehicleDialogOpen] = useState(false);
  
  // Review Modal State
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const navigate = useNavigate();

  // Update greeting every minute
  useEffect(() => {
    if (!loading && vehicles.length === 0) {
      setIsNoVehicleDialogOpen(true);
    }
  }, [loading, vehicles]);

  useEffect(() => {
    const updateGreeting = () => {
      setGreeting(getTimeBasedGreeting());
    };

    // Update immediately
    updateGreeting();

    // Set up interval to update every minute
    const interval = setInterval(updateGreeting, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesData, bookingsData, servicesData, reviewsData] = await Promise.all([
          vehicleService.getVehicles(),
          bookingService.getMyBookings(),
          serviceService.getServices(undefined, undefined, true),
          reviewService.getMyReviews()
        ]);
        setVehicles(vehiclesData);
        setBookings(bookingsData);
        setServices(servicesData);
        setReviews(reviewsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (user?._id) {
      socketService.connect();
      // Room user_{userId} is automatically joined by the server if authenticated
      
      const handleUpdate = (updatedBooking: any) => {
        setBookings(prev => {
          const index = prev.findIndex(b => b._id === updatedBooking._id);
          if (index >= 0) {
            const newBookings = [...prev];
            newBookings[index] = updatedBooking;
            return newBookings;
          } else {
            return [updatedBooking, ...prev];
          }
        });
      };

      const handleGlobalSync = (data: any) => {
        if (!data) return;
        const entity = (data as any).entity;
        const action = (data as any).action;
        if (entity === 'booking' && action) {
          // Refetch bookings and vehicles for fresh dashboard data
          (async () => {
            try {
              const [vehiclesData, bookingsData] = await Promise.all([
                vehicleService.getVehicles(),
                bookingService.getMyBookings(),
              ]);
              setVehicles(vehiclesData);
              setBookings(bookingsData);
            } catch (e) {
              void e;
            }
          })();
        }
      };

      socketService.on('bookingUpdated', handleUpdate);
      socketService.on('bookingCreated', handleUpdate);
      socketService.on('global:sync', handleGlobalSync);
      
      return () => {
        socketService.off('bookingUpdated', handleUpdate);
        socketService.off('bookingCreated', handleUpdate);
        socketService.off('global:sync', handleGlobalSync);
      };
    }
  }, [user?._id]);

  const upcomingBooking = bookings
    .filter(b => !['DELIVERED', 'Delivered', 'CANCELLED', 'Cancelled', 'COMPLETED', 'Completed'].includes(b.status))
    .sort((a, b) => {
      // Prioritize statuses that are actually "in progress"
      const isInProgress = (s: string) => 
        ['ASSIGNED', 'ACCEPTED', 'STAFF_REACHED_MERCHANT', 'PICKUP_BATTERY_TIRE', 'MERCHANT_INSPECTION', 'PENDING_APPROVAL', 'SERVICE_STARTED', 'CAR_WASH_STARTED', 'INSTALLATION', 'OUT_FOR_DELIVERY', 'VEHICLE_PICKED', 'REACHED_MERCHANT', 'REACHED_CUSTOMER'].includes(s);
      
      const aProgress = isInProgress(a.status);
      const bProgress = isInProgress(b.status);
      
      if (aProgress && !bProgress) return -1;
      if (!aProgress && bProgress) return 1;
      
      // Sort by date descending (most recent first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })[0];

  const pastServices = bookings
    .filter(b => !upcomingBooking || b._id !== upcomingBooking._id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());



  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      'CREATED': 'bg-blue-100 text-blue-700',
      'Booked': 'bg-blue-100 text-blue-700',
      'ASSIGNED': 'bg-indigo-100 text-indigo-700',
      'ACCEPTED': 'bg-indigo-100 text-indigo-700',
      'REACHED_CUSTOMER': 'bg-indigo-100 text-indigo-700',
      'VEHICLE_PICKED': 'bg-yellow-100 text-yellow-700',
      'REACHED_MERCHANT': 'bg-yellow-100 text-yellow-700',
      'SERVICE_STARTED': 'bg-orange-100 text-orange-700',
      'SERVICE_COMPLETED': 'bg-green-100 text-green-700',
      'OUT_FOR_DELIVERY': 'bg-green-100 text-green-700',
      'DELIVERED': 'bg-green-100 text-green-700',
      'COMPLETED': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-red-100 text-red-700'
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const mapStatusToCardStatus = (status: string) => {
    const map: Record<string, string> = {
      'CREATED': 'pending',
      'Booked': 'pending',
      'ASSIGNED': 'in_transit',
      'ACCEPTED': 'in_transit',
      'REACHED_CUSTOMER': 'in_transit',
      'VEHICLE_PICKED': 'in_progress',
      'REACHED_MERCHANT': 'in_progress',
      'SERVICE_STARTED': 'in_progress',
      'SERVICE_COMPLETED': 'awaiting_payment',
      'OUT_FOR_DELIVERY': 'in_transit',
      'DELIVERED': 'completed',
      'COMPLETED': 'completed',
      'CANCELLED': 'cancelled'
    };
    return map[status] || 'pending';
  };

  const handleRateBooking = (booking: Booking, rating: number) => {
    const existingReview = reviews.find(r => 
      (typeof r.booking === 'string' ? r.booking === booking._id : (r.booking as any)?._id === booking._id)
    );
    
    if (existingReview) {
      toast.info('You have already reviewed this service');
      return;
    }

    setSelectedBookingForReview(booking);
    setReviewRating(rating);
    setReviewComment('');
  };

  const handleSubmitReview = async () => {
    if (!selectedBookingForReview) return;

    setIsSubmittingReview(true);
    try {
      // Create Platform Review (Admin)
      await reviewService.createReview({
        booking: selectedBookingForReview._id,
        rating: reviewRating,
        comment: reviewComment,
        category: 'Platform'
      });

      // If it's a merchant booking, also create a Merchant Review
      if (selectedBookingForReview.merchant) {
        await reviewService.createReview({
          booking: selectedBookingForReview._id,
          target: typeof selectedBookingForReview.merchant === 'string' 
            ? selectedBookingForReview.merchant 
            : (selectedBookingForReview.merchant as any)._id,
          rating: reviewRating,
          comment: reviewComment,
          category: 'Merchant'
        });
      }

      toast.success('Thank you for your feedback!');
      setSelectedBookingForReview(null);
      
      // Refresh reviews
      const reviewsData = await reviewService.getMyReviews();
      setReviews(reviewsData);
    } catch (error) {
      console.error('Failed to submit review', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="w-full h-full min-h-screen px-4 py-4 lg:py-6 space-y-8 overflow-x-hidden">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{greeting}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your vehicles and services</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <button
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Book Service
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Select Service Category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Link
                to="/book-service?category=Periodic"
                className="group flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Wrench className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">services</p>
                  <p className="text-sm text-muted-foreground">General maintenance & repairs</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link
                to="/book-service?category=Wash"
                className="group flex items-center gap-4 p-4 rounded-xl border border-border hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Droplets className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Car Wash</p>
                  <p className="text-sm text-muted-foreground">Premium cleaning services</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
              </Link>

              <Link
                to="/book-service?category=Tyres"
                className="group flex items-center gap-4 p-4 rounded-xl border border-border hover:border-orange-500 hover:bg-orange-50 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <Battery className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Battery/tyres</p>
                  <p className="text-sm text-muted-foreground">Replacement & maintenance</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-orange-500 transition-colors" />
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>



      {/* Upcoming Booking */}
      {upcomingBooking && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-primary rounded-2xl p-4 sm:p-5 text-primary-foreground"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-primary-foreground/70 mb-1">Ongoing Service</p>
              <h3 className="text-base sm:text-lg font-semibold break-words">
                {Array.isArray(upcomingBooking.services) 
                  ? (upcomingBooking.services[0] as Service)?.name || 'Service' 
                  : 'Service'}
                 {upcomingBooking.services.length > 1 && ` +${upcomingBooking.services.length - 1} more`}
              </h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium bg-white/20 flex-shrink-0 self-start`}>
              {upcomingBooking.status === 'SERVICE_COMPLETED'
                ? 'Payment awaiting to dispatch vehicle'
                : STATUS_LABELS[upcomingBooking.status as keyof typeof STATUS_LABELS] || upcomingBooking.status}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{new Date(upcomingBooking.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{new Date(upcomingBooking.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
          </div>

          {upcomingBooking.deliveryOtp?.code && (
            <div className="mb-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/40 bg-white/10 px-4 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/80">
                {upcomingBooking.carWash?.isCarWashService ? 'Completion OTP' : 'Delivery OTP'}
              </p>
              <p className="text-xl font-mono font-bold text-white">
                {upcomingBooking.deliveryOtp.code}
              </p>
            </div>
          )}

          <Link
            to={`/track/${upcomingBooking._id}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-foreground text-primary rounded-xl text-sm font-medium hover:bg-primary-foreground/90 transition-colors w-full sm:w-auto"
          >
            Track Service
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}

      {/* Vehicle Detail Modal */}
      <VehicleDetailModal
        vehicle={selectedVehicleForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedVehicleForDetail(null);
        }}
      />

      {/* Quick Services */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Quick Services</h2>
          <Link to="/services" className="text-sm text-primary font-medium flex items-center gap-1 flex-shrink-0">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4"
        >
          {services.slice(0, 4).map((service) => (
            <motion.div key={service._id} variants={staggerItem}>
              <Link
                to="/book-service"
                state={{ service }}
                className="flex flex-col items-center p-3 sm:p-4 bg-card rounded-2xl border border-border hover:border-primary hover:shadow-card transition-all min-h-[120px] sm:min-h-[140px]"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2 sm:mb-3 flex-shrink-0">
                  <Car className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-foreground text-center line-clamp-2 mb-1">{service.name}</p>
                <p className="text-xs text-muted-foreground">${service.price}</p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* My Vehicles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">My Vehicles</h2>
        </div>
        {vehicles.length === 0 ? null : (
          <div className="space-y-4">
            {vehicles.map((vehicle, index) => (
              <motion.div
                key={vehicle._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="w-full"
              >
                <VehicleCard
                  id={vehicle._id}
                  {...vehicle}
                  onClick={() => navigate(`/vehicles/${vehicle._id}`)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Past Services */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Services</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {pastServices.slice(0, 6).map((booking, index) => {
            const bookingReview = reviews.find(r => 
              (typeof r.booking === 'string' ? r.booking === booking._id : (r.booking as any)?._id === booking._id)
            );
            
            return (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <OrderCard
                  id={booking._id}
                  service={Array.isArray(booking.services) 
                    ? (booking.services[0] as Service)?.name || 'Service' 
                    : 'Service'}
                  vehicle={{
                    make: (booking.vehicle as Vehicle)?.make || 'Unknown',
                    model: (booking.vehicle as Vehicle)?.model || 'Vehicle',
                    licensePlate: (booking.vehicle as Vehicle)?.licensePlate || 'N/A',
                  }}
                  status={mapStatusToCardStatus(booking.status)}
                  scheduledDate={new Date(booking.date).toLocaleDateString()}
                  scheduledTime={new Date(booking.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  price={booking.totalAmount}
                  rating={bookingReview?.rating}
                  onRate={(rating) => handleRateBooking(booking, rating)}
                  onClick={() => navigate(`/track/${booking._id}`)}
                />
              </motion.div>
            );
          })}
          {bookings.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No recent services found
            </div>
          )}
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedBookingForReview} onOpenChange={(open) => !open && setSelectedBookingForReview(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Rate Service</DialogTitle>
            <DialogDescription>
              Please share your experience with this service.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex flex-col items-center gap-4">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "w-10 h-10 transition-colors",
                        star <= reviewRating 
                          ? "fill-yellow-400 text-yellow-400" 
                          : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm font-medium text-foreground">
                {reviewRating === 5 ? 'Excellent!' : 
                 reviewRating === 4 ? 'Very Good' :
                 reviewRating === 3 ? 'Good' :
                 reviewRating === 2 ? 'Fair' : 'Poor'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Your Comment (Optional)</p>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share more details about your experience..."
                className="min-h-[100px] rounded-xl resize-none"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedBookingForReview(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitReview}
              disabled={isSubmittingReview}
              className="rounded-xl min-w-[120px]"
            >
              {isSubmittingReview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No Vehicle Dialog */}
      <Dialog open={isNoVehicleDialogOpen} onOpenChange={setIsNoVehicleDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">No Vehicles Registered</DialogTitle>
            <DialogDescription>
              It looks like you haven't registered any vehicles yet. Please add a vehicle to book services.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <Car className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Get started by adding your first vehicle!</p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setIsNoVehicleDialogOpen(false);
                navigate('/vehicles/add');
              }}
              className="w-full rounded-xl"
            >
              Add New Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
