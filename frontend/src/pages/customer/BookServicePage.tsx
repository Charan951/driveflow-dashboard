import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Package
} from 'lucide-react';
import { serviceService, Service } from '@/services/serviceService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { bookingService } from '@/services/bookingService';
import SlotPicker from '@/components/SlotPicker';
import { toast } from 'sonner';

const steps = ['Vehicle', 'Category', 'Service', 'Schedule', 'Confirm'];

const BookServicePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

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
      const [servicesData, vehiclesData] = await Promise.all([
        serviceService.getServices(),
        vehicleService.getVehicles()
      ]);
      setServices(servicesData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load booking data');
    }
  };

  const categories = [
    { id: 'Periodic', label: 'Periodic Service', icon: Wrench },
    { id: 'Repair', label: 'Engine Repair', icon: Wrench },
    { id: 'Detailing', label: 'Detailing & Coating', icon: Sparkles },
    { id: 'Denting', label: 'Denting & Painting', icon: Hammer },
    { id: 'Wash', label: 'Wash & Polish', icon: Droplets },
    { id: 'Tyres', label: 'Tyres & Wheels', icon: Disc },
    { id: 'AC', label: 'AC Service', icon: Snowflake },
    { id: 'Accessories', label: 'Accessories', icon: Package },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedVehicle !== null;
      case 1: return selectedCategory !== null;
      case 2: return selectedServices.length > 0;
      case 3: return selectedDate !== null && selectedTime !== null;
      case 4: return address.trim() !== '';
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

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!selectedVehicle || !selectedDate || !selectedTime) return;

    setIsLoading(true);
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
        location: address,
        pickupRequired: true, // Assuming pickup is required if address is provided in this flow
        notes: ""
      };

      const newBooking = await bookingService.createBooking(bookingData);
      toast.success('Booking confirmed! We\'ll pick up your vehicle soon.');
      navigate(`/track/${newBooking._id}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Booking failed:', error);
      toast.error(error.response?.data?.message || 'Failed to create booking. Please try again.');
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

        {/* Step 2: Select Category */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Select Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {categories.map((category) => (
                <motion.button
                  key={category.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setSelectedServices([]); // Reset services when category changes
                  }}
                  className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                    selectedCategory === category.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                    selectedCategory === category.id ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    <category.icon className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-foreground">{category.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Service */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Select Service</h2>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {services
                .filter(service => {
                  const matchesCategory = selectedCategory 
                    ? (selectedCategory === 'Denting' 
                        ? (service.category === 'Denting' || service.category === 'Painting')
                        : service.category === selectedCategory)
                    : true;
                  const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                      service.description.toLowerCase().includes(searchTerm.toLowerCase());
                  return matchesCategory && matchesSearch;
                })
                .map((service) => (
                <motion.button
                  key={service._id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleService(service._id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    selectedServices.includes(service._id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-primary" />
                    </div>
                    {selectedServices.includes(service._id) && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{service.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">${service.price}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {service.duration} mins
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
            {services.filter(service => (selectedCategory ? service.category === selectedCategory : true)).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No services found in this category.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Schedule */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Select Date & Time</h2>
            <SlotPicker
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onDateChange={setSelectedDate}
              onTimeChange={setSelectedTime}
            />
          </div>
        )}

        {/* Step 5: Confirm */}
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
                    <p className="text-lg font-bold text-primary">${service.price}</p>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold text-muted-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">${totalPrice}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
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
            </div>

            {/* Pickup Address */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Pickup Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 w-5 h-5 text-muted-foreground" />
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your pickup address"
                  rows={3}
                  className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
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
    </div>
  );
};

export default BookServicePage;
