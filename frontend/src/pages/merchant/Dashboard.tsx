import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, DollarSign, Users, TrendingUp, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import CounterCard from '@/components/CounterCard';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { bookingService, Booking } from '@/services/bookingService';
import { userService, User } from '@/services/userService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { serviceService, Service } from '@/services/serviceService';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    activeOrders: 0,
    completedOrders: 0,
    pendingBills: 0,
    lowStock: 2, // Mocked for now
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bookingsData = await bookingService.getAllBookings();

        // Calculate stats
        const active = bookingsData.filter((b: Booking) => 
          ['Booked', 'Pickup Assigned', 'In Garage', 'Servicing'].includes(b.status)
        ).length;
        
        const completed = bookingsData.filter((b: Booking) => 
          ['Ready', 'Delivered'].includes(b.status)
        ).length;

        // Assuming pending bills means paymentStatus is pending or a specific status
        const pendingBills = bookingsData.filter((b: Booking) => 
          b.paymentStatus === 'pending' && b.status !== 'Cancelled'
        ).length;

        setStats({
          activeOrders: active,
          completedOrders: completed,
          pendingBills: pendingBills,
          lowStock: 3, // Mocked value as per requirement "Low Stock Alerts"
        });

        setRecentBookings(bookingsData.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  return (
    <motion.div 
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={staggerItem}>
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          {user?.role === 'admin' ? 'Admin Dashboard' : 'Merchant Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of your workshop performance
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <CounterCard 
          label="Active Orders" 
          value={stats.activeOrders} 
          icon={<Package className="w-5 h-5 text-blue-600" />} 
          delay={0} 
        />
        <CounterCard 
          label="Completed Orders" 
          value={stats.completedOrders} 
          icon={<CheckCircle className="w-5 h-5 text-green-600" />} 
          delay={0.1} 
        />
        <CounterCard 
          label="Pending Bills" 
          value={stats.pendingBills} 
          icon={<FileText className="w-5 h-5 text-orange-600" />} 
          delay={0.2} 
        />
        <CounterCard 
          label="Low Stock Alerts" 
          value={stats.lowStock} 
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />} 
          delay={0.3} 
        />
      </motion.div>

      {/* Recent Orders */}
      <motion.div variants={staggerItem}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-xl">Recent Orders</h2>
          <Link to="/merchant/orders" className="text-sm text-primary hover:underline">View All</Link>
        </div>
        <div className="space-y-4">
          {recentBookings.length === 0 ? (
            <p className="text-muted-foreground">No bookings found.</p>
          ) : (
            recentBookings.map((booking) => (
              <motion.div 
                key={booking._id} 
                variants={staggerItem}
                whileHover={{ scale: 1.01, y: -2 }}
                className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between shadow-sm hover:shadow-card-hover transition-all duration-300"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">
                      {(booking.vehicle as unknown as Vehicle)?.registrationNumber || 'N/A'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      booking.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                      booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-1">
                    {Array.isArray(booking.services) 
                      ? (booking.services as unknown as Service[]).map(s => s.name).join(', ') 
                      : 'Service'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Slot: {new Date(booking.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Link 
                    to={`/merchant/order/${booking._id}`}
                    className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    View
                  </Link>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
