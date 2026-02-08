import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Battery, Circle, Clock, ChevronRight, AlertTriangle, Package } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';
import { getAllProducts, Product } from '@/services/productService';
import { vehicleService, Vehicle } from '@/services/vehicleService';

const TiresBatteryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tires' | 'batteries'>('tires');
  const [selectedTireSize, setSelectedTireSize] = useState('225/45R17');
  const [products, setProducts] = useState<Product[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const tireSizes = ['205/55R16', '225/45R17', '235/40R18', '245/35R19'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [productsData, vehiclesData] = await Promise.all([
        getAllProducts(),
        vehicleService.getVehicles()
      ]);
      setProducts(productsData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const tires = products.filter(p => p.category?.toLowerCase() === 'tire' || p.category?.toLowerCase() === 'tires');
  const batteries = products.filter(p => p.category?.toLowerCase() === 'battery' || p.category?.toLowerCase() === 'batteries');

  const handleOrder = (item: string) => {
    // In a real app, this would add to cart or initiate checkout
    toast.success(`${item} added to cart!`);
  };

  // Calculate days until SLA expiry (Mock logic since product doesn't have expiry yet)
  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return 100; // Default safe value
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          {tires.length > 0 ? (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {tires.map((tire) => (
                <motion.div
                  key={tire._id}
                  variants={staggerItem}
                  className="bg-card rounded-2xl border border-border p-4 card-hover flex flex-col"
                >
                  <div className="w-full h-32 rounded-xl bg-muted mb-4 overflow-hidden relative">
                    {tire.image ? (
                      <img
                        src={tire.image}
                        alt={tire.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Circle className="w-12 h-12 opacity-20" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground">{tire.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{tire.description}</p>
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-bold text-primary">${tire.price}</span>
                      {tire.stock > 0 ? (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full dark:bg-green-900/30 dark:text-green-400">
                          In Stock: {tire.stock}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full dark:bg-red-900/30 dark:text-red-400">
                          Out of Stock
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleOrder(tire.name)}
                      disabled={tire.stock === 0}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {tire.stock > 0 ? 'Order Now' : 'Out of Stock'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No tires available</h3>
              <p className="text-muted-foreground">Check back later for new stock.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'batteries' && (
        <div className="space-y-6">
          {/* Current Battery Status */}
          {vehicles.length > 0 && (
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
                    <span className="text-sm">Status</span>
                  </div>
                  <p className="text-2xl font-bold">Good</p>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-primary-foreground/30 flex items-center justify-center">
                  <span className="text-lg font-bold">100%</span>
                </div>
              </div>
            </div>
          )}

          {/* Battery Cards */}
          {batteries.length > 0 ? (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid sm:grid-cols-2 gap-4"
            >
              {batteries.map((battery) => {
                const daysUntilExpiry = getDaysUntilExpiry();
                const isExpiringSoon = daysUntilExpiry <= 30;

                return (
                  <motion.div
                    key={battery._id}
                    variants={staggerItem}
                    className="bg-card rounded-2xl border border-border p-4 card-hover flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-foreground">{battery.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{battery.description}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Battery className="w-6 h-6 text-primary" />
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="space-y-2 mb-4">
                         <div className="flex justify-between text-sm">
                           <span className="text-muted-foreground">Stock</span>
                           <span className="font-medium">{battery.stock} units</span>
                         </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">${battery.price}</span>
                        <button
                          onClick={() => handleOrder(battery.name)}
                          disabled={battery.stock === 0}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Order
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Battery className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No batteries available</h3>
              <p className="text-muted-foreground">Check back later for new stock.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TiresBatteryPage;
