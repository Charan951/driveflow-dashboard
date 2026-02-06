import React from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, DollarSign, Star, CheckCircle, Upload } from 'lucide-react';
import { staffOrders } from '@/services/dummyData';
import CounterCard from '@/components/CounterCard';
import { staggerContainer, staggerItem } from '@/animations/variants';

const StaffDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Staff Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CounterCard label="Today's Orders" value={5} icon={<Package className="w-5 h-5 text-primary" />} delay={0} />
        <CounterCard label="Pending" value={2} icon={<Clock className="w-5 h-5 text-primary" />} delay={1} />
        <CounterCard label="Completed" value={3} icon={<CheckCircle className="w-5 h-5 text-primary" />} delay={2} />
        <CounterCard label="Earnings" value="$450" icon={<DollarSign className="w-5 h-5 text-primary" />} delay={3} />
      </div>

      {/* Orders */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Active Orders</h2>
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
          {staffOrders.map((order) => (
            <motion.div key={order.id} variants={staggerItem} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Order #{order.id}</p>
                  <h3 className="font-semibold">{order.service}</h3>
                  <p className="text-sm text-muted-foreground">{order.customer}</p>
                </div>
                <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">In Progress</span>
              </div>
              
              {/* Checklist */}
              <div className="space-y-2 mb-4">
                {order.checklist.map((item, i) => (
                  <div key={i} className={`flex items-center gap-2 text-sm ${item.completed ? 'text-success' : 'text-muted-foreground'}`}>
                    <CheckCircle className={`w-4 h-4 ${item.completed ? 'text-success' : 'text-muted'}`} />
                    {item.item}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-muted rounded-xl font-medium flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" /> Upload Photos
                </button>
                <button className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium">
                  Complete
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default StaffDashboardPage;
