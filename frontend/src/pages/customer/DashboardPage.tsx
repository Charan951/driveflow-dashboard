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
import OrderCard from '@/components/OrderCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { vehicleService, Vehicle } from '@/services/vehicleService';
import { bookingService, Booking } from '@/services/bookingService';
import { serviceService, Service } from '@/services/serviceService';
import { toast } from 'sonner';
import { socketService } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { getTimeBasedGreeting } from '@/lib/timeUtils';

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const vehiclesRef = useRef<HTMLDivElement>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState(getTimeBasedGreeting());
  const navigate = useNavigate();

  // Update greeting every minute
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
        const [vehiclesData, bookingsData, servicesData] = await Promise.all([
          vehicleService.getVehicles(),
          bookingService.getMyBookings(),
          serviceService.getServices(undefined, undefined, true)
        ]);
        setVehicles(vehiclesData);
        setBookings(bookingsData);
        setServices(servicesData);
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

      socketService.on('bookingUpdated', handleUpdate);
      socketService.on('bookingCreated', handleUpdate);
      
      return () => {
        socketService.off('bookingUpdated', handleUpdate);
        socketService.off('bookingCreated', handleUpdate);
      };
    }
  }, [user?._id]);

  const upcomingBooking = bookings
    .filter(b => !['CREATED', 'Booked', 'DELIVERED', 'Delivered', 'CANCELLED', 'Cancelled', 'COMPLETED', 'Completed'].includes(b.status))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

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
      'SERVICE_COMPLETED': 'completed',
      'OUT_FOR_DELIVERY': 'in_transit',
      'DELIVERED': 'completed',
      'COMPLETED': 'completed',
      'CANCELLED': 'cancelled'
    };
    return map[status] || 'pending';
  };

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  return (
    <div className="w-full h-full min-h-screen py-4 lg:py-6 space-y-6 overflow-hidden">
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
              {upcomingBooking.status}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{new Date(upcomingBooking.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">10:00 AM</span>
            </div>
          </div>
          <Link
            to={`/track/${upcomingBooking._id}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-foreground text-primary rounded-xl text-sm font-medium hover:bg-primary-foreground/90 transition-colors w-full sm:w-auto"
          >
            Track Service
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}

      {/* My Vehicles */}
      {vehicles.length === 0 && (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">My Vehicles</h2>
          <Link to="/add-vehicle" className="text-sm text-primary font-medium flex items-center gap-1 flex-shrink-0">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div 
          ref={vehiclesRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {vehicles.length === 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: vehicles.length * 0.1 }}
              className="w-full"
            >
              <Link
                to="/add-vehicle"
                className="flex flex-col items-center justify-center w-full min-h-[200px] sm:min-h-[230px] bg-muted/50 border-2 border-dashed border-border rounded-2xl hover:border-primary hover:bg-muted transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">Add Vehicle</p>
                <p className="text-sm text-muted-foreground text-center px-4">Register a new vehicle</p>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
      )}

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

      {/* Past Services */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Services</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {pastServices.slice(0, 6).map((booking, index) => (
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
                onClick={() => navigate(`/track/${booking._id}`)}
              />
            </motion.div>
          ))}
          {bookings.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No recent services found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
