import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Car, 
  Calendar, 
  ChevronRight, 
  Plus,
  Clock,
  ArrowRight
} from 'lucide-react';
import { staggerContainer, staggerItem } from '@/animations/variants';
import VehicleCard from '@/components/VehicleCard';
import OrderCard from '@/components/OrderCard';

import { vehicleService, Vehicle } from '@/services/vehicleService';
import { bookingService, Booking } from '@/services/bookingService';
import { serviceService, Service } from '@/services/serviceService';
import { toast } from 'sonner';

const DashboardPage: React.FC = () => {
  const vehiclesRef = useRef<HTMLDivElement>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesData, bookingsData, servicesData] = await Promise.all([
          vehicleService.getVehicles(),
          bookingService.getMyBookings(),
          serviceService.getServices()
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

  const upcomingBooking = bookings
    .filter(b => !['Delivered', 'Cancelled', 'Completed'].includes(b.status))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const pastServices = bookings
    .filter(b => ['Delivered', 'Completed'].includes(b.status))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());



  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      'Booked': 'bg-blue-100 text-blue-700',
      'Pickup Assigned': 'bg-indigo-100 text-indigo-700',
      'In Garage': 'bg-yellow-100 text-yellow-700',
      'Servicing': 'bg-orange-100 text-orange-700',
      'Ready': 'bg-green-100 text-green-700',
      'Delivered': 'bg-green-100 text-green-700',
      'Cancelled': 'bg-red-100 text-red-700'
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const mapStatusToCardStatus = (status: string) => {
    const map: Record<string, string> = {
      'Booked': 'pending',
      'Pickup Assigned': 'in_transit',
      'In Garage': 'in_progress',
      'Servicing': 'in_progress',
      'Ready': 'completed',
      'Delivered': 'completed',
      'Cancelled': 'cancelled'
    };
    return map[status] || 'pending';
  };

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good Morning! 👋</h1>
          <p className="text-muted-foreground">Manage your vehicles and services</p>
        </div>
        <Link
          to="/book-service"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Book Service
        </Link>
      </motion.div>



      {/* Upcoming Booking */}
      {upcomingBooking && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-primary rounded-2xl p-5 text-primary-foreground"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-primary-foreground/70 mb-1">Upcoming Service</p>
              <h3 className="text-lg font-semibold">
                {Array.isArray(upcomingBooking.services) 
                  ? (upcomingBooking.services[0] as Service)?.name || 'Service' 
                  : 'Service'}
                 {upcomingBooking.services.length > 1 && ` +${upcomingBooking.services.length - 1} more`}
              </h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium bg-white/20`}>
              {upcomingBooking.status}
            </span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">{new Date(upcomingBooking.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                 {/* Time is not always available in booking, maybe derived or just show date */}
                 10:00 AM
              </span>
            </div>
          </div>
          <Link
            to={`/track/${upcomingBooking._id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-foreground text-primary rounded-xl text-sm font-medium hover:bg-primary-foreground/90 transition-colors"
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
          <Link to="/add-vehicle" className="text-sm text-primary font-medium flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div 
          ref={vehiclesRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0"
        >
          {vehicles.length === 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: vehicles.length * 0.1 }}
            >
              <Link
                to="/add-vehicle"
                className="flex flex-col items-center justify-center min-w-[280px] h-[230px] bg-muted/50 border-2 border-dashed border-border rounded-2xl hover:border-primary hover:bg-muted transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">Add Vehicle</p>
                <p className="text-sm text-muted-foreground">Register a new vehicle</p>
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
          <Link to="/services" className="text-sm text-primary font-medium flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {services.slice(0, 4).map((service) => (
            <motion.div key={service._id} variants={staggerItem}>
              <Link
                to="/book-service"
                className="flex flex-col items-center p-4 bg-card rounded-2xl border border-border hover:border-primary hover:shadow-card transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Car className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground text-center">{service.name}</p>
                <p className="text-xs text-muted-foreground mt-1">${service.price}</p>
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
        <div className="space-y-3">
          {bookings.slice(0, 3).map((booking, index) => (
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
            <div className="text-center py-8 text-muted-foreground">
              No recent services found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
