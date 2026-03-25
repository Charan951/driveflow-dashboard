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
  Sparkles,
  Hammer,
  Droplets,
  Disc,
  Battery,
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
import { useAuthStore } from '@/store/authStore';
import SlotPicker from '@/components/SlotPicker';
import LocationPicker, { LocationValue } from '@/components/LocationPicker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const steps = ['Vehicle', 'Service', 'Schedule', 'Confirm'];

const COMMON_TIRE_SIZES = [
  '145/70 R12', '155/80 R13', '165/80 R14', '175/65 R14', '185/65 R15', 
  '195/55 R16', '205/55 R16', '215/60 R16', '225/45 R17', '235/45 R18'
];

const BookServicePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
    const [activeSubCategory, setActiveSubCategory] = useState<'Tyres' | 'Battery' | 'All' | null>('All');
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [tireSizes, setTireSizes] = useState<Record<string, string>>({});
  const [serviceQuantities, setServiceQuantities] = useState<Record<string, number>>({});
  const [isManualSize, setIsManualSize] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LocationValue>({ address: '' });
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.service) {
      const service = location.state.service as Service;
      setSelectedServices([service._id]);
      // If we have a pre-selected service, we might want to hint this to the user
      toast.info(`Booking for ${service.name} initialized. Please select your vehicle.`);
    }
  }, [location.state]);

  const fetchData = async () => {
    try {
      const [servicesData, vehiclesData] = await Promise.all([
        serviceService.getServices(),
        vehicleService.getVehicles(),
      ]);
      setServices(servicesData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load booking data');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedVehicle !== null;
      case 1: return selectedServices.length > 0;
      case 2: 
        const isScheduleComplete = selectedDate !== null && selectedTime !== null;
        const isAddressComplete = pickupLocation.address.trim() !== '';
        return isScheduleComplete && isAddressComplete;
      case 3: return true;
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

  useEffect(() => {
    // When returning to the service step for Tyres, reset the sub-category and services
    if (currentStep === 1 && searchParams.get('category') === 'Tyres') {
      setActiveSubCategory(null);
      setSelectedServices([]);
    }
  }, [currentStep, searchParams]);

  useEffect(() => {
    const category = searchParams.get('category');
    
        if (category === 'Tyres') {
      setActiveSubCategory(null); // No default selection
    } else {
      setActiveSubCategory('All');
    }
  }, [searchParams]);

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

      // Check if this is a service that requires payment first (Car Wash, Battery, or Tires)
      const isCarWash = selectedServicesData.some(service => 
        service.category === 'Car Wash' || service.category === 'Wash'
      );
      
      const isBatteryTire = selectedServicesData.some(service => 
        service.category === 'Battery' || 
        service.category === 'Tyres' ||
        service.category === 'Tyre & Battery'
      );

      const requiresPaymentService = isCarWash || isBatteryTire;

      const bookingData = {
        vehicleId: selectedVehicle,
        serviceIds: selectedServices,
        date: bookingDate.toISOString(),
        location: pickupLocation.address.trim() !== '' ? pickupLocation : undefined,
        notes: selectedServicesData.map(service => {
          const size = tireSizes[service._id];
          const qty = serviceQuantities[service._id] || 1;
          let note = `${service.name} (Qty: ${qty})`;
          if (size) note += ` - Size: ${size}`;
          return note;
        }).join(', ')
      };

      const newBooking = await bookingService.createBooking(bookingData);
      
      if (requiresPaymentService && newBooking.requiresPayment) {
        // For services requiring payment, store temp booking data and redirect to payment
        const tempBookingData = {
          ...bookingData,
          totalAmount: totalPrice,
          requiresPaymentService: true,
          isCarWashService: isCarWash,
          isBatteryTireService: isBatteryTire
        };
        
        const serviceType = selectedServicesData.some(service => 
          service.category === 'Car Wash' || service.category === 'Wash'
        ) ? 'car wash' : selectedServicesData.some(service => 
          service.category === 'Battery' || service.category === 'Tyre & Battery'
        ) ? 'battery' : 'tire';
        
        toast.success(`${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} service booking prepared! Please complete payment to create the booking.`);
        // Navigate to a payment page with temp data
        navigate('/payment', { 
          state: { 
            tempBookingData,
            tempBookingId: newBooking.tempBookingId 
          } 
        });
      } else {
        toast.success('Booking confirmed! We have scheduled your service.');
        navigate(`/track/${newBooking._id}`);
      }
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
  const totalPrice = selectedServicesData.reduce((sum, service) => {
    const qty = serviceQuantities[service._id] || 1;
    return sum + (service.price * qty);
  }, 0);

  const categoryMap: Record<string, string[]> = {
    'Periodic': ['Services', 'Periodic', 'Repair', 'AC'],
    'Wash': ['Car Wash', 'Wash', 'Detailing'],
    'Tyres': ['Tyre & Battery', 'Tyres', 'Battery'],
    'Insurance': ['Insurance'],
    'Other': ['Other', 'Painting', 'Denting', 'Accessories']
  };

  // Dynamic title mapping based on category
  const getServiceTitle = () => {
    const categoryParam = searchParams.get('category');
    
    switch (categoryParam) {
      case 'Wash':
        return 'Book a Car Wash Service';
      case 'Tyres':
        return 'Book a Tires & Battery Service';
      case 'Periodic':
        return 'Book a Periodic Service';
      case 'Insurance':
        return 'Book an Insurance Service';
      case 'Services':
        return 'Book a General Service';
      case 'Repair':
        return 'Book a Repair Service';
      case 'AC':
        return 'Book an AC Service';
      case 'Detailing':
        return 'Book a Detailing Service';
      case 'Painting':
        return 'Book a Painting Service';
      case 'Denting':
        return 'Book a Denting Service';
      case 'Accessories':
        return 'Book an Accessories Service';
      case 'Other':
        return 'Book a Service';
      default:
        return 'Book a Service';
    }
  };

  const filteredServices = services.filter(service => {
    // If we have a pre-selected service from location state, show only that one
    if (location.state?.service?._id) {
      return service._id === location.state.service._id;
    }

    const categoryParam = searchParams.get('category');
    let matchesCategory = true;
    
    if (categoryParam) {
      const allowedCategories = categoryMap[categoryParam] || [categoryParam];
      matchesCategory = allowedCategories.includes(service.category);
    }
    
    // Add sub-category filtering for Tyres
        if (categoryParam === 'Tyres') {
      if (activeSubCategory === 'Tyres') {
        matchesCategory = matchesCategory && (service.category === 'Tyres' || service.category === 'Tyre & Battery');
      } else if (activeSubCategory === 'Battery') {
        matchesCategory = matchesCategory && (service.category === 'Battery' || service.category === 'Tyre & Battery');
      } else {
        // If no sub-category is selected, show no services
        matchesCategory = false;
      }
    }
    
    return matchesCategory;
  });

  return (
    <div className="w-full h-full py-4 lg:py-6 space-y-6 overflow-hidden">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{getServiceTitle()}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Schedule your vehicle service in a few steps</p>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-xl border border-destructive/20">
          <p className="font-medium">Booking Failed</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Progress Steps */}
          <div className="flex items-center justify-between bg-card rounded-2xl p-3 sm:p-4 border border-border overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: index <= currentStep ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                      scale: index === currentStep ? 1.1 : 1,
                    }}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium"
                  >
                    {index < currentStep ? (
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                    ) : (
                      <span className={index <= currentStep ? 'text-primary-foreground' : 'text-muted-foreground'}>
                        {index + 1}
                      </span>
                    )}
                  </motion.div>
                  <span className={`text-xs mt-1 text-center max-w-[60px] sm:max-w-none line-clamp-2 sm:line-clamp-1 ${index <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 w-4 sm:w-8 lg:w-16 mx-1 sm:mx-2 ${index < currentStep ? 'bg-primary' : 'bg-muted'}`} />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-16 h-12 sm:w-20 sm:h-16 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                          {vehicle.image ? (
                            <img src={vehicle.image} alt={vehicle.model} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Car className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm sm:text-base line-clamp-1">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{vehicle.licensePlate}</p>
                        </div>
                        {selectedVehicle === vehicle._id && (
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
                )}
              </div>
            )}

            {/* Step 2: Select Service */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-6">
                  {/* Only show heading for non-Tyres categories */}
                  {searchParams.get('category') !== 'Tyres' && (
                    <div className="flex items-center gap-4">
                      <h2 className="text-lg font-semibold text-foreground">Select Services</h2>
                      {location.state?.service && (
                        <button 
                          onClick={() => {
                            // Clear the state by navigating to the same path without state
                            navigate(location.pathname + location.search, { replace: true, state: {} });
                          }}
                          className="text-xs font-bold text-primary uppercase tracking-tight hover:underline"
                        >
                          Show all services
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Sub-category Tabs for Tyres & Battery */}
                  {searchParams.get('category') === 'Tyres' && (
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => setActiveSubCategory('Tyres')}
                        className={`flex-1 py-3 sm:py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                          activeSubCategory === 'Tyres'
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-muted text-foreground hover:bg-muted/80'
                        }`}
                      >
                        <Disc className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">Tires</span>
                      </button>
                      <button
                        onClick={() => setActiveSubCategory('Battery')}
                        className={`flex-1 py-3 sm:py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                          activeSubCategory === 'Battery'
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-muted text-foreground hover:bg-muted/80'
                        }`}
                      >
                        <Battery className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">Battery</span>
                      </button>
                    </div>
                  )}
                </div>
                
                                {filteredServices.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-2xl border-2 border-dashed border-border">
                    <p className="text-muted-foreground">
                      {searchParams.get('category') === 'Tyres' && activeSubCategory === null
                        ? 'Please select a category (Tires or Battery) to see available services.'
                        : 'No services found for your selection.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {filteredServices.map((service) => (
                      <div key={service._id} className="flex flex-col gap-3">
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggleService(service._id)}
                          className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl border-2 transition-all w-full ${
                            selectedServices.includes(service._id)
                              ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                              : 'border-border bg-card hover:border-primary/50'
                          }`}
                        >
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            selectedServices.includes(service._id) ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                          }`}>
                            <img src={service.image} alt={service.name} className="w-full h-full object-cover rounded-xl" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <span className="font-bold text-base sm:text-lg text-foreground block line-clamp-2">{service.name}</span>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                              <span>Price: ₹{service.price}</span>
                              <span>Time: {service.duration} mins</span>
                            </div>
                          </div>
                          {selectedServices.includes(service._id) && (
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                            </div>
                          )}
                        </motion.button>

                        {/* Size Selection for "Customer can opt change" or services with "change" in name */}
                        {selectedServices.includes(service._id) && 
                         (service.name.toLowerCase().includes('change') || service.name.toLowerCase().includes('size')) && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-card border-2 border-primary/20 rounded-2xl p-4 sm:p-6 ml-2 sm:ml-4 space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-bold text-foreground uppercase tracking-wider">Select Size</label>
                              <button 
                                onClick={() => {
                                  setIsManualSize(prev => ({ ...prev, [service._id]: !prev[service._id] }));
                                  setTireSizes(prev => ({ ...prev, [service._id]: '' }));
                                }}
                                className="text-xs font-bold text-primary hover:underline"
                              >
                                {isManualSize[service._id] ? 'Choose from list' : 'Enter manual size'}
                              </button>
                            </div>
                            
                            {isManualSize[service._id] ? (
                              <input 
                                type="text"
                                placeholder="e.g. 205/55 R16"
                                value={tireSizes[service._id] || ''}
                                onChange={(e) => setTireSizes(prev => ({ ...prev, [service._id]: e.target.value }))}
                                className="w-full p-4 rounded-xl border-2 border-border bg-muted/30 focus:border-primary outline-none transition-all font-medium"
                              />
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                {COMMON_TIRE_SIZES.map(size => (
                                  <button
                                    key={size}
                                    onClick={() => setTireSizes(prev => ({ ...prev, [service._id]: size }))}
                                    className={`p-2 sm:p-3 rounded-xl border-2 text-xs sm:text-sm font-medium transition-all ${
                                      tireSizes[service._id] === size
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border bg-muted/20 hover:border-primary/30'
                                    }`}
                                  >
                                    {size}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Quantity Selection */}
                            <div className="space-y-3 pt-4 border-t border-border/50">
                              <label className="text-sm font-bold text-foreground uppercase tracking-wider block">Select Quantity</label>
                              <div className="flex flex-wrap gap-2">
                                {[1, 2, 3, 4, 5].map(qty => (
                                  <button
                                    key={qty}
                                    onClick={() => setServiceQuantities(prev => ({ ...prev, [service._id]: qty }))}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 flex items-center justify-center font-bold transition-all ${
                                      (serviceQuantities[service._id] || 1) === qty
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border bg-muted/20 hover:border-primary/30'
                                    }`}
                                  >
                                    {qty}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Schedule */}
            {currentStep === 2 && (
              <div className="space-y-6 sm:space-y-8">
                <div className="bg-card rounded-2xl border-2 border-border p-4 sm:p-6 lg:p-8 shadow-sm">
                  <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                    <span>Select Schedule</span>
                  </h2>
                  <SlotPicker
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    onDateChange={setSelectedDate}
                    onTimeChange={setSelectedTime}
                  />
                </div>

                <div className="bg-card rounded-2xl border-2 border-border p-4 sm:p-6 lg:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                      <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                      <span>Customer Location</span>
                    </h2>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {user?.addresses && user.addresses.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">
                          Choose From Saved Addresses
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                          {user.addresses.map((addr, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setPickupLocation({ address: addr.address, lat: addr.lat, lng: addr.lng });
                                setShowCustomLocation(false);
                                toast.success(`Selected ${addr.label}`);
                              }}
                              className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all text-left ${
                                pickupLocation.address === addr.address && !showCustomLocation
                                  ? 'border-primary bg-primary/5 shadow-md'
                                  : 'border-border bg-muted/20 hover:border-primary/30'
                              }`}
                            >
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                                pickupLocation.address === addr.address && !showCustomLocation ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                              }`}>
                                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-foreground text-sm sm:text-base truncate">{addr.label}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">{addr.address}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={cn("pt-3 sm:pt-4", user?.addresses?.length > 0 && "border-t border-border/50")}>
                      {user?.addresses?.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                          <label className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">
                            Or Enter Custom Address
                          </label>
                          <button
                            onClick={() => {
                              setShowCustomLocation(!showCustomLocation);
                              if (!showCustomLocation) {
                                setPickupLocation({ address: '' });
                              }
                            }}
                            className="text-xs font-bold text-primary uppercase tracking-tight hover:underline self-start sm:self-auto"
                          >
                            {showCustomLocation ? 'Cancel' : '+ Add Custom'}
                          </button>
                        </div>
                      )}

                      {(showCustomLocation || !user?.addresses || user.addresses.length === 0) ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-muted/30 rounded-xl sm:rounded-2xl border-2 border-border overflow-hidden p-3 sm:p-4"
                        >
                          {(!user?.addresses || user.addresses.length === 0) && (
                             <label className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest block mb-3 sm:mb-4">
                               Enter Pickup Address
                             </label>
                          )}
                          <LocationPicker 
                            value={pickupLocation} 
                            onChange={setPickupLocation}
                            mapClassName="h-[250px] sm:h-[300px] w-full rounded-lg sm:rounded-xl mt-3 sm:mt-4 border-2 border-border shadow-inner"
                          />
                        </motion.div>
                      ) : !pickupLocation.address && (
                        <div className="text-center py-6 sm:py-8 bg-muted/20 rounded-xl sm:rounded-2xl border-2 border-dashed border-border">
                          <p className="text-xs sm:text-sm text-muted-foreground font-medium px-4">Please select a saved address or enter a custom address.</p>
                        </div>
                      )}

                      {pickupLocation.address && !showCustomLocation && user?.addresses?.length > 0 && (
                        <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-primary/5 rounded-xl sm:rounded-2xl border-2 border-primary/20">
                           <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                             <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                           </div>
                           <div className="min-w-0">
                             <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Selected Location</p>
                             <p className="text-sm font-bold text-foreground leading-relaxed break-words">{pickupLocation.address}</p>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Confirm Booking</h2>
                
                {/* Payment Required Notice for Car Wash, Battery, and Tires */}
                {selectedServicesData.some(service => 
                  service.category === 'Car Wash' || 
                  service.category === 'Wash' ||
                  service.category === 'Battery' ||
                  service.category === 'Tyres' ||
                  service.category === 'Tyre & Battery'
                ) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        {selectedServicesData.some(service => service.category === 'Car Wash' || service.category === 'Wash') ? (
                          <Car className="w-4 h-4 text-blue-600" />
                        ) : selectedServicesData.some(service => service.category === 'Battery' || service.category === 'Tyre & Battery') ? (
                          <Battery className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Disc className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900">
                          {selectedServicesData.some(service => service.category === 'Car Wash' || service.category === 'Wash') 
                            ? 'Car Wash Service - Payment Required'
                            : selectedServicesData.some(service => service.category === 'Battery' || service.category === 'Tyre & Battery')
                            ? 'Battery Service - Payment Required'
                            : 'Tire Service - Payment Required'
                          }
                        </h3>
                        <p className="text-sm text-blue-700">
                          You will need to complete payment to confirm your booking. After payment, admin will assign staff to reach your location.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
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
                    {selectedServicesData.map(service => {
                      const qty = serviceQuantities[service._id] || 1;
                      const size = tireSizes[service._id];
                      return (
                        <div key={service._id} className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Wrench className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{service.name}</p>
                            <p className="text-sm text-muted-foreground">{service.duration} mins • Qty: {qty}</p>
                            {size && (
                              <p className="text-xs font-bold text-primary mt-1 uppercase tracking-wider">
                                Size: {size}
                              </p>
                            )}
                          </div>
                          <p className="text-lg font-bold text-primary">₹{service.price * qty}</p>
                        </div>
                      );
                    })}
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
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-border">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="w-full sm:flex-1 py-3 sm:py-4 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed() || isLoading}
              className="w-full sm:flex-1 py-3 sm:py-4 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : currentStep === steps.length - 1 ? (
                selectedServicesData.some(service => 
                  service.category === 'Car Wash' || 
                  service.category === 'Wash' ||
                  service.category === 'Battery' ||
                  service.category === 'Tyres' ||
                  service.category === 'Tyre & Battery'
                ) 
                  ? <span className="text-center">Create Booking (Payment Required)</span>
                  : 'Confirm Booking'
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </>
              )}
            </button>
          </div>
    </div>
  );
};

export default BookServicePage;
