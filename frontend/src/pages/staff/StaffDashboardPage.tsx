import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { bookingService, Booking } from '@/services/bookingService';
import CounterCard from '@/components/CounterCard';
import { socketService } from '@/services/socket';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';
import { STATUS_LABELS } from '@/lib/statusFlow';

const StaffDashboardPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    todaysOrders: 0,
    pending: 0,
    completed: 0,
    earnings: 0
  });

  useEffect(() => {
    fetchData();

    // Socket Setup
    socketService.connect();
    socketService.on('bookingUpdated', (updatedBooking: Booking) => {
        // If it's relevant to this staff, refresh data
        const staffId = (useAuthStore.getState().user as any)?._id;
        const isAssignedToMe = (updatedBooking.pickupDriver && (
          (typeof updatedBooking.pickupDriver === 'string' && updatedBooking.pickupDriver === staffId) ||
          (typeof updatedBooking.pickupDriver === 'object' && updatedBooking.pickupDriver._id === staffId)
        ));

        if (isAssignedToMe || bookings.some(b => b._id === updatedBooking._id)) {
          fetchData();
        }
    });

    return () => {
      socketService.off('bookingUpdated');
    };
  }, [bookings.length]);

  const fetchData = async () => {
    try {
      const data = await bookingService.getMyBookings();
      setBookings(data);

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      
      const activeStatuses = [
        'ASSIGNED',
        'ACCEPTED',
        'REACHED_CUSTOMER',
        'VEHICLE_PICKED',
        'REACHED_MERCHANT',
        'SERVICE_STARTED',
        'SERVICE_COMPLETED',
        'OUT_FOR_DELIVERY'
      ];

      const todaysOrders = data.filter(b => b.date && b.date.startsWith(today)).length;
      const pending = data.filter(b => activeStatuses.includes(b.status)).length;
      const completed = data.filter(b => ['SERVICE_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(b.status)).length;
      const earnings = data
        .filter(b => ['SERVICE_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(b.status))
        .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

      setStats({
        todaysOrders,
        pending,
        completed,
        earnings
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]">Loading...</div>;
  }

  // Filter active orders to display (excluding completed/cancelled for the active list)
  const activeStatuses = [
    'ASSIGNED',
    'ACCEPTED',
    'REACHED_CUSTOMER',
    'VEHICLE_PICKED',
    'REACHED_MERCHANT',
    'SERVICE_STARTED',
    'SERVICE_COMPLETED',
    'OUT_FOR_DELIVERY'
  ];

  const activeOrders = bookings.filter(b => activeStatuses.includes(b.status));

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="container-mobile space-y-6 no-horizontal-scroll"
    >
      <motion.div variants={staggerItem}>
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Staff Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Overview of your assigned jobs and live orders
            </p>
          </div>

        </div>
      </motion.div>

      <div className="space-y-6">
        <motion.div variants={staggerItem} className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <CounterCard label="Today's Orders" value={stats.todaysOrders} icon={<Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />} delay={0} />
            <CounterCard label="Pending" value={stats.pending} icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />} delay={1} />
            <CounterCard label="Completed" value={stats.completed} icon={<CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />} delay={2} />
            <CounterCard label="Job Value" value={`₹${stats.earnings}`} icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />} delay={3} />
          </div>

          <div>
            <h2 className="font-semibold text-lg mb-4">Active Orders</h2>
            {activeOrders.length === 0 ? (
              <div className="text-center py-8 sm:py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                <Package className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base sm:text-lg font-medium">No active orders</h3>
                <p className="text-muted-foreground text-sm sm:text-base">You don't have any active orders assigned.</p>
              </div>
            ) : (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
                {activeOrders.map((order) => (
                  <motion.div key={order._id} variants={staggerItem} className="bg-card rounded-2xl border border-border p-4">
                    <Link to={`/staff/order/${order._id}`}>
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">Order #{order.orderNumber ?? order._id.slice(-6).toUpperCase()}</p>
                          <h3 className="font-semibold text-sm sm:text-base line-clamp-2">
                            {order.services && order.services.length > 0
                              ? (typeof order.services[0] === 'string' ? order.services[0] : order.services[0].name)
                              : 'Service'}
                            {order.services && order.services.length > 1 && ` +${order.services.length - 1} more`}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {typeof order.user === 'object' && order.user !== null ? order.user.name : 'Customer'}
                          </p>
                        </div>
                        <span className="px-2 sm:px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium whitespace-nowrap">{STATUS_LABELS[order.status] || order.status}</span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {Array.isArray(order.services) &&
                          order.services.slice(0, 2).map((service, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle className="w-4 h-4 text-muted flex-shrink-0" />
                              <span className="truncate">{typeof service === 'object' ? service.name : service}</span>
                            </div>
                          ))}
                        {Array.isArray(order.services) && order.services.length > 2 && (
                          <div className="text-xs text-muted-foreground pl-6">+{order.services.length - 2} more services</div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StaffDashboardPage;
