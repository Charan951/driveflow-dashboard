import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, DollarSign, Star, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { bookingService, Booking } from '@/services/bookingService';
import { productService, Product } from '@/services/productService';
import CounterCard from '@/components/CounterCard';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';

const MerchantDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    rating: 4.8, // Mock rating as backend doesn't provide it yet
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?._id) return;
      try {
        const [bookingsData, productsData] = await Promise.all([
            bookingService.getMerchantBookings(user._id).catch(() => []),
            productService.getMerchantProducts(user._id).catch(() => [])
        ]);

        setOrders(bookingsData);
        setProducts(productsData);

        const revenue = bookingsData
            .filter((b: Booking) => b.paymentStatus === 'paid')
            .reduce((sum: number, b: Booking) => sum + b.totalAmount, 0);

        setStats(prev => ({
            ...prev,
            totalOrders: bookingsData.length,
            revenue
        }));

      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (isLoading) return <div className="p-6">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Merchant Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CounterCard label="Total Orders" value={stats.totalOrders} icon={<Package className="w-5 h-5 text-primary" />} delay={0} />
        <CounterCard label="Revenue" value={`$${stats.revenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5 text-primary" />} delay={1} />
        <CounterCard label="Rating" value={stats.rating} icon={<Star className="w-5 h-5 text-primary" />} delay={2} />
        <CounterCard label="Growth" value="+15%" icon={<TrendingUp className="w-5 h-5 text-primary" />} trend={{ value: 15, isPositive: true }} delay={3} />
      </div>

      {/* Orders */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Recent Orders</h2>
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
          {orders.length > 0 ? orders.slice(0, 5).map((order) => (
            <motion.div key={order._id} variants={staggerItem} className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {Array.isArray(order.services) ? order.services.map((s: any) => s.name || s).join(', ') : 'Service'}
                </p>
                <p className="text-sm text-muted-foreground">
                    {typeof order.user === 'object' ? order.user.name : 'Customer'} • 
                    {typeof order.vehicle === 'object' ? ` ${order.vehicle.make} ${order.vehicle.model}` : ' Vehicle'}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(order.date).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">${order.totalAmount}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${order.status === 'Servicing' ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'}`}>
                  {order.status}
                </span>
              </div>
            </motion.div>
          )) : (
            <p className="text-muted-foreground">No recent orders.</p>
          )}
        </motion.div>
      </div>

      {/* Stock Alerts */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Stock Levels</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {products.length > 0 ? products.map((item) => (
            <div key={item._id} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{item.name}</span>
                {item.stock <= 10 && <AlertTriangle className="w-4 h-4 text-warning" />}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Qty: {item.stock}</span>
                <span className={item.stock <= 10 ? 'text-warning' : 'text-success'}>
                  {item.stock <= 10 ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
            </div>
          )) : (
            <p className="text-muted-foreground">No products found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MerchantDashboardPage;
