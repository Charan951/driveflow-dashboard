import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Calendar, User as UserIcon, Car } from 'lucide-react';
import { bookingService, Booking } from '@/services/bookingService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { userService, User } from '@/services/userService';
import { serviceService, Service } from '@/services/serviceService';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { staggerContainer, staggerItem } from '@/animations/variants';

type FilterType = 'all' | 'active' | 'completed' | 'pending-bills';

const Orders: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('active');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await bookingService.getAllBookings();
        setBookings(data);
      } catch (error) {
        console.error('Failed to fetch orders', error);
        toast.error('Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter(booking => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const vehicleMatch = (booking.vehicle as unknown as Vehicle)?.registrationNumber?.toLowerCase().includes(searchLower) || 
                         (booking.vehicle as unknown as Vehicle)?.model?.toLowerCase().includes(searchLower);
    const userMatch = (booking.user as unknown as User)?.name?.toLowerCase().includes(searchLower);
    
    if (searchQuery && !vehicleMatch && !userMatch) return false;

    // Status filter
    if (filter === 'active') {
      return ['Booked', 'Pickup Assigned', 'In Garage', 'Servicing'].includes(booking.status);
    }
    if (filter === 'completed') {
      return ['Ready', 'Delivered'].includes(booking.status);
    }
    if (filter === 'pending-bills') {
      return booking.paymentStatus === 'pending' && booking.status !== 'Cancelled';
    }
    return true;
  });

  if (isLoading) {
    return <div className="p-8 text-center">Loading orders...</div>;
  }

  return (
    <motion.div 
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Service Orders</h1>
          <p className="text-muted-foreground mt-1">Manage your service bookings and assignments</p>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search vehicle or customer..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {(['active', 'completed', 'pending-bills', 'all'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Orders Grid */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredBookings.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No orders found matching your criteria.
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <motion.div
              key={booking._id}
              variants={staggerItem}
              whileHover={{ y: -4, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
              className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col h-full"
            >
              <div className="p-5 flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                      <Car className="w-4 h-4" />
                      <span>{(booking.vehicle as unknown as Vehicle)?.model || 'Unknown Vehicle'}</span>
                    </div>
                    <h3 className="font-bold text-lg">
                      {(booking.vehicle as unknown as Vehicle)?.registrationNumber || 'N/A'}
                    </h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    booking.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                    booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {booking.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{(booking.user as unknown as User)?.name || 'Unknown User'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{new Date(booking.date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Services</p>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(booking.services) && (booking.services as Service[]).slice(0, 3).map((s, i) => (
                      <span key={i} className="inline-block px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-md">
                        {s.name}
                      </span>
                    ))}
                    {Array.isArray(booking.services) && (booking.services as Service[]).length > 3 && (
                      <span className="inline-block px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-md">
                        +{(booking.services as Service[]).length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border bg-muted/20">
                <Link 
                  to={`/merchant/order/${booking._id}`}
                  className="block w-full py-2.5 bg-primary text-primary-foreground text-center rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                  Open Order
                </Link>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
};

export default Orders;
