import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  Check, 
  Car, 
  Wrench, 
  Calendar, 
  MapPin, 
  Search,
  Sparkles,
  Hammer,
  Droplets,
  Disc,
  Snowflake,
  Package,
  Star,
  Shield,
  Locate,
  Loader2
} from 'lucide-react';
import api from '@/services/api';
import { serviceService, Service } from '@/services/serviceService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { bookingService } from '@/services/bookingService';
import { reviewService } from '@/services/reviewService';
import { useAuthStore } from '@/store/authStore';
import SlotPicker from '@/components/SlotPicker';
import LocationPicker, { LocationValue } from '@/components/LocationPicker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const steps = ['Vehicle', 'Category', 'Sub-category', 'Schedule', 'Confirm'];

const BookServicePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Handle category from search params
  useEffect(() => {
    const categoryParam = searchParams.get('category') || 'Periodic';
    if (categoryParam) {
      setSelectedCategory(categoryParam);
      setSelectedSubCategory(null);
      setSelectedServices([]);
      // If we are past Step 1, we might want to stay in Step 1 or 2
      if (currentStep > 1) {
        setCurrentStep(1);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, []);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pickupLocation, setPickupLocation] = useState<LocationValue>({ address: '' });
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pendingFeedbackBooking, setPendingFeedbackBooking] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.service) {
      const service = location.state.service as Service;
      setSelectedCategory(service.category);
      setSelectedServices([service._id]);
      // If we have a pre-selected service, we might want to hint this to the user
      toast.info(`Booking for ${service.name} initialized. Please select your vehicle.`);
    }
  }, [location.state]);

  const fetchData = async () => {
    try {
      const [servicesData, vehiclesData, pendingData] = await Promise.all([
        serviceService.getServices(),
        vehicleService.getVehicles(),
        reviewService.checkPendingFeedback()
      ]);
      setServices(servicesData);
      setVehicles(vehiclesData);

      if (pendingData.hasPending) {
        setPendingFeedbackBooking(pendingData.bookingId || null);
        toast.error(`Please provide feedback for your previous booking (#${pendingData.orderNumber}) before booking a new service.`);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load booking data');
    }
  };

  const categories = [
    { id: 'Periodic', label: '1. SERVICES', icon: Wrench, subcategories: ['General Service', 'Body Shop', 'Insurance Claim'] },
    { id: 'Wash', label: '2. CAR WASH', icon: Droplets, subcategories: ['Exterior only (45 mins)', 'Interior + Exterior (60–70 mins)', 'Interior + Exterior + Underbody (90 mins)'] },
    { id: 'Tyres', label: '3. TYRES & BATTERY', icon: Disc, subcategories: ['Default OEM size', 'Customer can opt change', 'Amaron Battery', 'Exide Battery'] },
    { id: 'Insurance', label: '4. INSURANCE', icon: Shield, subcategories: ['INSURANCE'] },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedVehicle !== null;
      case 1: return selectedCategory !== null;
      case 2: return selectedSubCategory !== null;
      case 3: 
        const isScheduleComplete = selectedDate !== null && selectedTime !== null;
        const isAddressComplete = pickupLocation.address.trim() !== '';
        return isScheduleComplete && isAddressComplete;
      case 4: return true;
      default: return false;
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  useEffect(() => {
    if (user && (!user.addresses || user.addresses.length === 0)) {
      setShowCustomLocation(true);
    }
  }, [user]);

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!selectedVehicle || !selectedDate || !selectedTime) return;

    setIsLoading(true);
    setError(null);
    try {
      // Combine date and time
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
        serviceIds: selectedServices,
        date: bookingDate.toISOString(),
        location: pickupLocation.address.trim() !== '' ? pickupLocation : undefined,
        notes: ""
      };

      const newBooking = await bookingService.createBooking(bookingData);
      toast.success('Booking confirmed! We have scheduled your service.');
      navigate(`/track/${newBooking._id}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Booking failed:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create booking. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedVehicleData = vehicles.find(v => v._id === selectedVehicle);
  const selectedServicesData = services.filter(s => selectedServices.includes(s._id));
  const totalPrice = selectedServicesData.reduce((sum, service) => sum + service.price, 0);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Book a Service</h1>
        <p className="text-muted-foreground">Schedule your vehicle service in a few steps</p>
      </div>

      {pendingFeedbackBooking && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Star className="w-8 h-8 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-amber-900">Feedback Required</h2>
            <p className="text-amber-700">
              To ensure the best quality service, we require feedback for all completed bookings.
              Please provide feedback for your last service to continue.
            </p>
          </div>
          <button
            onClick={() => navigate(`/track/${pendingFeedbackBooking}`)}
            className="px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors"
          >
            Go to Booking & Give Feedback
          </button>
        </div>
      )}

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-xl border border-destructive/20">
          <p className="font-medium">Booking Failed</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {pendingFeedbackBooking ? null : (
        <>
          {/* Progress Steps */}
          <div className="flex items-center justify-between bg-card rounded-2xl p-4 border border-border">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: index <= currentStep ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                      scale: index === currentStep ? 1.1 : 1,
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                  >
                    {index < currentStep ? (
                      <Check className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <span className={index <= currentStep ? 'text-primary-foreground' : 'text-muted-foreground'}>
                        {index + 1}
                      </span>
                    )}
                  </motion.div>
                  <span className={`text-xs mt-1 ${index <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 w-8 sm:w-16 mx-2 ${index < currentStep ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-[400px]"
          >
            {/* Step 1: Select Vehicle */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Select Vehicle</h2>
                {vehicles.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No vehicles found. Please add a vehicle to your profile first.</p>
                      <button onClick={() => navigate('/add-vehicle')} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                        Add Vehicle
                      </button>
                    </div>
                ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {vehicles.map((vehicle) => (
                    <motion.button
                      key={vehicle._id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedVehicle(vehicle._id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedVehicle === vehicle._id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-16 rounded-xl bg-muted overflow-hidden">
                          {vehicle.image ? (
                            <img src={vehicle.image} alt={vehicle.model} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Car className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-sm text-muted-foreground">{vehicle.licensePlate}</p>
                        </div>
                        {selectedVehicle === vehicle._id && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
                )}
              </div>
            )}

            {/* Step 1: Select Category */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Select Service Category</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categories.map((cat) => (
                    <motion.button
                      key={cat.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSelectedSubCategory(null);
                        setSelectedServices([]);
                        setCurrentStep(2);
                      }}
                      className={`flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
                        selectedCategory === cat.id
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                        selectedCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                      }`}>
                        <cat.icon className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <span className="font-bold text-foreground block">{cat.label.replace(/^\d+\.\s+/, '')}</span>
                      </div>
                      {selectedCategory === cat.id && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select Sub-category */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    Select Sub-category
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.find(c => c.id === selectedCategory)?.subcategories.map((sub) => (
                    <motion.button
                      key={sub}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedSubCategory(sub);
                        // Find matching service and auto-select it
                        const matchingService = services.find(s => 
                          s.name.toLowerCase() === sub.toLowerCase() || 
                          s.name.toLowerCase().includes(sub.toLowerCase())
                        );
                        if (matchingService) {
                          setSelectedServices([matchingService._id]);
                          // Auto proceed to next step (Schedule)
                          setCurrentStep(3);
                        }
                      }}
                      className={`flex items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
                        selectedSubCategory === sub
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        selectedSubCategory === sub ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                      }`}>
                        <Wrench className="w-6 h-6" />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="font-bold text-foreground block">{sub}</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                          {categories.find(c => c.id === selectedCategory)?.label.replace(/^\d+\.\s+/, '')}
                        </span>
                      </div>
                      {selectedSubCategory === sub && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Schedule */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="bg-card rounded-[2rem] border-2 border-border p-8 shadow-sm">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-primary" />
                    Select Schedule
                  </h2>
                  <SlotPicker
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    onDateChange={setSelectedDate}
                    onTimeChange={setSelectedTime}
                  />
                </div>

                <div className="bg-card rounded-[2rem] border-2 border-border p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <MapPin className="w-6 h-6 text-primary" />
                      Customer Location
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {user?.addresses && user.addresses.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                          Choose From Saved Addresses
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {user.addresses.map((addr, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setPickupLocation({ address: addr.address, lat: addr.lat, lng: addr.lng });
                                setShowCustomLocation(false);
                                toast.success(`Selected ${addr.label}`);
                              }}
                              className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                                pickupLocation.address === addr.address && !showCustomLocation
                                  ? 'border-primary bg-primary/5 shadow-md'
                                  : 'border-border bg-muted/20 hover:border-primary/30'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                pickupLocation.address === addr.address && !showCustomLocation ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                              }`}>
                                <MapPin className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-foreground truncate">{addr.label}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">{addr.address}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={cn("pt-4", user?.addresses?.length > 0 && "border-t border-border/50")}>
                      {user?.addresses?.length > 0 && (
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                            Or Enter Custom Address
                          </label>
                          <button
                            onClick={() => {
                              setShowCustomLocation(!showCustomLocation);
                              if (!showCustomLocation) {
                                setPickupLocation({ address: '' });
                              }
                            }}
                            className="text-xs font-bold text-primary uppercase tracking-tight hover:underline"
                          >
                            {showCustomLocation ? 'Cancel' : '+ Add Custom'}
                          </button>
                        </div>
                      )}

                      {(showCustomLocation || !user?.addresses || user.addresses.length === 0) ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-muted/30 rounded-2xl border-2 border-border overflow-hidden p-4"
                        >
                          {(!user?.addresses || user.addresses.length === 0) && (
                             <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest block mb-4">
                               Enter Pickup Address
                             </label>
                          )}
                          <LocationPicker 
                            value={pickupLocation} 
                            onChange={setPickupLocation}
                            mapClassName="h-[300px] w-full rounded-xl mt-4 border-2 border-border shadow-inner"
                          />
                        </motion.div>
                      ) : !pickupLocation.address && (
                        <div className="text-center py-8 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
                          <p className="text-sm text-muted-foreground font-medium">Please select a saved address or enter a custom address.</p>
                        </div>
                      )}

                      {pickupLocation.address && !showCustomLocation && user?.addresses?.length > 0 && (
                        <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-2xl border-2 border-primary/20">
                           <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                             <Check className="w-5 h-5" />
                           </div>
                           <div>
                             <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Selected Location</p>
                             <p className="text-sm font-bold text-foreground leading-relaxed">{pickupLocation.address}</p>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Confirm Booking</h2>
                
                {/* Summary */}
                <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-border">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Car className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {selectedVehicleData?.year} {selectedVehicleData?.make} {selectedVehicleData?.model}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedVehicleData?.licensePlate}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-4 pb-4 border-b border-border">
                    {selectedServicesData.map(service => (
                      <div key={service._id} className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Wrench className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{service.duration} mins</p>
                        </div>
                        <p className="text-lg font-bold text-primary">₹{service.price}</p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2">
                        <span className="font-semibold text-muted-foreground">Total</span>
                        <span className="text-xl font-bold text-primary">₹{totalPrice}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pb-4 border-b border-border">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedTime}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Customer Location</p>
                      <p className="text-sm font-bold text-foreground leading-relaxed">{pickupLocation.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Navigation Buttons */}
          <div className="flex gap-4 pt-4 border-t border-border">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 py-4 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed() || isLoading}
              className="flex-1 py-4 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : currentStep === steps.length - 1 ? (
                'Confirm Booking'
              ) : (
                <>
                  Next
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BookServicePage;
