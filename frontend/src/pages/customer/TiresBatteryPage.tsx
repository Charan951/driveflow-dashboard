import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Battery, Circle, Clock, ChevronRight, AlertTriangle, Package, Shield } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';
import { getAllProducts, Product } from '@/services/productService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { bookingService, Booking } from '@/services/bookingService';

const TiresBatteryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tires' | 'batteries' | 'warranties' | null>(null);
  const [selectedTireSize, setSelectedTireSize] = useState('225/45R17');
  const [products, setProducts] = useState<Product[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const tireSizes = ['205/55R16', '225/45R17', '235/40R18', '245/35R19'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [productsData, vehiclesData, bookingsData] = await Promise.all([
        getAllProducts(),
        vehicleService.getVehicles(),
        bookingService.getMyBookings()
      ]);
      setProducts(productsData);
      setVehicles(vehiclesData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const tires = products.filter(p => p.category?.toLowerCase() === 'tire' || p.category?.toLowerCase() === 'tires');
  const batteries = products.filter(p => p.category?.toLowerCase() === 'battery' || p.category?.toLowerCase() === 'batteries');

  // Get bookings with warranties for battery/tire services
  const warrantyBookings = bookings.filter(booking => {
    const isBatteryOrTireService = Array.isArray(booking.services) && 
      booking.services.some((service: any) => 
        ['Battery', 'Tyres', 'Tyre & Battery'].includes(service.category)
      );
    return isBatteryOrTireService && booking.batteryTire?.warranty;
  });

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
    <div className="w-full h-full py-4 lg:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tires & Battery</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Shop quality parts for your vehicle</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setActiveTab('tires')}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'tires'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Circle className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-sm sm:text-base">Tires</span>
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
            <Battery className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-sm sm:text-base">Batteries</span>
          </div>
        </button>
        {warrantyBookings.length > 0 && (
          <button
            onClick={() => setActiveTab('warranties')}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'warranties'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-sm sm:text-base">Warranties</span>
            </div>
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === null && (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center space-y-4 bg-muted/30 rounded-3xl border-2 border-dashed border-border">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center mb-2">
            <Package className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground opacity-50" />
          </div>
          <div className="space-y-2 max-w-xs sm:max-w-md px-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Select a Category</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Please choose Tires or Batteries from the tabs above to browse our quality products.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'tires' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Size Selector */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Select Tire Size</h3>
            <div className="flex flex-wrap gap-2">
              {tireSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedTireSize(size)}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
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
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {tires.map((tire) => (
                <motion.div
                  key={tire._id}
                  variants={staggerItem}
                  className="bg-card rounded-2xl border border-border p-4 card-hover flex flex-col"
                >
                  <div className="w-full h-24 sm:h-32 rounded-xl bg-muted mb-4 overflow-hidden relative">
                    {tire.image ? (
                      <img
                        src={tire.image}
                        alt={tire.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Circle className="w-8 h-8 sm:w-12 sm:h-12 opacity-20" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{tire.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">{tire.description}</p>
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-base sm:text-lg font-bold text-primary">${tire.price}</span>
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
                      className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px]"
                    >
                      {tire.stock > 0 ? 'Order Now' : 'Out of Stock'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-foreground">No tires available</h3>
              <p className="text-sm text-muted-foreground">Check back later for new stock.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'batteries' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Current Battery Status */}
          {vehicles.length > 0 && (
            <div className="bg-gradient-primary rounded-2xl p-4 sm:p-5 text-primary-foreground">
              <div className="flex items-center gap-3 mb-4">
                <Battery className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm sm:text-base">Current Battery</h3>
                  <p className="text-xs sm:text-sm text-primary-foreground/70 truncate">
                    {vehicles[0].make} {vehicles[0].model}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">Status</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">Good</p>
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-primary-foreground/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm sm:text-lg font-bold">100%</span>
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
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
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
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{battery.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{battery.description}</p>
                      </div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ml-3">
                        <Battery className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="space-y-2 mb-4">
                         <div className="flex justify-between text-xs sm:text-sm">
                           <span className="text-muted-foreground">Stock</span>
                           <span className="font-medium">{battery.stock} units</span>
                         </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-base sm:text-lg font-bold text-primary">${battery.price}</span>
                        <button
                          onClick={() => handleOrder(battery.name)}
                          disabled={battery.stock === 0}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium text-xs sm:text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
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
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Battery className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-foreground">No batteries available</h3>
              <p className="text-sm text-muted-foreground">Check back later for new stock.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'warranties' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Your Warranties</h2>
            <p className="text-sm text-muted-foreground">Active warranties for your tire and battery services</p>
          </div>

          {warrantyBookings.length > 0 ? (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {warrantyBookings.map((booking) => {
                const warranty = booking.batteryTire?.warranty;
                if (!warranty) return null;

                const warrantyEndDate = new Date();
                warrantyEndDate.setMonth(warrantyEndDate.getMonth() + warranty.warrantyMonths);
                const daysRemaining = Math.ceil((warrantyEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isExpiringSoon = daysRemaining <= 30;

                return (
                  <motion.div
                    key={booking._id}
                    variants={staggerItem}
                    className="bg-card rounded-2xl border border-border p-4 sm:p-6 card-hover"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      {warranty.image && (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-border flex-shrink-0">
                          <img
                            src={warranty.image}
                            alt={warranty.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{warranty.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Service Date: {new Date(booking.date).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Shield className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">
                            {warranty.warrantyMonths} months warranty
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Warranty Value</span>
                        <span className="text-sm font-semibold">₹{warranty.price}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Valid Until</span>
                        <span className="text-sm font-semibold">
                          {warrantyEndDate.toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Days Remaining</span>
                        <span className={`text-sm font-semibold ${isExpiringSoon ? 'text-orange-600' : 'text-green-600'}`}>
                          {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                        </span>
                      </div>

                      {isExpiringSoon && daysRemaining > 0 && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mt-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            <span className="text-xs text-orange-700 dark:text-orange-400">
                              Warranty expires soon! Consider renewal.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-foreground">No warranties found</h3>
              <p className="text-sm text-muted-foreground">Your tire and battery service warranties will appear here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TiresBatteryPage;
