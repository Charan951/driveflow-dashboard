import React from 'react';
import { motion } from 'framer-motion';
import { Package, DollarSign, Star, TrendingUp, AlertTriangle } from 'lucide-react';
import { merchantData } from '@/services/dummyData';
import CounterCard from '@/components/CounterCard';
import { staggerContainer, staggerItem } from '@/animations/variants';

const MerchantDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Merchant Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CounterCard label="Total Orders" value={merchantData.profile.totalOrders} icon={<Package className="w-5 h-5 text-primary" />} delay={0} />
        <CounterCard label="Revenue" value={`$${merchantData.profile.revenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5 text-primary" />} delay={1} />
        <CounterCard label="Rating" value={merchantData.profile.rating} icon={<Star className="w-5 h-5 text-primary" />} delay={2} />
        <CounterCard label="Growth" value="+15%" icon={<TrendingUp className="w-5 h-5 text-primary" />} trend={{ value: 15, isPositive: true }} delay={3} />
      </div>

      {/* Orders */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Recent Orders</h2>
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
          {merchantData.orders.map((order) => (
            <motion.div key={order.id} variants={staggerItem} className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{order.service}</p>
                <p className="text-sm text-muted-foreground">{order.customer} • {order.vehicle}</p>
                <p className="text-xs text-muted-foreground">{order.scheduledDate}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">${order.amount}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${order.status === 'in_progress' ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'}`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Stock Alerts */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Stock Levels</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {merchantData.stock.map((item, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{item.item}</span>
                {item.quantity <= item.reorderLevel && <AlertTriangle className="w-4 h-4 text-warning" />}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Qty: {item.quantity}</span>
                <span className={item.quantity <= item.reorderLevel ? 'text-warning' : 'text-success'}>
                  {item.quantity <= item.reorderLevel ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MerchantDashboardPage;
