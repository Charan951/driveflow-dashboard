import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Check, Clock, Star, X } from 'lucide-react';
import { carWashPackages } from '@/services/dummyData';
import SlotPicker from '@/components/SlotPicker';
import { staggerContainer, staggerItem, overlayVariants, modalVariants } from '@/animations/variants';
import { toast } from 'sonner';

const CarWashPage: React.FC = () => {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const handleBookNow = (packageId: string) => {
    setSelectedPackage(packageId);
    setShowModal(true);
  };

  const handleConfirmBooking = () => {
    toast.success('Car wash booked successfully!');
    setShowModal(false);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const selectedPackageData = carWashPackages.find(p => p.id === selectedPackage);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Car Wash</h1>
        <p className="text-muted-foreground">Choose a package and book your slot</p>
      </div>

      {/* Package Cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {carWashPackages.map((pkg) => (
          <motion.div
            key={pkg.id}
            variants={staggerItem}
            className={`relative bg-card rounded-2xl border-2 p-6 transition-all ${
              pkg.popular ? 'border-primary shadow-card' : 'border-border'
            }`}
          >
            {pkg.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                Most Popular
              </span>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Droplets className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{pkg.name}</h3>
                <p className="text-sm text-muted-foreground">{pkg.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{pkg.duration}</span>
            </div>

            <ul className="space-y-2 mb-6">
              {pkg.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl font-bold text-primary">${pkg.price}</span>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleBookNow(pkg.id)}
              className={`w-full py-3 rounded-xl font-medium transition-colors ${
                pkg.popular
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              Book Now
            </motion.button>
          </motion.div>
        ))}
      </motion.div>

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
              <div className="p-4">
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
                  disabled={!selectedDate || !selectedTime}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Booking
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
