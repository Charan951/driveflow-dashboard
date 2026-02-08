import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Check, Clock, X, Car } from 'lucide-react';
import SlotPicker from '@/components/SlotPicker';
import { staggerContainer, staggerItem, overlayVariants, modalVariants } from '@/animations/variants';
import { toast } from 'sonner';
import { serviceService, Service } from '@/services/serviceService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { bookingService } from '@/services/bookingService';
import { useNavigate } from 'react-router-dom';

const CarWashPage: React.FC = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [servicesData, vehiclesData] = await Promise.all([
        serviceService.getServices(undefined, 'Wash'),
        vehicleService.getVehicles()
      ]);
      setServices(servicesData);
      setVehicles(vehiclesData);
      if (vehiclesData.length > 0) {
        setSelectedVehicle(vehiclesData[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookNow = (packageId: string) => {
    if (vehicles.length === 0) {
      toast.error('Please add a vehicle to your profile first');
      return;
    }
    setSelectedPackage(packageId);
    setShowModal(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedPackage || !selectedDate || !selectedTime || !selectedVehicle) return;

    setIsBooking(true);
    try {
      const [timePart, modifier] = selectedTime.split(' ');
      const parts = timePart.split(':').map(Number);
      let hours = parts[0];
      const minutes = parts[1];
      
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      
      const bookingDate = new Date(selectedDate);
      bookingDate.setHours(hours, minutes, 0, 0);

      const bookingData = {
        vehicleId: selectedVehicle,
        serviceIds: [selectedPackage],
        date: bookingDate.toISOString(),
        pickupRequired: false,
        notes: "Booked via Car Wash Page"
      };

      await bookingService.createBooking(bookingData);
      toast.success('Car wash booked successfully!');
      setShowModal(false);
      setSelectedDate(null);
      setSelectedTime(null);
      navigate('/my-bookings');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Booking failed:', error);
      toast.error(error.response?.data?.message || 'Failed to book car wash');
    } finally {
      setIsBooking(false);
    }
  };

  const selectedPackageData = services.find(p => p._id === selectedPackage);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Car Wash</h1>
        <p className="text-muted-foreground">Choose a package and book your slot</p>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-2xl">
          <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No Wash Packages Available</h3>
          <p className="text-muted-foreground">Please check back later.</p>
        </div>
      ) : (
        /* Package Cards */
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {services.map((pkg) => (
            <motion.div
              key={pkg._id}
              variants={staggerItem}
              className="relative bg-card rounded-2xl border-2 border-border p-6 transition-all hover:border-primary/50"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Droplets className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{pkg.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{pkg.duration}</span>
              </div>

              {pkg.features && pkg.features.length > 0 && (
                <ul className="space-y-2 mb-6">
                  {pkg.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-success" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center justify-between mb-4 mt-auto">
                <span className="text-3xl font-bold text-primary">${pkg.price}</span>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handleBookNow(pkg._id)}
                className="w-full py-3 rounded-xl font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Book Now
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Booking Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />

            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-xl border border-border overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-card z-10">
                <div>
                  <h2 className="font-semibold text-lg">Book {selectedPackageData?.name}</h2>
                  <p className="text-sm text-muted-foreground">${selectedPackageData?.price}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-6">
                {/* Vehicle Selection */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Select Vehicle</h3>
                  <div className="space-y-2">
                    {vehicles.map((vehicle) => (
                      <button
                        key={vehicle._id}
                        onClick={() => setSelectedVehicle(vehicle._id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          selectedVehicle === vehicle._id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Car className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-foreground">
                            {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {vehicle.licensePlate}
                          </p>
                        </div>
                        {selectedVehicle === vehicle._id && (
                          <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <SlotPicker
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onDateChange={setSelectedDate}
                  onTimeChange={setSelectedTime}
                />
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 p-4 border-t border-border bg-card">
                <button
                  onClick={handleConfirmBooking}
                  disabled={!selectedDate || !selectedTime || !selectedVehicle || isBooking}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isBooking ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CarWashPage;
