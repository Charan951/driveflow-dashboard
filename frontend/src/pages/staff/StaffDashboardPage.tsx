import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, DollarSign, CheckCircle, Upload } from 'lucide-react';
import { bookingService, Booking } from '@/services/bookingService';
import CounterCard from '@/components/CounterCard';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';

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
  }, []);

  const fetchData = async () => {
    try {
      const data = await bookingService.getMyBookings();
      setBookings(data);

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      
      const todaysOrders = data.filter(b => b.date && b.date.startsWith(today)).length;
      const pending = data.filter(b => ['Booked', 'Pickup Assigned', 'In Garage', 'Servicing'].includes(b.status)).length;
      const completed = data.filter(b => ['Ready', 'Delivered'].includes(b.status)).length;
      const earnings = data
        .filter(b => ['Ready', 'Delivered'].includes(b.status))
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
  const activeOrders = bookings.filter(b => ['Pickup Assigned', 'In Garage', 'Servicing'].includes(b.status));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Staff Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CounterCard label="Today's Orders" value={stats.todaysOrders} icon={<Package className="w-5 h-5 text-primary" />} delay={0} />
        <CounterCard label="Pending" value={stats.pending} icon={<Clock className="w-5 h-5 text-primary" />} delay={1} />
        <CounterCard label="Completed" value={stats.completed} icon={<CheckCircle className="w-5 h-5 text-primary" />} delay={2} />
        <CounterCard label="Job Value" value={`₹${stats.earnings}`} icon={<DollarSign className="w-5 h-5 text-primary" />} delay={3} />
      </div>

      {/* Orders */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Active Orders</h2>
        {activeOrders.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium">No active orders</h3>
            <p className="text-muted-foreground">You don't have any active orders assigned.</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
            {activeOrders.map((order) => (
              <motion.div key={order._id} variants={staggerItem} className="bg-card rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Order #{order._id.slice(-6).toUpperCase()}</p>
                    <h3 className="font-semibold">
                        {order.services && order.services.length > 0 
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          ? (typeof order.services[0] === 'object' ? (order.services[0] as any).name : 'Service')
                          : 'Service'}
                        {order.services && order.services.length > 1 && ` +${order.services.length - 1} more`}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {typeof order.user === 'object' ? (order.user as any).name : 'Customer'}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">{order.status}</span>
                </div>
                
                {/* Services List */}
                <div className="space-y-2 mb-4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {Array.isArray(order.services) && order.services.map((service: any, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-muted" />
                      {typeof service === 'object' ? service.name : service}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 py-3 bg-muted rounded-xl font-medium flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" /> Upload Photos
                  </button>
                  <button className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium">
                    Update Status
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboardPage;
