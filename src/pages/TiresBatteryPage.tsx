import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Battery, Circle, Clock, ChevronRight, AlertTriangle } from 'lucide-react';
import { tiresAndBatteries, vehicles } from '@/services/dummyData';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';

const TiresBatteryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tires' | 'batteries'>('tires');
  const [selectedTireSize, setSelectedTireSize] = useState('225/45R17');

  const tireSizes = ['205/55R16', '225/45R17', '235/40R18', '245/35R19'];

  const handleOrder = (item: string) => {
    toast.success(`${item} added to cart!`);
  };

  // Calculate days until SLA expiry
  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tires & Battery</h1>
        <p className="text-muted-foreground">Shop quality parts for your vehicle</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setActiveTab('tires')}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'tires'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Circle className="w-4 h-4" />
            Tires
          </div>
        </button>
        <button
          onClick={() => setActiveTab('batteries')}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'batteries'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Battery className="w-4 h-4" />
            Batteries
          </div>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'tires' && (
        <div className="space-y-6">
          {/* Size Selector */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Select Tire Size</h3>
            <div className="flex flex-wrap gap-2">
              {tireSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedTireSize(size)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    selectedTireSize === size
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Tire Cards */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {tiresAndBatteries.tires.map((tire) => (
              <motion.div
                key={tire.id}
                variants={staggerItem}
                className="bg-card rounded-2xl border border-border p-4 card-hover"
              >
                <div className="w-full h-32 rounded-xl bg-muted mb-4 overflow-hidden">
                  <img
                    src={tire.image}
                    alt={tire.model}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-semibold text-foreground">{tire.brand}</h3>
                <p className="text-sm text-muted-foreground mb-2">{tire.model}</p>
                <p className="text-xs text-muted-foreground mb-3">Size: {tire.size}</p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-primary">${tire.price}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-warning">★</span>
                    <span className="text-sm font-medium">{tire.rating}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleOrder(`${tire.brand} ${tire.model}`)}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                  Order Now
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {activeTab === 'batteries' && (
        <div className="space-y-6">
          {/* Current Battery Status */}
          <div className="bg-gradient-primary rounded-2xl p-5 text-primary-foreground">
            <div className="flex items-center gap-3 mb-4">
              <Battery className="w-8 h-8" />
              <div>
                <h3 className="font-semibold">Current Battery</h3>
                <p className="text-sm text-primary-foreground/70">
                  {vehicles[0].make} {vehicles[0].model}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Warranty ends in</span>
                </div>
                <p className="text-2xl font-bold">245 days</p>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-primary-foreground/30 flex items-center justify-center">
                <span className="text-lg font-bold">85%</span>
              </div>
            </div>
          </div>

          {/* Battery Cards */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid sm:grid-cols-2 gap-4"
          >
            {tiresAndBatteries.batteries.map((battery) => {
              const daysUntilExpiry = getDaysUntilExpiry(battery.slaExpiry);
              const isExpiringSoon = daysUntilExpiry <= 30;

              return (
                <motion.div
                  key={battery.id}
                  variants={staggerItem}
                  className="bg-card rounded-2xl border border-border p-4 card-hover"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{battery.brand}</h3>
                      <p className="text-sm text-muted-foreground">{battery.model}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Battery className="w-6 h-6 text-primary" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Capacity</span>
                      <span className="font-medium">{battery.capacity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Warranty</span>
                      <span className="font-medium">{battery.warranty}</span>
                    </div>
                  </div>

                  {/* SLA Countdown */}
                  {isExpiringSoon && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 bg-warning/10 rounded-xl mb-4"
                    >
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="text-sm text-warning font-medium">
                        SLA expires in {daysUntilExpiry} days
                      </span>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">${battery.price}</span>
                    <button
                      onClick={() => handleOrder(`${battery.brand} ${battery.model}`)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
                    >
                      Order
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TiresBatteryPage;
