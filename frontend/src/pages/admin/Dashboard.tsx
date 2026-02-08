import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Car, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle,
  Truck,
  Wrench,
  Package,
  ArrowRight,
  Plus,
  UserPlus,
  Store,
  Bell
} from 'lucide-react';
import { Link } from 'react-router-dom';
import CounterCard from '@/components/CounterCard';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { bookingService, Booking } from '@/services/bookingService';
import { userService } from '@/services/userService';
import { vehicleService } from '@/services/vehicleService';
import { toast } from 'sonner';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeVehicles: 0,
    todaysBookings: 0,
    revenueToday: 0,
    pendingApprovals: 5, // Mock
    pendingBills: 12,    // Mock
    vehiclesOnRoad: 8,   // Mock
    vehiclesInService: 0,
    waitingPickup: 0,
    waitingDelivery: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsData, usersData, vehiclesData] = await Promise.all([
          bookingService.getAllBookings(),
          userService.getAllUsers(),
          vehicleService.getAllVehicles()
        ]);

        const today = new Date().toISOString().split('T')[0];
        const todaysBookings = bookingsData.filter((b: Booking) => b.date.startsWith(today));
        const revenueToday = todaysBookings.reduce((acc: number, curr: Booking) => acc + (curr.totalAmount || 0), 0);
        
        const inService = bookingsData.filter((b: Booking) => ['In Garage', 'Servicing'].includes(b.status)).length;
        const waitingPickup = bookingsData.filter((b: Booking) => b.status === 'Pickup Assigned').length;
        const waitingDelivery = bookingsData.filter((b: Booking) => b.status === 'Ready').length;
        
        // Pending bills: Payment status pending and not cancelled
        const pendingBillsCount = bookingsData.filter((b: Booking) => b.paymentStatus === 'pending' && b.status !== 'Cancelled').length;

        setStats(prev => ({
          ...prev,
          totalCustomers: usersData.length,
          activeVehicles: vehiclesData.length,
          todaysBookings: todaysBookings.length,
          revenueToday: revenueToday,
          pendingBills: pendingBillsCount,
          vehiclesInService: inService,
          waitingPickup: waitingPickup,
          waitingDelivery: waitingDelivery
        }));

      } catch (error) {
        console.error('Failed to fetch admin dashboard data', error);
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
      className="p-6 space-y-8 max-w-[1600px] mx-auto"
    >
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Main Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of system performance and daily operations</p>
        </div>
        <div className="flex gap-2">
           <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
             {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
           </span>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={staggerItem}>
        <h2 className="text-lg font-semibold mb-4">Key Performance Indicators</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <CounterCard 
            label="Total Customers" 
            value={stats.totalCustomers} 
            icon={<Users className="w-4 h-4 text-blue-600" />} 
            delay={0} 
          />
          <CounterCard 
            label="Active Vehicles" 
            value={stats.activeVehicles} 
            icon={<Car className="w-4 h-4 text-indigo-600" />} 
            delay={0.1} 
          />
          <CounterCard 
            label="Today's Bookings" 
            value={stats.todaysBookings} 
            icon={<Calendar className="w-4 h-4 text-green-600" />} 
            delay={0.2} 
          />
          <CounterCard 
            label="Revenue Today" 
            value={`₹${stats.revenueToday}`} 
            icon={<DollarSign className="w-4 h-4 text-emerald-600" />} 
            delay={0.3} 
          />
          <CounterCard 
            label="Pending Approvals" 
            value={stats.pendingApprovals} 
            icon={<CheckCircle className="w-4 h-4 text-orange-600" />} 
            delay={0.4} 
          />
          <CounterCard 
            label="Pending Bills" 
            value={stats.pendingBills} 
            icon={<FileText className="w-4 h-4 text-red-600" />} 
            delay={0.5} 
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Operations Panel */}
        <motion.div variants={staggerItem} className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Live Operations Panel</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehicles on Road</p>
                  <p className="text-2xl font-bold">{stats.vehiclesOnRoad}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <Wrench className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehicles in Service</p>
                  <p className="text-2xl font-bold">{stats.vehiclesInService}</p>
                </div>
              </div>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Waiting for Pickup</p>
                  <p className="text-2xl font-bold">{stats.waitingPickup}</p>
                </div>
              </div>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Waiting Delivery</p>
                  <p className="text-2xl font-bold">{stats.waitingDelivery}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={staggerItem} className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-2 space-y-1">
              <Link to="/admin/bookings/new" className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors group">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">Create Booking</span>
                <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-foreground" />
              </Link>
              
              <Link to="/admin/staff" className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors group">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="font-medium">Assign Staff</span>
                <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-foreground" />
              </Link>

              <Link to="/admin/merchants" className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors group">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg group-hover:bg-orange-100 dark:group-hover:bg-orange-900/40 transition-colors">
                  <Store className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-medium">Assign Merchant</span>
                <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-foreground" />
              </Link>

              <Link to="/admin/vehicles/new" className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors group">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                  <Car className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium">Add Vehicle</span>
                <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-foreground" />
              </Link>

              <Link to="/admin/notifications" className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors group">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg group-hover:bg-red-100 dark:group-hover:bg-red-900/40 transition-colors">
                  <Bell className="w-5 h-5 text-red-600" />
                </div>
                <span className="font-medium">View Alerts</span>
                <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-foreground" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
