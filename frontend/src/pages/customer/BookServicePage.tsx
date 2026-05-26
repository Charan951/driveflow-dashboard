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
import { calculateOrderTotals } from '@/lib/orderPricing';
import { searchVehicleReference } from '@/services/vehicleReferenceService';
import { useAuthStore } from '@/store/authStore';
import { userService } from '@/services/userService';
import { socketService } from '@/services/socket';
import SlotPicker from '@/components/SlotPicker';
import LocationPicker, { LocationValue } from '@/components/LocationPicker';
import VehicleDetailModal from '@/components/VehicleDetailModal';
import { toast } from 'sonner';
import { cn, formatLocalYmd, startOfLocalDay, isSlotStartInPast, isSameLocalCalendarDay } from '@/lib/utils';
import { Info } from 'lucide-react';

const steps = ['Vehicle', 'Service', 'Schedule', 'Confirm'];

const COMMON_TIRE_SIZES = [
  '145/70 R12', '155/80 R13', '165/80 R14', '175/65 R14', '185/65 R15', 
  '195/55 R16', '205/55 R16', '215/60 R16', '225/45 R17', '235/45 R18'
];

const ADMIN_TIRE_BRANDS = [
  'Bridgestone',
  'Yokohama',
  'Apollo',
  'Michelin',
  'Dummy 2',
  'Dummy'
];

const extractPincodeFromAddress = (address?: string) => {
  const match = String(address || '').match(/(\d{6})(?!\d)/);
  return match ? match[1] : null;
};

import { Skeleton } from "@/components/ui/skeleton";

const BookingSkeleton = () => (
  <div className="w-full h-full py-4 lg:py-6 space-y-6">
    <div className="text-center p-12">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-lg font-medium text-muted-foreground">Loading service data...</p>
    </div>
  </div>
);

const BookServicePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, updateUser } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [activeSubCategory, setActiveSubCategory] = useState<'Tyres' | 'Battery' | 'All' | null>(null);
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [tireSizes, setTireSizes] = useState<Record<string, string>>({});
  const [selectedTireBrands, setSelectedTireBrands] = useState<Record<string, string>>({});
  const [serviceQuantities, setServiceQuantities] = useState<Record<string, number>>({});
  const [isManualSize, setIsManualSize] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => startOfLocalDay());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [pickupLocation, setPickupLocation] = useState<LocationValue>({ 
    address: user?.address || '',
    lat: user?.location?.lat,
    lng: user?.location?.lng
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<Vehicle | null>(null);
  const [selectedVehicleReference, setSelectedVehicleReference] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [pickupDropPrice, setPickupDropPrice] = useState<number>(0);
  const [carWashPrices, setCarWashPrices] = useState<Record<string, number | null>>({});

  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [availableServicePincodes, setAvailableServicePincodes] = useState<string[]>([]);
  const [pincodesReady, setPincodesReady] = useState(false);

  const selectedVehicleData = Array.isArray(vehicles) ? vehicles.find(v => v && v._id === selectedVehicle) : undefined;
  const selectedServicesData = Array.isArray(services) ? services.filter(s => s && selectedServices.includes(s._id)) : [];

  const getBookingCategory = () => {
    if (selectedServicesData.length === 0) return 'All';
    const categories = selectedServicesData.map(s => s.category);
    if (categories.some(c => c === 'Car Wash' || c === 'Wash')) return 'Car Wash';
    if (categories.some(c => c === 'Tyres' || c === 'Battery' || c === 'Tyre & Battery')) return 'Tyres & Battery';
    if (categories.some(c => c === 'Essentials')) return 'Essentials';
    return 'General Services';
  };

  const selectedLocationPincode = extractPincodeFromAddress(pickupLocation.address);
  const noServiceAreasConfigured = pincodesReady && availableServicePincodes.length === 0;
  const isSelectedLocationAllowed = Boolean(
    selectedLocationPincode &&
      (!pincodesReady ||
        (availableServicePincodes.length > 0 &&
          availableServicePincodes.includes(selectedLocationPincode)))
  );
  const isGeneralService = selectedServicesData.some(s => 
    s.category === 'Periodic' || 
    s.category === 'Services' || 
    s.name.toLowerCase().includes('general service')
  );

  const getPackagePrice = (service: Service) => {
    const isWash = service.category === 'Car Wash' || service.category === 'Wash';
    const isTire = service.category === 'Tyres' || service.category === 'Tyre & Battery';
    const isGeneral =
      service.category === 'Periodic' ||
      service.category === 'Services' ||
      service.name.toLowerCase().includes('general service');

    if (isGeneral && selectedVehicleReference?.general_service_price != null) {
      const refPrice = Number(selectedVehicleReference.general_service_price);
      if (!Number.isNaN(refPrice) && refPrice > 0) {
        return refPrice;
      }
    }

    if (isTire) {
      const selectedBrandName = selectedTireBrands[service._id];
      if (selectedBrandName && selectedVehicleReference) {
        const brandKey = `tyre_price_${selectedBrandName.toLowerCase().replace(/\s+/g, '')}`;
        const price = selectedVehicleReference[brandKey];
        if (price) return Number(price);
      }
      // Fallback to service price if no brand selected or no reference price
      return Number(service.price || 0);
    }

    if (!isWash) return Number(service.price || 0);

    const sName = service.name.toLowerCase();
    let price = null;

    if (sName.includes('exterior wash') && !sName.includes('interior')) {
      price = carWashPrices.exterior;
    } else if (sName.includes('interior + exterior') && !sName.includes('underbody')) {
      price = carWashPrices.interiorExterior;
    } else if (sName.includes('underbody wash') || (sName.includes('interior') && sName.includes('exterior') && sName.includes('underbody'))) {
      price = carWashPrices.underbody;
    }

    // Fallback to legacy price if specific one is not available
    if (price === null || price === 0) {
      price = carWashPrices.legacy;
    }

    return price !== null && price > 0 ? price : Number(service.price || 0);
  };
  
  const totalPrice = selectedServicesData.reduce((sum, service) => {
    if (!service) return sum;
    const qty = serviceQuantities[service._id] || 1;
    const basePrice = getPackagePrice(service);
    return sum + (basePrice * qty);
  }, 0) + (isGeneralService ? pickupDropPrice : 0);

  const requiresPrepaidCheckout = selectedServicesData.some(service =>
    service.category === 'Car Wash' ||
    service.category === 'Wash' ||
    service.category === 'Detailing' ||
    service.category === 'Battery' ||
    service.category === 'Tyres' ||
    service.category === 'Tyre & Battery' ||
    service.category === 'Essentials'
  );
  const checkoutPreview = calculateOrderTotals(totalPrice, 0, !isGeneralService);

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

  useEffect(() => {
    if (!user?._id) return;
    const hasSaved = Array.isArray(user.addresses) && user.addresses.length > 0;
    if (hasSaved) return;

    let cancelled = false;
    (async () => {
      try {
        const profile = await userService.getProfile();
        if (cancelled || !profile) return;
        const list = profile.addresses || [];
        if (list.length > 0) {
          updateUser({
            addresses: list,
            location: profile.location,
            address: profile.location?.address || user?.address,
          });
        }
      } catch {
        /* optional: session may be invalid */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?._id, user?.addresses, updateUser]);

  const fetchData = async () => {
    try {
      setIsDataLoading(true);
      const [servicesData, vehiclesData, blockedPincodesData] = await Promise.all([
        serviceService.getServices(),
        vehicleService.getVehicles(),
        bookingService.getAvailableServicePincodes(),
      ]);
      console.log('Services loaded:', servicesData);
      console.log('Vehicles loaded:', vehiclesData);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setAvailableServicePincodes(Array.isArray(blockedPincodesData?.availablePincodes) ? blockedPincodesData.availablePincodes : []);
    } catch (error) {
      console.error('Failed to fetch data in BookServicePage:', error);
      toast.error('Failed to load booking data');
      setServices([]);
      setVehicles([]);
      setAvailableServicePincodes([]);
    } finally {
      setIsDataLoading(false);
      setPincodesReady(true);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedVehicle !== null;
      case 1: return selectedServices.length > 0;
      case 2: {
        const isScheduleComplete = selectedDate !== null && selectedTime !== null;
        const isAddressComplete = pickupLocation.address.trim() !== '' && isSelectedLocationAllowed;
        return isScheduleComplete && isAddressComplete;
      }
      case 3: return true;
      default: return false;
    }
  };

  const refreshSlotsForDate = async (date: Date) => {
    try {
      const dateStr = formatLocalYmd(date);
      const category = getBookingCategory();
      const data = await bookingService.getAvailableSlots(dateStr, category);
      const raw = Array.isArray(data?.availableSlots) ? data.availableSlots : [];
      const filtered = raw.filter(
        (slot: string) =>
          !isSameLocalCalendarDay(date) || !isSlotStartInPast(date, slot)
      );
      setAvailableSlots(filtered);
      if (selectedTime && !filtered.includes(selectedTime)) {
        setSelectedTime(null);
        toast.info('Previously selected slot is no longer available for the selected services. Please select another slot.');
      }
    } catch {
      setAvailableSlots([]);
    }
  };

  const refreshAvailablePincodes = async () => {
    try {
      const data = await bookingService.getAvailableServicePincodes();
      const nextPins = Array.isArray(data?.availablePincodes) ? data.availablePincodes : [];
      setAvailableServicePincodes(nextPins);
      setPincodesReady(true);
    } catch {
      setAvailableServicePincodes([]);
      setPincodesReady(true);
    }
  };

  useEffect(() => {
    const prefillTireSizes = async () => {
      if (selectedVehicle && selectedVehicleData) {
        let vehicleTireSize = selectedVehicleData.frontTyres || selectedVehicleData.rearTyres;
        let vehiclePickupDropPrice = 0;
        let vehicleCarWashPrices: Record<string, number | null> = {};
        
        // Try to fetch from reference when variant is present
        if (selectedVehicleData.variant && selectedVehicleData.variant.trim() !== '') {
          try {
            const details = await searchVehicleReference(
              selectedVehicleData.make, 
              selectedVehicleData.model, 
              selectedVehicleData.variant
            );
            if (details) {
              if (!vehicleTireSize) {
                  vehicleTireSize = details.front_tyres || details.rear_tyres;
                }
                vehiclePickupDropPrice = Number(details.pickup_drop_price || 0);
                setSelectedVehicleReference(details);
                vehicleCarWashPrices = {
                  exterior: details.car_wash_exterior_price ? Number(details.car_wash_exterior_price) : null,
                interiorExterior: details.car_wash_interior_exterior_price ? Number(details.car_wash_interior_exterior_price) : null,
                underbody: details.car_wash_interior_exterior_underbody_price ? Number(details.car_wash_interior_exterior_underbody_price) : null,
                legacy: details.car_wash_price ? Number(details.car_wash_price) : null
              };
            }
          } catch (error) {
            console.error('Failed to auto-fetch reference details during booking:', error);
          }
        } else {
            // Even without variant, try searching with brand and model
            try {
              const details = await searchVehicleReference(
                selectedVehicleData.make, 
                selectedVehicleData.model, 
                ''
              );
              if (details) {
                if (!vehicleTireSize) {
                  vehicleTireSize = details.front_tyres || details.rear_tyres;
                }
                vehiclePickupDropPrice = Number(details.pickup_drop_price || 0);
              setSelectedVehicleReference(details);
              vehicleCarWashPrices = {
                  exterior: details.car_wash_exterior_price ? Number(details.car_wash_exterior_price) : null,
                  interiorExterior: details.car_wash_interior_exterior_price ? Number(details.car_wash_interior_exterior_price) : null,
                  underbody: details.car_wash_interior_exterior_underbody_price ? Number(details.car_wash_interior_exterior_underbody_price) : null,
                  legacy: details.car_wash_price ? Number(details.car_wash_price) : null
                };
              }
            } catch (error) {
              console.error('Failed to auto-fetch reference details during booking:', error);
            }
        }
        
        setPickupDropPrice(vehiclePickupDropPrice);
        setCarWashPrices(vehicleCarWashPrices);

        if (vehicleTireSize) {
          setTireSizes(prevSizes => {
            const newSizes = { ...prevSizes };
            let changed = false;
            
            selectedServices.forEach(serviceId => {
              const service = services.find(s => s._id === serviceId);
              const isTireService = service?.name?.toLowerCase()?.includes('change') || 
                                  service?.name?.toLowerCase()?.includes('size');
              
              if (isTireService && !newSizes[serviceId]) {
                newSizes[serviceId] = vehicleTireSize;
                changed = true;
                
                // If the size is not in COMMON_TIRE_SIZES, enable manual size mode
                if (!COMMON_TIRE_SIZES.includes(vehicleTireSize)) {
                  setIsManualSize(prevManual => ({
                    ...prevManual,
                    [serviceId]: true
                  }));
                }
              }
            });
            
            return changed ? newSizes : prevSizes;
          });
        }
      }
    };

    prefillTireSizes();
  }, [selectedVehicle, selectedVehicleData, selectedServices, services]);

  const toggleService = async (serviceId: string) => {
    const isSelecting = !selectedServices.includes(serviceId);
    
    setSelectedServices(prev => {
      return isSelecting
        ? [...prev, serviceId]
        : prev.filter(id => id !== serviceId);
    });

    // If selecting a tire service and a vehicle is selected, pre-fill tire size
    if (isSelecting) {
      const service = services.find(s => s._id === serviceId);
      const isTireService = service?.name?.toLowerCase()?.includes('change') || 
                          service?.name?.toLowerCase()?.includes('size');
      
      if (isTireService && selectedVehicleData) {
        let vehicleTireSize = selectedVehicleData.frontTyres || selectedVehicleData.rearTyres;
        
        // If no tire size on vehicle, try to fetch from reference when variant is present
        if (!vehicleTireSize && selectedVehicleData.variant && selectedVehicleData.variant.trim() !== '') {
          try {
            const details = await searchVehicleReference(
              selectedVehicleData.make, 
              selectedVehicleData.model, 
              selectedVehicleData.variant
            );
            if (details) {
              vehicleTireSize = details.front_tyres || details.rear_tyres;
            }
          } catch (error) {
            console.error('Failed to auto-fetch tire size during booking selection:', error);
          }
        }

        if (vehicleTireSize) {
          setTireSizes(prevSizes => ({
            ...prevSizes,
            [serviceId]: vehicleTireSize
          }));
          
          // If the size is not in COMMON_TIRE_SIZES, enable manual size mode
          if (!COMMON_TIRE_SIZES.includes(vehicleTireSize)) {
            setIsManualSize(prevManual => ({
              ...prevManual,
              [serviceId]: true
            }));
          }
        }
      }
    }
  };

  useEffect(() => {
    if (user && !pickupLocation.address) {
      setPickupLocation({
        address: user.address || '',
        lat: user.location?.lat,
        lng: user.location?.lng
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && (!user.addresses || !Array.isArray(user.addresses) || user.addresses.length === 0)) {
      setShowCustomLocation(false);
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

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate) {
        setAvailableSlots([]);
        setSelectedTime(null);
        return;
      }
      try {
        await refreshSlotsForDate(selectedDate);
      } catch (error) {
        setAvailableSlots([]);
        toast.error('Failed to load available slots');
      }
    };

    fetchSlots();
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate && selectedServices.length > 0) {
      refreshSlotsForDate(selectedDate);
    }
  }, [selectedServices]);

  useEffect(() => {
    socketService.connect();

    const onGlobalSync = async (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const data = payload as {
        entity?: string;
        data?: { date?: string; availablePincodes?: string[] };
      };
      const entity = data.entity || '';

      if (entity === 'availableServicePincode') {
        const pins = data.data?.availablePincodes;
        if (Array.isArray(pins)) {
          setAvailableServicePincodes(pins);
          setPincodesReady(true);
        } else {
          await refreshAvailablePincodes();
        }
        return;
      }

      if (entity === 'slotBlock') {
        if (!selectedDate) return;
        const changedDateRaw = data.data?.date;
        if (changedDateRaw) {
          const changedDate = new Date(changedDateRaw);
          if (!isNaN(changedDate.getTime()) && !isSameLocalCalendarDay(selectedDate, changedDate)) {
            return;
          }
        }
        await refreshSlotsForDate(selectedDate);
        return;
      }

      if (entity === 'booking' && selectedDate) {
        const changedDateRaw = data.data?.date;
        if (!changedDateRaw) {
          await refreshSlotsForDate(selectedDate);
          return;
        }
        const changedDate = new Date(changedDateRaw);
        if (!isNaN(changedDate.getTime()) && isSameLocalCalendarDay(selectedDate, changedDate)) {
          await refreshSlotsForDate(selectedDate);
        }
      }
    };

    socketService.on('global:sync', onGlobalSync);
    return () => {
      socketService.off('global:sync', onGlobalSync);
    };
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    if (!selectedDate || !selectedTime) return;
    if (isSameLocalCalendarDay(selectedDate) && isSlotStartInPast(selectedDate, selectedTime)) {
      setSelectedTime(null);
    }
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    if (!isSelectedLocationAllowed) {
      setSelectedTime(null);
    }
  }, [isSelectedLocationAllowed]);

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!selectedVehicle || !selectedDate || !selectedTime) return;
    if (isSameLocalCalendarDay(selectedDate) && isSlotStartInPast(selectedDate, selectedTime)) {
      toast.error('Please choose a time from now onward.');
      return;
    }
    if (!isSelectedLocationAllowed) {
      toast.error(
        noServiceAreasConfigured
          ? 'Service not available at this area.'
          : !selectedLocationPincode
            ? 'Pickup address must include a valid 6-digit pincode.'
            : 'Selected location is not enabled for service booking.'
      );
      return;
    }

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

      // Check if this is a service that requires payment first (Car Wash, Battery/Tires, or Essentials)
      const isCarWash = selectedServicesData.some(service => 
        service.category === 'Car Wash' || service.category === 'Wash' || service.category === 'Detailing'
      );
      
      const isBatteryTire = selectedServicesData.some(service => 
        service.category === 'Battery' || 
        service.category === 'Tyres' ||
        service.category === 'Tyre & Battery'
      );

      const isEssentialsService = selectedServicesData.some(service =>
        service.category === 'Essentials'
      );

      const requiresPaymentService = isCarWash || isBatteryTire || isEssentialsService;

      const bookingData = {
        vehicleId: selectedVehicle,
        serviceIds: selectedServices,
        date: bookingDate.toISOString(),
        location: pickupLocation.address.trim() !== '' ? pickupLocation : undefined,
        notes: selectedServicesData.map(service => {
          const size = tireSizes[service._id];
          const brand = selectedTireBrands[service._id];
          const qty = serviceQuantities[service._id] || 1;
          let note = `${service.name} (Qty: ${qty})`;
          if (size) note += ` - Size: ${size}`;
          if (brand) note += ` - Brand: ${brand}`;
          return note;
        }).join(', ')
      };

      const newBooking = await bookingService.createBooking(bookingData);
      
      if (requiresPaymentService && newBooking.requiresPayment) {
        // For services requiring payment, store temp booking data and redirect to payment
        const tempBookingData = {
          ...bookingData,
          totalAmount: newBooking.totalAmount || totalPrice,
          pickupDropPrice: newBooking.pickupDropPrice || pickupDropPrice,
          requiresPaymentService: true,
          isCarWashService: isCarWash || isEssentialsService,
          isBatteryTireService: isBatteryTire,
          isEssentialsService
        };
        
        const serviceType = selectedServicesData.some(service => 
          service.category === 'Car Wash' || service.category === 'Wash'
        ) ? 'car wash' : selectedServicesData.some(service => 
          service.category === 'Battery' || service.category === 'Tyre & Battery'
        ) ? 'battery' : selectedServicesData.some(service =>
          service.category === 'Essentials'
        ) ? 'essentials' : 'tire';
        
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
        navigate('/dashboard', {
          state: {
            showAssignmentToast: true
          }
        });
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

  const categoryMap: Record<string, string[]> = {
    'Periodic': ['Services', 'Periodic', 'Repair', 'AC'],
    'Wash': ['Car Wash', 'Wash', 'Detailing'],
    'Tyres': ['Tyre & Battery', 'Tyres', 'Battery'],
    'Essentials': ['Essentials', 'Accessories'],
    'Other': ['Other', 'Painting', 'Denting', 'Accessories']
  };

  // Dynamic title mapping based on category
  const getServiceTitle = () => {
    const categoryParam = searchParams.get('category');
    
    if (!categoryParam) return 'Book a Service';

    switch (categoryParam) {
      case 'Wash':
        return 'Book a Car Wash Service';
      case 'Tyres':
        return 'Book a Tires & Battery Service';
      case 'Periodic':
        return 'Book a Periodic Service';
      case 'Essentials':
        return 'Book an Essentials Service';
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

  const filteredServices = Array.isArray(services) ? services.filter(service => {
    if (!service) return false;
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
  }) : [];

  if (isDataLoading) {
    return <BookingSkeleton />;
  }

  console.log('Rendering BookServicePage with category:', searchParams.get('category'));

  return (
    <div className="w-full min-h-screen py-4 lg:py-6 space-y-6">
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
                {!Array.isArray(vehicles) || vehicles.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No vehicles found. Please add a vehicle to your profile first.</p>
                      <button onClick={() => navigate('/add-vehicle')} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                        Add Vehicle
                      </button>
                    </div>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {vehicles.map((vehicle) => (
                    <motion.div
                      key={vehicle._id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedVehicle(vehicle._id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedVehicle(vehicle._id);
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${
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
                        <div className="flex-1 min-w-0 py-1">
                          <h3 className="text-lg font-bold text-foreground leading-tight tracking-tight">
                            {vehicle.make}
                          </h3>
                          <p className="text-base font-medium text-foreground/80 leading-tight">
                            {vehicle.model}
                          </p>
                          {vehicle.variant && (
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 leading-tight">
                              {vehicle.variant}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/60">
                            <span>{vehicle.year}</span>
                            <span>•</span>
                            <span className="font-mono uppercase tracking-wider">{vehicle.licensePlate}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVehicleForDetail(vehicle);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            title="View Details"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          {selectedVehicle === vehicle._id && (
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                )}
                
                {/* Vehicle Detail Modal */}
                <VehicleDetailModal
                  vehicle={selectedVehicleForDetail}
                  isOpen={isDetailModalOpen}
                  onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedVehicleForDetail(null);
                  }}
                />
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
                        onClick={() => {
                          if (activeSubCategory !== 'Tyres') {
                            setActiveSubCategory('Tyres');
                            setSelectedServices([]); // Clear selection when switching categories
                          }
                        }}
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
                        onClick={() => {
                          if (activeSubCategory !== 'Battery') {
                            setActiveSubCategory('Battery');
                            setSelectedServices([]); // Clear selection when switching categories
                          }
                        }}
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
                
                {searchParams.get('category') === 'Tyres' && activeSubCategory === null && (
                  <div className="text-center py-12 bg-card rounded-2xl border-2 border-dashed border-border flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground opacity-50" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-foreground">Select a category</p>
                      <p className="text-sm text-muted-foreground">Please choose Tires or Battery to see available services.</p>
                    </div>
                  </div>
                )}
                
                {filteredServices.length === 0 && (searchParams.get('category') !== 'Tyres' || activeSubCategory !== null) ? (
                  <div className="text-center py-12 bg-card rounded-2xl border-2 border-dashed border-border">
                    <p className="text-muted-foreground">
                      No services found for your selection.
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
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shrink-0">
                            <img src={service.image} alt={service.name} className="w-full h-full object-contain rounded-xl" />
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
                          (service.name?.toLowerCase()?.includes('change') || service.name?.toLowerCase()?.includes('size')) && (
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

                            {/* Brand Selection for Tyres */}
                            {(service.category === 'Tyres' || service.category === 'Tyre & Battery') && (
                              <div className="space-y-3 pt-4 border-t border-border/50">
                                <label className="text-sm font-bold text-foreground uppercase tracking-wider block">Select Brand</label>
                                <div className="relative">
                                  <select
                                    value={selectedTireBrands[service._id] || ''}
                                    onChange={(e) => setSelectedTireBrands(prev => ({ ...prev, [service._id]: e.target.value }))}
                                    className="w-full p-4 rounded-xl border-2 border-border bg-muted/30 focus:border-primary outline-none transition-all font-medium appearance-none cursor-pointer"
                                  >
                                    <option value="" disabled>Choose a brand</option>
                                    {ADMIN_TIRE_BRANDS.map(brand => (
                                      <option key={brand} value={brand}>
                                        {brand}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                    <ChevronRight className="w-5 h-5 rotate-90" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Location & schedule */}
            {currentStep === 2 && (
              <div className="space-y-6 sm:space-y-8">
                <div className="bg-card rounded-2xl border-2 border-border p-4 sm:p-6 lg:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                        <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                        <span>Customer Location</span>
                      </h2>
                      {!showCustomLocation && user?.addresses?.length > 0 && !pickupLocation.address && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Please select a saved address or enter a custom address.
                        </p>
                      )}
                    </div>
                    {user?.addresses && user.addresses.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomLocation(!showCustomLocation);
                          if (!showCustomLocation) {
                            setPickupLocation({ address: '' });
                          }
                        }}
                        className="inline-flex items-center justify-center rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs sm:text-sm font-semibold text-primary hover:bg-primary/15 transition-colors"
                      >
                        {showCustomLocation ? 'Cancel Custom' : '+ Add Custom'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        className="inline-flex items-center justify-center rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs sm:text-sm font-semibold text-primary hover:bg-primary/15 transition-colors"
                      >
                        + Add Address
                      </button>
                    )}
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {user?.addresses && user.addresses.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">
                          Choose From Saved Addresses
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                          {user.addresses.map((addr, index) => (
                            (() => {
                              const pin = extractPincodeFromAddress(addr.address);
                              const isBlockedAddress = Boolean(
                                pincodesReady &&
                                  (availableServicePincodes.length === 0 ||
                                    !pin ||
                                    !availableServicePincodes.includes(pin))
                              );
                              return (
                            <button
                              key={index}
                              type="button"
                              disabled={isBlockedAddress}
                              onClick={() => {
                                if (isBlockedAddress) return;
                                setPickupLocation({ address: addr.address, lat: addr.lat, lng: addr.lng });
                                setShowCustomLocation(false);
                                toast.success(`Selected ${addr.label}`);
                              }}
                              className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all text-left ${
                                isBlockedAddress
                                  ? 'border-border bg-muted/20 opacity-60 cursor-not-allowed'
                                  :
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
                                {isBlockedAddress &&
                                  (noServiceAreasConfigured ? (
                                    <p className="text-[11px] font-semibold text-destructive mt-1">
                                      Service not available at this area.
                                    </p>
                                  ) : !pin ? (
                                    <p className="text-[11px] font-semibold text-destructive mt-1">
                                      Address must include a valid 6-digit pincode
                                    </p>
                                  ) : (
                                    <p className="text-[11px] font-semibold text-destructive mt-1">
                                      Service not enabled for this pincode
                                    </p>
                                  ))}
                              </div>
                            </button>
                              );
                            })()
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={cn("pt-3 sm:pt-4", user?.addresses?.length > 0 && "border-t border-border/50")}>
                      {(showCustomLocation && user?.addresses && user.addresses.length > 0) ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-muted/30 rounded-xl sm:rounded-2xl border-2 border-border overflow-hidden p-3 sm:p-4"
                        >
                          <LocationPicker 
                            value={pickupLocation} 
                            onChange={setPickupLocation}
                            mapClassName="h-[250px] sm:h-[300px] w-full rounded-lg sm:rounded-xl mt-3 sm:mt-4 border-2 border-border shadow-inner"
                          />
                        </motion.div>
                      ) : (!user?.addresses || user.addresses.length === 0) ? (
                        <div className="text-center py-8 sm:py-10 bg-muted/20 rounded-xl sm:rounded-2xl border-2 border-dashed border-border">
                          <p className="text-sm text-muted-foreground font-medium px-4">
                            No saved addresses found. Add an address in your profile to continue booking.
                          </p>
                        </div>
                      ) : null}

                      {pickupLocation.address && !showCustomLocation && user?.addresses?.length > 0 && (
                        <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-primary/5 rounded-xl sm:rounded-2xl border-2 border-primary/20">
                           <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                             <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                           </div>
                           <div className="min-w-0">
                             <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Selected Location</p>
                             <p className="text-sm font-bold text-foreground leading-relaxed break-words">{pickupLocation.address}</p>
                             {!isSelectedLocationAllowed && (
                               <p className="text-xs text-destructive mt-1 font-semibold">
                                 {noServiceAreasConfigured
                                   ? 'Service not available at this area.'
                                   : !selectedLocationPincode
                                     ? 'This address needs a valid 6-digit pincode for service booking.'
                                     : 'This location pincode is not enabled for service booking. Select another location.'}
                               </p>
                             )}
                           </div>
                        </div>
                      )}

                      {pickupLocation.address && !isSelectedLocationAllowed && (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">
                          <p className="text-xs font-semibold text-destructive">
                            {noServiceAreasConfigured
                              ? 'Service not available at this area.'
                              : !selectedLocationPincode
                                ? 'Add a complete address with a 6-digit pincode, or update it in your profile.'
                                : 'Service booking is not enabled for this pincode. Please choose another location.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

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
                    availableSlots={availableSlots}
                  />
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
                    <div className="flex-1 min-w-0 py-1">
                      <h3 className="text-lg font-bold text-foreground leading-tight tracking-tight">
                        {selectedVehicleData?.make}
                      </h3>
                      <p className="text-base font-medium text-foreground/80 leading-tight">
                        {selectedVehicleData?.model}
                      </p>
                      {selectedVehicleData?.variant && (
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 leading-tight">
                          {selectedVehicleData.variant}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/60">
                        <span>{selectedVehicleData?.year}</span>
                        <span>•</span>
                        <span className="font-mono uppercase tracking-wider">{selectedVehicleData?.licensePlate}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-4 pb-4 border-b border-border">
                    {selectedServicesData.map(service => {
                      const qty = serviceQuantities[service._id] || 1;
                      const size = tireSizes[service._id];
                      const brand = selectedTireBrands[service._id];
                      return (
                        <div key={service._id} className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Wrench className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{service.name}</p>
                            <p className="text-sm text-muted-foreground">{service.duration} mins • Qty: {qty}</p>
                            <div className="flex gap-2">
                              {size && (
                                <p className="text-xs font-bold text-primary mt-1 uppercase tracking-wider">
                                  Size: {size}
                                </p>
                              )}
                              {brand && (
                                <p className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-wider">
                                  Brand: {brand}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-lg font-bold text-primary">
                            ₹{getPackagePrice(service) * qty}
                          </p>
                        </div>
                      );
                    })}

                    {isGeneralService && pickupDropPrice > 0 && (
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">Pickup & Drop Charges</p>
                          <p className="text-sm text-muted-foreground">Service Location Handling</p>
                        </div>
                        <p className="text-lg font-bold text-primary">₹{pickupDropPrice}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2">
                        <span className="font-semibold text-muted-foreground">Subtotal</span>
                        <span className="text-lg font-bold text-primary">₹{checkoutPreview.subtotal}</span>
                    </div>
                    {requiresPrepaidCheckout && !isGeneralService && (
                      <div className="flex justify-between items-center pt-1">
                        <span className="font-semibold text-muted-foreground">Tax (GST 18%)</span>
                        <span className="text-lg font-bold text-primary">₹{checkoutPreview.tax}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                        <span className="font-semibold text-foreground">Total payable</span>
                        <span className="text-xl font-bold text-primary">
                          ₹{requiresPrepaidCheckout ? checkoutPreview.total : totalPrice}
                        </span>
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
                onClick={() => {
                  if (searchParams.get('category') === 'Tyres') {
                    setActiveSubCategory(null);
                    setSelectedServices([]);
                  }
                  setCurrentStep(currentStep - 1);
                }}
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
