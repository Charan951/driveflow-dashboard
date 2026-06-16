import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bookingService, Booking } from '@/services/bookingService';
import { useAuthStore } from '@/store/authStore';
import { useTracking } from '@/hooks/use-tracking';
import { socketService } from '@/services/socket';
import { uploadService } from '@/services/uploadService';
import { MapPin, Navigation, Phone, Car, Wrench, User, Calendar, Clock, AlertTriangle, Upload, CheckCircle, ArrowLeft, MessageCircle } from 'lucide-react';

import * as turf from '@turf/turf';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getETA, ETAResponse } from '@/services/trackingService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CAR_WASH_MIN_PHOTOS = 2;
const CAR_WASH_MAX_PHOTOS = 4;
const INCOMPLETE_CAR_WASH_PHOTOS_MESSAGE = `Please upload at least ${CAR_WASH_MIN_PHOTOS} photos`;
const BATTERY_BEFORE_PHOTOS_REQUIRED = 2;
const BATTERY_AFTER_PHOTOS_REQUIRED = 4;
const BATTERY_BEFORE_PHOTOS_MESSAGE =
  'Please upload Old Part and New Part photos before starting installation';
const BATTERY_AFTER_PHOTOS_MESSAGE = 'Please upload complete 4 after service photos';

const getBatteryBeforePhotoLabel = (index: number) => {
  if (index === 0) return 'Old Part';
  if (index === 1) return 'New Part';
  return `Photo ${index + 1}`;
};

const getBatteryAfterPhotoLabel = (index: number) => `Photo ${index + 1}`;

const getPhotoStatusBadge = (count: number, minRequired: number, maxAllowed: number) => {
  const cappedCount = Math.min(count, maxAllowed);
  const isComplete = count >= minRequired && count <= maxAllowed;
  const isOverLimit = count > maxAllowed;
  if (isOverLimit) {
    return {
      isComplete: false,
      isOverLimit: true,
      text: `${count}/${maxAllowed} photos (max ${maxAllowed})`,
    };
  }
  if (isComplete) {
    return {
      isComplete: true,
      isOverLimit: false,
      text: `${cappedCount}/${maxAllowed} photos captured`,
    };
  }
  return {
    isComplete: false,
    isOverLimit: false,
    text: `${count}/${maxAllowed} photos`,
  };
};


const StaffOrderPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setActiveBookingId, startTracking, stopTracking, isTracking, location: staffLocation } = useTracking();
  const [order, setOrder] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const prePickupInputRef = React.useRef<HTMLInputElement>(null);
  const [eta, setEta] = useState<ETAResponse | null>(null);
  const etaTimerRef = React.useRef<number | null>(null);
  const [isUploadingPrePickup, setIsUploadingPrePickup] = useState(false);

  const handleStatusUpdate = React.useCallback(async (newStatus: string) => {
    if (!order) return;

    // Check if this is a car wash or essentials service
    const isCarWashService = Array.isArray(order.services) && 
      order.services.some(service => 
        typeof service === 'object' && (
          service.category === 'Car Wash' || 
          service.category === 'Wash' ||
          service.category === 'Essentials'
        )
      );

    // Check if this is a battery or tire service
    const isBatteryOrTireService = Array.isArray(order?.services) && 
      order.services.some(service => 
        typeof service === 'object' && (
          service.category === 'Battery' || 
          service.category === 'Tyres' || 
          service.category === 'Tyre & Battery'
        )
      );

    if (newStatus === 'REACHED_CUSTOMER') {
      const targetLat = typeof order.location === 'object' ? order.location?.lat : null;
      const targetLng = typeof order.location === 'object' ? order.location?.lng : null;

      if (!targetLat || !targetLng) {
        toast.error('Customer location is not available');
        return;
      }

      if (!staffLocation?.lat || !staffLocation?.lng) {
        toast.error('Your live location is not available. Turn on tracking to continue.');
        return;
      }

      try {
        const from = turf.point([staffLocation.lng, staffLocation.lat]);
        const to = turf.point([targetLng, targetLat]);
        const distance = turf.distance(from, to, { units: 'meters' });

        if (distance > 100) {
          toast.error('You are too far from customer location (must be within 100 m).');
          return;
        }
      } catch {
        toast.error('Could not verify your current location');
        return;
      }
    }

    if (newStatus === 'STAFF_REACHED_MERCHANT') {
      const targetLat = order.merchant?.location?.lat;
      const targetLng = order.merchant?.location?.lng;

      if (!targetLat || !targetLng) {
        toast.error('Merchant location is not available');
        return;
      }

      if (!staffLocation?.lat || !staffLocation?.lng) {
        toast.error('Your live location is not available. Turn on tracking to continue.');
        return;
      }

      try {
        const from = turf.point([staffLocation.lng, staffLocation.lat]);
        const to = turf.point([targetLng, targetLat]);
        const distance = turf.distance(from, to, { units: 'meters' });

        if (distance > 100) {
          toast.error('You are too far from merchant location (must be within 100 m).');
          return;
        }
      } catch {
        toast.error('Could not verify your current location');
        return;
      }
    }

    if (!isCarWashService) {
      // Regular service location checks
      if (newStatus === 'REACHED_MERCHANT') {
        const targetLat = order.merchant?.location?.lat;
        const targetLng = order.merchant?.location?.lng;

        if (!targetLat || !targetLng) {
          toast.error('Merchant location is not available');
          return;
        }

        if (!staffLocation?.lat || !staffLocation?.lng) {
          toast.error('Your live location is not available. Turn on tracking to continue.');
          return;
        }

        try {
          const from = turf.point([staffLocation.lng, staffLocation.lat]);
          const to = turf.point([targetLng, targetLat]);
          const distance = turf.distance(from, to, { units: 'meters' });

          if (distance > 100) {
            toast.error('You are too far from merchant location (must be within 100 m).');
            return;
          }
        } catch {
          toast.error('Could not verify your current location');
          return;
        }
      }

      if (newStatus === 'DELIVERED') {
        const targetLat = typeof order.location === 'object' ? order.location?.lat : null;
        const targetLng = typeof order.location === 'object' ? order.location?.lng : null;

        if (targetLat && targetLng) {
          if (!staffLocation?.lat || !staffLocation?.lng) {
            toast.error('Your live location is not available. Turn on tracking to complete delivery.');
            return;
          }
          try {
            const from = turf.point([staffLocation.lng, staffLocation.lat]);
            const to = turf.point([targetLng, targetLat]);
            const distance = turf.distance(from, to, { units: 'meters' });

            if (distance > 100) {
              toast.error('You are too far from customer location (must be within 100 m) to complete delivery.');
              return;
            }
          } catch {
            toast.error('Could not verify your current location');
            return;
          }
        }
      }

      if (newStatus === 'OUT_FOR_DELIVERY') {
        if (order.paymentStatus !== 'paid') {
          toast.error('Customer has not paid the service amount yet. Please wait for payment before picking up the vehicle for delivery.');
          return;
        }
      }
    }

    try {
      setIsUpdating(true);
      let latestBooking: Booking | undefined;

      const isCarWashNow = Array.isArray(order?.services) && 
        order.services.some(service => 
          typeof service === 'object' && (
            service.category === 'Car Wash' || 
            service.category === 'Wash' ||
            service.category === 'Essentials'
          )
        );

      // Check if this is a battery or tire service
      const isBatteryOrTireNow = Array.isArray(order?.services) && 
        order.services.some(service => {
          if (typeof service !== 'object' || !service.category) return false;
          const cat = service.category.toLowerCase();
          return cat.includes('battery') || cat.includes('tire') || cat.includes('tyre');
        });

      const isBatteryNow = Array.isArray(order?.services) && 
        order.services.some(service => {
          if (typeof service !== 'object' || !service.category) return false;
          const cat = service.category.toLowerCase();
          return cat.includes('battery');
        });
      
      if (isCarWashNow) {
        // Handle car wash specific status updates
        const isEssentialsNow = Array.isArray(order?.services) && 
          order.services.some(service => 
            typeof service === 'object' && service.category?.toLowerCase().includes('essentials')
          );
        if (newStatus === 'CAR_WASH_STARTED') {
          // For car wash start, check for before photos
          const beforePhotos = Array.isArray(order.carWash?.beforeWashPhotos) ? order.carWash.beforeWashPhotos : [];
          const requiredBeforeCount = isEssentialsNow ? 4 : CAR_WASH_MIN_PHOTOS;
          if (beforePhotos.length < requiredBeforeCount) {
            toast.error(isEssentialsNow ? 'Please upload at least 4 before service photos before starting service' : INCOMPLETE_CAR_WASH_PHOTOS_MESSAGE);
            setIsUpdating(false);
            return;
          }
          latestBooking = await bookingService.updateBookingStatus(order._id, newStatus);
        } else if (newStatus === 'CAR_WASH_COMPLETED') {
          // For car wash completion, check for after photos
          const afterPhotos = Array.isArray(order.carWash?.afterWashPhotos) ? order.carWash.afterWashPhotos : [];
          const requiredAfterCount = isEssentialsNow ? 4 : CAR_WASH_MIN_PHOTOS;
          if (afterPhotos.length < requiredAfterCount) {
            toast.error(isEssentialsNow ? 'Please upload at least 4 after service photos before completing service' : INCOMPLETE_CAR_WASH_PHOTOS_MESSAGE);
            setIsUpdating(false);
            return;
          }
          // For car wash completion, just update status (no OTP generation yet)
          try {
            latestBooking = await bookingService.updateBookingStatus(order._id, newStatus);
          } catch (error) {
            console.error('Car wash completion error:', error);
            toast.error('Failed to complete car wash');
            setIsUpdating(false);
            return;
          }
        } else if (newStatus === 'DELIVERED') {
          // For car wash services, generate OTP first (only if not already generated), then ask for verification
          try {
            // Check if OTP already exists
            if (!order.deliveryOtp?.code) {
              await bookingService.generateDeliveryOtp(order._id);
              
              // Refresh order to get the OTP
              const refreshedOrder = await bookingService.getBookingById(order._id);
              latestBooking = refreshedOrder;
              setOrder(refreshedOrder);
            }
            
            // Ask for customer's OTP (no alert needed)
            const otp = window.prompt('Enter the 4-digit delivery OTP from customer');
            if (!otp) {
              setIsUpdating(false);
              return;
            }
            
            // Verify OTP (backend will automatically update status to DELIVERED)
            const cwVerify = (await bookingService.verifyDeliveryOtp(order._id, otp)) as { booking?: Booking };
            latestBooking = cwVerify.booking ?? latestBooking;
          } catch (error) {
            console.error('Car wash delivery completion error:', error);
            toast.error('Failed to complete delivery');
            setIsUpdating(false);
            return;
          }
        } else {
          latestBooking = await bookingService.updateBookingStatus(order._id, newStatus);
        }
      } else if (isBatteryOrTireNow) {
        // Handle battery/tire specific status updates
        if (newStatus === 'PICKUP_BATTERY_TIRE') {
          latestBooking = await bookingService.updateBookingStatus(order._id, newStatus);
        } else if (newStatus === 'INSTALLATION') {
          const photos = Array.isArray(order.prePickupPhotos) ? order.prePickupPhotos : [];
          if (photos.length < BATTERY_BEFORE_PHOTOS_REQUIRED) {
            toast.error(BATTERY_BEFORE_PHOTOS_MESSAGE);
            setIsUpdating(false);
            return;
          }
          latestBooking = await bookingService.updateBookingStatus(order._id, newStatus);
        } else if (newStatus === 'DELIVERY') {
          if (!isBatteryNow) {
            const afterPhotos = Array.isArray(order.serviceExecution?.afterPhotos)
              ? order.serviceExecution.afterPhotos
              : [];
            if (afterPhotos.length < BATTERY_AFTER_PHOTOS_REQUIRED) {
              toast.error(BATTERY_AFTER_PHOTOS_MESSAGE);
              setIsUpdating(false);
              return;
            }
          }
          // For battery/tire delivery, generate OTP first
          try {
            // Check if OTP already exists
            if (!order.deliveryOtp?.code) {
              await bookingService.generateDeliveryOtp(order._id);
            }
            
            // Update status to DELIVERY (this will generate OTP in backend)
            latestBooking = await bookingService.updateBookingStatus(order._id, newStatus);
          } catch (error) {
            console.error('Battery/tire delivery error:', error);
            toast.error('Failed to start delivery');
            setIsUpdating(false);
            return;
          }
        } else if (newStatus === 'COMPLETED') {
          // For battery/tire completion, verify OTP
          const otp = window.prompt('Enter the 4-digit delivery OTP from customer');
          if (!otp) {
            setIsUpdating(false);
            return;
          }
          const btVerify = (await bookingService.verifyDeliveryOtp(order._id, otp)) as { booking?: Booking };
          latestBooking = btVerify.booking ?? latestBooking;
        } else {
          latestBooking = await bookingService.updateBookingStatus(order._id, newStatus);
        }
      } else {
        // Handle regular service status updates
        if (newStatus === 'VEHICLE_PICKED') {
          const photos = Array.isArray(order.prePickupPhotos) ? order.prePickupPhotos : [];
          if (photos.length < 4) {
            toast.error('Please upload 4 vehicle photos before picking up the vehicle');
            setIsUpdating(false);
            return;
          }
          latestBooking = await bookingService.updateBookingStatus(order._id, newStatus);
        } else if (newStatus === 'DELIVERED') {
          const otp = window.prompt('Enter the 4-digit delivery OTP from customer');
          if (!otp) {
            setIsUpdating(false);
            return;
          }
          const regVerify = (await bookingService.verifyDeliveryOtp(order._id, otp)) as { booking?: Booking };
          latestBooking = regVerify.booking ?? latestBooking;
        } else {
          latestBooking = await bookingService.updateBookingStatus(order._id, newStatus);
        }
      }

      const updated = latestBooking ?? (await bookingService.getBookingById(order._id));
      setOrder(updated);
      toast.success(`Order updated to ${newStatus.replace('_', ' ')}`);

      // Navigation logic
      if (!isCarWashNow) {
        if (newStatus === 'VEHICLE_PICKED' && order.merchant?.location) {
          const { lat, lng, address } = order.merchant.location;
          let url = '';
          
          if (lat && lng) {
            url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
          } else if (address) {
            url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
          }
          
          if (url) {
            if (staffLocation?.lat && staffLocation?.lng) {
              url += `&origin=${staffLocation.lat},${staffLocation.lng}`;
            }
            window.open(url, '_blank');
          } else {
            toast.warning("Merchant location coordinates missing, cannot start navigation automatically.");
          }
        }
        
        // Navigation to customer for regular and battery/tire delivery
        if (newStatus === 'OUT_FOR_DELIVERY' || newStatus === 'PICKUP_BATTERY_TIRE') {
          if (newStatus === 'OUT_FOR_DELIVERY') {
            toast.info('Delivery OTP sent to customer');
          } else if (newStatus === 'PICKUP_BATTERY_TIRE') {
            toast.info('Item picked up. Navigating to customer location.');
          }

          if (order.location) {
            const loc =
              typeof order.location === 'object'
                ? order.location
                : { address: order.location as unknown as string };
            const { lat, lng, address } = loc as {
              lat?: number;
              lng?: number;
              address?: string;
            };
            let url = '';
            if (lat && lng) {
              url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            } else if (address) {
              url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                address,
              )}`;
            }
            if (url) {
              if (staffLocation?.lat && staffLocation?.lng) {
                url += `&origin=${staffLocation.lat},${staffLocation.lng}`;
              }
              window.open(url, '_blank');
            } else {
              toast.warning("Customer location coordinates missing, cannot start navigation automatically.");
            }
          }
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || `Failed to update status to ${newStatus}`);
    } finally {
      setIsUpdating(false);
    }
  }, [order, staffLocation, setActiveBookingId]);

  useEffect(() => {
    // Set active booking ID for tracking context
    if (id) {
      setActiveBookingId(id);
      startTracking();
    }

    return () => {
      stopTracking();
      setActiveBookingId(null);
    };
  }, [id, setActiveBookingId, startTracking, stopTracking]);

  const fetchOrder = React.useCallback(async () => {
    if (!id) return;
    try {
      const data = await bookingService.getBookingById(id);
      setOrder(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (id) {
        socketService.connect();
        socketService.joinRoom(`booking_${id}`);

        socketService.on('bookingUpdated', (updatedBooking: Booking) => {
            if (updatedBooking._id === id) {
                // Only update if we're not currently uploading photos
                if (!isUploadingPrePickup) {
                    setOrder(updatedBooking);
                }
            }
        });

        return () => {
            socketService.leaveRoom(`booking_${id}`);
            socketService.off('bookingUpdated');
        }
    }
  }, [id]);

  useEffect(() => {
    if (order?.status === 'REACHED_MERCHANT') {
      toast.info('Vehicle has reached merchant. Redirecting to dashboard.');
      navigate('/dashboard', { replace: true });
    } else if (order?.status === 'DELIVERED' || order?.status === 'COMPLETED') {
      toast.success('Order delivered successfully. Returning to dashboard.');
      navigate('/dashboard', { replace: true });
    }
  }, [order?.status, navigate]);

  // Auto-status update when reaching customer or merchant location
  useEffect(() => {
    if (!staffLocation || !order || isUpdating) return;

    // 1. Reaching Customer (Status: ASSIGNED or ACCEPTED or PICKUP_BATTERY_TIRE)
    if ((order.status === 'ASSIGNED' || order.status === 'ACCEPTED' || order.status === 'PICKUP_BATTERY_TIRE') && order.location) {
        // Only for non-battery/tire services (regular flow)
        const isBatteryOrTireService = Array.isArray(order?.services) && 
          order.services.some(service => 
            typeof service === 'object' && (
              service.category === 'Battery' || 
              service.category === 'Tyres' || 
              service.category === 'Tyre & Battery'
            )
          );

        const isBtPickupDone = isBatteryOrTireService && order.status === 'PICKUP_BATTERY_TIRE';
        const isRegularAssigned = !isBatteryOrTireService && (order.status === 'ASSIGNED' || order.status === 'ACCEPTED');

        if (isBtPickupDone || isRegularAssigned) {
          const targetLat = typeof order.location === 'object' ? order.location.lat : null;
          const targetLng = typeof order.location === 'object' ? order.location.lng : null;

          if (targetLat && targetLng && staffLocation.lat && staffLocation.lng) {
               const from = turf.point([staffLocation.lng, staffLocation.lat]);
               const to = turf.point([targetLng, targetLat]);
               const distance = turf.distance(from, to, { units: 'meters' });
               
               if (distance < 100) {
                   toast.info("You have arrived at the customer location.");
                   handleStatusUpdate('REACHED_CUSTOMER');
               }
          }
        }
    }

    // 2. Reaching Merchant (Status: VEHICLE_PICKED or Battery/Tire ASSIGNED)
    if (order.merchant?.location) {
        const isBatteryOrTireService = Array.isArray(order?.services) && 
          order.services.some(service => 
            typeof service === 'object' && (
              service.category === 'Battery' || 
              service.category === 'Tyres' || 
              service.category === 'Tyre & Battery'
            )
          );

        const isHeadingToMerchant = (order.status === 'VEHICLE_PICKED') || 
                                   (isBatteryOrTireService && order.status === 'ASSIGNED');

        if (isHeadingToMerchant) {
          const targetLat = order.merchant.location.lat;
          const targetLng = order.merchant.location.lng;

          if (targetLat && targetLng && staffLocation.lat && staffLocation.lng) {
               const from = turf.point([staffLocation.lng, staffLocation.lat]);
               const to = turf.point([targetLng, targetLat]);
               const distance = turf.distance(from, to, { units: 'meters' });
               
               if (distance < 100) {
                   toast.info("You have arrived at the merchant location.");
                   if (isBatteryOrTireService && order.status === 'ASSIGNED') {
                       handleStatusUpdate('STAFF_REACHED_MERCHANT');
                   } else {
                       handleStatusUpdate('REACHED_MERCHANT');
                   }
               }
          }
        }
    }
  }, [order, staffLocation, isUpdating, handleStatusUpdate]);

  // Compute ETA for current leg (to customer during pickup; to merchant after pick; to customer during delivery)
  useEffect(() => {
    if (!order || !staffLocation) {
      setEta(null);
      return;
    }
    
    const isCarWashService = Array.isArray(order.services) && 
      order.services.some(service => 
        typeof service === 'object' && (
          service.category === 'Car Wash' || 
          service.category === 'Wash' ||
          service.category === 'Essentials'
        )
      );
    
    const isHeadingToMerchant = !isCarWashService && (
      order.status === 'VEHICLE_PICKED' || order.status === 'SERVICE_COMPLETED'
    );
    
    let destLat: number | undefined;
    let destLng: number | undefined;
    if (
      order.status === 'ASSIGNED' ||
      order.status === 'ACCEPTED' ||
      order.status === 'REACHED_CUSTOMER' ||
      order.status === 'OUT_FOR_DELIVERY' ||
      order.status === 'CAR_WASH_STARTED' ||
      order.status === 'CAR_WASH_COMPLETED'
    ) {
      destLat = order.location?.lat;
      destLng = order.location?.lng;
    } else if (isHeadingToMerchant && order.merchant?.location) {
      destLat = order.merchant.location.lat;
      destLng = order.merchant.location.lng;
    }
    if (!destLat || !destLng) {
      setEta(null);
      return;
    }
    if (etaTimerRef.current) {
      window.clearTimeout(etaTimerRef.current);
    }
    etaTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await getETA(staffLocation.lat, staffLocation.lng, destLat!, destLng!);
        setEta(res);
      } catch (e) {
        setEta(null);
      }
    }, 400);
    return () => {
      if (etaTimerRef.current) {
        window.clearTimeout(etaTimerRef.current);
        etaTimerRef.current = null;
      }
    };
  }, [order, staffLocation]);

  const handleNavigate = () => {
    const isHeadingToMerchant = !isCarWash && (
      order?.status === 'VEHICLE_PICKED' || 
      order?.status === 'SERVICE_COMPLETED' ||
      (isBatteryOrTire && (order?.status === 'ASSIGNED' || order?.status === 'STAFF_REACHED_MERCHANT'))
    );
    
    const targetLocation = isHeadingToMerchant ? order?.merchant?.location : order?.location;
    const targetName = isHeadingToMerchant ? 'Merchant' : 'Customer';

    if (!targetLocation) {
      toast.error(`No location available for ${targetName}`);
      return;
    }

    let lat, lng, address;
    
    // Handle structured location
    if (typeof targetLocation === 'object' && targetLocation.lat && targetLocation.lng) {
      lat = targetLocation.lat;
      lng = targetLocation.lng;
    } else {
      // Fallback for string address
      address = typeof targetLocation === 'string' ? targetLocation : targetLocation.address;
    }

    let url = '';
    if (lat && lng) {
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else if (address) {
        url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    }
    
    if (url) {
        // Add origin if available (Staff Location)
        if (staffLocation?.lat && staffLocation?.lng) {
            url += `&origin=${staffLocation.lat},${staffLocation.lng}`;
        }
        
        window.open(url, '_blank');
        
        // Auto-start tracking when navigation starts
        if (!isTracking) {
            startTracking();
        }
    } else {
        toast.error("Could not determine destination coordinates or address");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && order) {
      try {
        const files = Array.from(e.target.files);
        const loadingToast = toast.loading(`Uploading ${files.length} photo(s)...`);
        
        const uploadRes = await uploadService.uploadFiles(files);
        const newUrls = (uploadRes.files || []).map((f: { url: string }) => f.url);
        
        const currentMedia = order.media || [];
        const newMedia = [...currentMedia, ...newUrls];
        
        await bookingService.updateBookingDetails(order._id, { media: newMedia });
        setOrder({ ...order, media: newMedia });
        
        toast.dismiss(loadingToast);
        toast.success(`${newUrls.length} photo(s) uploaded successfully`);
      } catch (error) {
        console.error(error);
        toast.error('Failed to upload photo(s)');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handlePrePickupUploadClick = () => {
    prePickupInputRef.current?.click();
  };

  const handlePrePickupFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!order) return;
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    
    // Check if this is a car wash or essentials service
    const isCarWashService = Array.isArray(order.services) && 
      order.services.some(service => 
        typeof service === 'object' && (
          service.category === 'Car Wash' || 
          service.category === 'Wash' ||
          service.category === 'Essentials'
        )
      );
    const isBatteryTireService = Array.isArray(order.services) &&
      order.services.some(service =>
        typeof service === 'object' && service.category && (
          service.category.toLowerCase().includes('battery') ||
          service.category.toLowerCase().includes('tire') ||
          service.category.toLowerCase().includes('tyre')
        )
      );
    
    try {
      setIsUploadingPrePickup(true);
      const loadingToast = toast.loading(`Uploading ${files.length} photos...`);
      let uploadedCarWashPhotoCount: number | null = null;

      if (isCarWashService) {
        // Handle car wash photo uploads based on status
        if (order.status === 'REACHED_CUSTOMER') {
          const existingPhotos = Array.isArray(order.carWash?.beforeWashPhotos)
            ? order.carWash.beforeWashPhotos
            : [];
          const remaining = CAR_WASH_MAX_PHOTOS - existingPhotos.length;
          if (remaining <= 0) {
            toast.dismiss(loadingToast);
            toast.error(`You already uploaded ${CAR_WASH_MAX_PHOTOS} before wash photos`);
            return;
          }
          const filesToUpload = files.slice(0, remaining);
          if (files.length > remaining) {
            toast.warning(`Only ${remaining} more before wash photo(s) can be added`);
          }

          const res = await uploadService.uploadFiles(filesToUpload);
          const newUrls = (res.files || []).map((f: { url: string }) => f.url);

          const { carWashService } = await import('@/services/carWashService');
          const result = await carWashService.uploadBeforePhotos(order._id, newUrls);

          if (result.booking) {
            setOrder(result.booking);
            uploadedCarWashPhotoCount = result.booking.carWash?.beforeWashPhotos?.length ?? 0;
          } else {
            const merged = [...existingPhotos, ...newUrls].slice(0, CAR_WASH_MAX_PHOTOS);
            setOrder({
              ...order,
              carWash: {
                ...order.carWash,
                beforeWashPhotos: merged,
              },
            });
            uploadedCarWashPhotoCount = merged.length;
          }
        } else if (order.status === 'CAR_WASH_STARTED') {
          const existingPhotos = Array.isArray(order.carWash?.afterWashPhotos)
            ? order.carWash.afterWashPhotos
            : [];
          const remaining = CAR_WASH_MAX_PHOTOS - existingPhotos.length;
          if (remaining <= 0) {
            toast.dismiss(loadingToast);
            toast.error(`You already uploaded ${CAR_WASH_MAX_PHOTOS} after wash photos`);
            return;
          }
          const filesToUpload = files.slice(0, remaining);
          if (files.length > remaining) {
            toast.warning(`Only ${remaining} more after wash photo(s) can be added`);
          }

          const res = await uploadService.uploadFiles(filesToUpload);
          const newUrls = (res.files || []).map((f: { url: string }) => f.url);

          const { carWashService } = await import('@/services/carWashService');
          const result = await carWashService.uploadAfterPhotos(order._id, newUrls);

          if (result.booking) {
            setOrder(result.booking);
            uploadedCarWashPhotoCount = result.booking.carWash?.afterWashPhotos?.length ?? 0;
          } else {
            const merged = [...existingPhotos, ...newUrls].slice(0, CAR_WASH_MAX_PHOTOS);
            setOrder({
              ...order,
              carWash: {
                ...order.carWash,
                afterWashPhotos: merged,
              },
            });
            uploadedCarWashPhotoCount = merged.length;
          }
        }
      } else if (isBatteryTireService) {
        if (order.status === 'REACHED_CUSTOMER') {
          const existingPhotos = Array.isArray(order.prePickupPhotos) ? order.prePickupPhotos : [];
          const remaining = BATTERY_BEFORE_PHOTOS_REQUIRED - existingPhotos.length;
          if (remaining <= 0) {
            toast.dismiss(loadingToast);
            toast.error('You already uploaded before installation photos');
            return;
          }
          const filesToUpload = files.slice(0, remaining);
          if (files.length > remaining) {
            toast.warning(`Only ${remaining} more before installation photo(s) can be added`);
          }

          const uploadRes = await uploadService.uploadFiles(filesToUpload);
          const uploadedUrls = (uploadRes.files || []).map((f: { url: string }) => f.url);
          const updatedPhotos = [...existingPhotos, ...uploadedUrls].slice(
            0,
            BATTERY_BEFORE_PHOTOS_REQUIRED,
          );
          await bookingService.updateBookingDetails(order._id, { prePickupPhotos: updatedPhotos });
          setOrder({ ...order, prePickupPhotos: updatedPhotos });
          if (updatedPhotos.length < BATTERY_BEFORE_PHOTOS_REQUIRED) {
            toast.warning(
              `${BATTERY_BEFORE_PHOTOS_MESSAGE} (${updatedPhotos.length}/${BATTERY_BEFORE_PHOTOS_REQUIRED})`,
            );
          }
        } else if (order.status === 'INSTALLATION') {
          const existingPhotos = Array.isArray(order.serviceExecution?.afterPhotos)
            ? order.serviceExecution.afterPhotos
            : [];
          const remaining = BATTERY_AFTER_PHOTOS_REQUIRED - existingPhotos.length;
          if (remaining <= 0) {
            toast.dismiss(loadingToast);
            toast.error('You already uploaded after service photos');
            return;
          }
          const filesToUpload = files.slice(0, remaining);
          if (files.length > remaining) {
            toast.warning(`Only ${remaining} more after service photo(s) can be added`);
          }

          const uploadRes = await uploadService.uploadFiles(filesToUpload);
          const uploadedUrls = (uploadRes.files || []).map((f: { url: string }) => f.url);
          const updatedPhotos = [...existingPhotos, ...uploadedUrls].slice(
            0,
            BATTERY_AFTER_PHOTOS_REQUIRED,
          );
          await bookingService.updateBookingDetails(order._id, {
            serviceExecution: {
              ...order.serviceExecution,
              afterPhotos: updatedPhotos,
            },
          });
          setOrder({
            ...order,
            serviceExecution: {
              ...order.serviceExecution,
              afterPhotos: updatedPhotos,
            },
          });
          if (updatedPhotos.length < BATTERY_AFTER_PHOTOS_REQUIRED) {
            toast.warning(
              `${BATTERY_AFTER_PHOTOS_MESSAGE} (${updatedPhotos.length}/${BATTERY_AFTER_PHOTOS_REQUIRED})`,
            );
          }
        } else {
          toast.dismiss(loadingToast);
          toast.error('Photos cannot be uploaded at this stage');
          return;
        }
      } else {
        const res = await uploadService.uploadFiles(files);
        const newUrls = (res.files || []).map((f: { url: string }) => f.url);

        // Regular service pre-pickup photos
        const currentPhotos = Array.isArray(order.prePickupPhotos) ? order.prePickupPhotos : [];
        const updatedPhotos = [...currentPhotos, ...newUrls].slice(0, 4);

        await bookingService.updateBookingDetails(order._id, { prePickupPhotos: updatedPhotos });
        setOrder({ ...order, prePickupPhotos: updatedPhotos });
      }
      
      toast.dismiss(loadingToast);
      toast.success(`${files.length} photo(s) uploaded successfully`);

      if (
        uploadedCarWashPhotoCount !== null &&
        uploadedCarWashPhotoCount < CAR_WASH_MIN_PHOTOS
      ) {
        toast.warning(
          `${INCOMPLETE_CAR_WASH_PHOTOS_MESSAGE} (${uploadedCarWashPhotoCount}/${CAR_WASH_MIN_PHOTOS})`,
        );
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error(`Failed to upload photos: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploadingPrePickup(false);
      if (prePickupInputRef.current) prePickupInputRef.current.value = '';
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!order) return <div className="p-6 text-center">Order not found</div>;

  const vehicle =
    typeof order.vehicle === 'object' && order.vehicle !== null
      ? order.vehicle
      : { make: 'Unknown', model: 'Vehicle', licensePlate: '' };

  const userDetails =
    typeof order.user === 'object' && order.user !== null
      ? order.user
      : { name: 'Guest User', phone: '' };

  const services = Array.isArray(order.services) ? order.services : [];

  // Service type flags (Consolidated)
  const isEssentials = Array.isArray(order?.services) && 
    order.services.some(service => {
      if (typeof service !== 'object' || !service.category) return false;
      const cat = service.category.toLowerCase();
      return cat.includes('essentials');
    });

  const isCarWash = Array.isArray(order?.services) && 
    order.services.some(service => {
      if (typeof service !== 'object' || !service.category) return false;
      const cat = service.category.toLowerCase();
      return cat.includes('car wash') || cat.includes('wash') || cat.includes('essentials');
    });

  const isBatteryOrTire = Array.isArray(order?.services) && 
    order.services.some(service => {
      if (typeof service !== 'object' || !service.category) return false;
      const cat = service.category.toLowerCase();
      return cat.includes('battery') || cat.includes('tire') || cat.includes('tyre');
    });

  const isBattery = Array.isArray(order?.services) && 
    order.services.some(service => {
      if (typeof service !== 'object' || !service.category) return false;
      const cat = service.category.toLowerCase();
      return cat.includes('battery');
    });

  const getNextStatusAction = (currentStatus: string) => {
    if (isCarWash) {
      // Car wash specific workflow - no acceptance needed
      switch (currentStatus) {
        case 'ASSIGNED': return { label: 'Reached Customer', nextStatus: 'REACHED_CUSTOMER', color: 'bg-blue-600 hover:bg-blue-700' };
        case 'REACHED_CUSTOMER': return { label: isEssentials ? 'Start Service' : 'Start Car Wash', nextStatus: 'CAR_WASH_STARTED', color: 'bg-blue-600 hover:bg-blue-700' };
        case 'CAR_WASH_STARTED': return { label: isEssentials ? 'Complete Service' : 'Complete Car Wash', nextStatus: 'CAR_WASH_COMPLETED', color: 'bg-green-600 hover:bg-green-700' };
        case 'CAR_WASH_COMPLETED': return { label: 'Complete Delivery', nextStatus: 'DELIVERED', color: 'bg-green-600 hover:bg-green-700' };
        default: return null;
      }
    } else if (isBatteryOrTire) {
      // Battery/Tire specific workflow
      switch (currentStatus) {
        case 'ASSIGNED': return { label: 'Reached Merchant', nextStatus: 'STAFF_REACHED_MERCHANT', color: 'bg-blue-600 hover:bg-blue-700' };
        case 'STAFF_REACHED_MERCHANT': return { label: 'Pickup Battery/Tire', nextStatus: 'PICKUP_BATTERY_TIRE', color: 'bg-purple-600 hover:bg-purple-700' };
        case 'PICKUP_BATTERY_TIRE': return { label: 'Reached Customer', nextStatus: 'REACHED_CUSTOMER', color: 'bg-orange-600 hover:bg-orange-700' };
        case 'REACHED_CUSTOMER': return { label: 'Start Installation', nextStatus: 'INSTALLATION', color: 'bg-indigo-600 hover:bg-indigo-700' };
        case 'INSTALLATION': return { label: 'Complete & Deliver', nextStatus: 'DELIVERY', color: 'bg-teal-600 hover:bg-teal-700' };
        case 'DELIVERY': return { label: 'Verify OTP & Complete', nextStatus: 'COMPLETED', color: 'bg-green-600 hover:bg-green-700' };
        default: return null;
      }
    } else {
      // Regular service workflow - auto-accepted when assigned
      switch (currentStatus) {
        case 'ASSIGNED': return { label: 'Reached Customer', nextStatus: 'REACHED_CUSTOMER', color: 'bg-blue-600 hover:bg-blue-700' };
        case 'ACCEPTED': return { label: 'Reached Customer', nextStatus: 'REACHED_CUSTOMER', color: 'bg-blue-600 hover:bg-blue-700' };
        case 'REACHED_CUSTOMER': return { label: 'Pickup Vehicle from Customer', nextStatus: 'VEHICLE_PICKED', color: 'bg-blue-600 hover:bg-blue-700' };
        case 'VEHICLE_PICKED': return { label: 'Reached Service Center', nextStatus: 'REACHED_MERCHANT', color: 'bg-purple-600 hover:bg-purple-700' };
        case 'SERVICE_COMPLETED': return { label: 'Pickup Vehicle from Workshop', nextStatus: 'OUT_FOR_DELIVERY', color: 'bg-orange-600 hover:bg-orange-700' };
        case 'OUT_FOR_DELIVERY': return { label: 'Complete Delivery', nextStatus: 'DELIVERED', color: 'bg-green-600 hover:bg-green-700' };
        default: return null;
      }
    }
  };

  const nextAction = getNextStatusAction(order.status);
  const isWaitingForPayment = order.status === 'SERVICE_COMPLETED' && order.paymentStatus !== 'paid';
  
  const isAssignedStaff = user?._id === (typeof order.pickupDriver === 'object' ? order.pickupDriver?._id : order.pickupDriver) ||
                          user?._id === (typeof order.technician === 'object' ? order.technician?._id : order.technician) ||
                          user?._id === (typeof order.carWash?.staffAssigned === 'object' ? order.carWash?.staffAssigned?._id : order.carWash?.staffAssigned);

  const beforeWashPhotos = Array.isArray(order?.carWash?.beforeWashPhotos) ? order.carWash.beforeWashPhotos : [];
  const afterWashPhotos = Array.isArray(order?.carWash?.afterWashPhotos) ? order.carWash.afterWashPhotos : [];
  const requiredBefore = isEssentials ? 4 : CAR_WASH_MIN_PHOTOS;
  const requiredAfter = isEssentials ? 4 : CAR_WASH_MIN_PHOTOS;

  const shouldDisablePrimaryAction =
    isUpdating ||
    isWaitingForPayment ||
    !isAssignedStaff ||
    (nextAction?.nextStatus === 'VEHICLE_PICKED' &&
      (!Array.isArray(order.prePickupPhotos) || order.prePickupPhotos.length < 4)) ||
    (nextAction?.nextStatus === 'CAR_WASH_STARTED' && beforeWashPhotos.length < requiredBefore) ||
    (nextAction?.nextStatus === 'CAR_WASH_COMPLETED' && afterWashPhotos.length < requiredAfter);

  // Determine display location and labels
  const isHeadingToMerchant = !isCarWash && (
      order.status === 'VEHICLE_PICKED' || 
      (isBatteryOrTire && (order.status === 'ASSIGNED' || order.status === 'STAFF_REACHED_MERCHANT'))
    );
  
  const isPrePickupPhase = order.status === 'REACHED_CUSTOMER' || order.status === 'INSTALLATION' || (isBatteryOrTire && order.status === 'STAFF_REACHED_MERCHANT');
  
  // For battery/tire, target is ALWAYS merchant when status is ASSIGNED or STAFF_REACHED_MERCHANT
  const targetLocation = isHeadingToMerchant 
    ? order.merchant?.location 
    : order.location;

  const locationLabel = isHeadingToMerchant
    ? 'Merchant/Workshop Location' 
    : 'Customer Location';

  const navigateButtonText = isHeadingToMerchant
    ? 'Navigate to Merchant' 
    : 'Navigate to Customer';

  const addressDisplay = typeof targetLocation === 'string' ? targetLocation : targetLocation?.address || 'No address provided';

  return (
    <div className="container-mobile space-y-6 max-w-2xl mx-auto pb-24 no-horizontal-scroll">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Order Details</h1>
            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
              order.status === 'DELIVERED' || order.status === 'SERVICE_COMPLETED' || order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {order.status.replace('_AT_MERCHANT', '')}
            </span>
          </div>

        </div>
        <span className="inline-flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-1 text-xs font-medium border border-border flex-shrink-0">
          {isCarWash ? (
            (() => {
              const beforePhotos = Array.isArray(order.carWash?.beforeWashPhotos) ? order.carWash.beforeWashPhotos : [];
              const afterPhotos = Array.isArray(order.carWash?.afterWashPhotos) ? order.carWash.afterWashPhotos : [];
              const requiredBefore = isEssentials ? 4 : CAR_WASH_MIN_PHOTOS;
              const requiredAfter = isEssentials ? 4 : CAR_WASH_MIN_PHOTOS;
              
              if (order.status === 'CAR_WASH_STARTED') {
                const count = afterPhotos.length;
                if (count >= requiredAfter) {
                  return (
                    <>
                      <CheckCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-green-600" />
                      <span className="text-green-700">After photos ready ({count}/4)</span>
                    </>
                  );
                }
                return (
                  <>
                    <AlertTriangle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-500" />
                    <span className="text-amber-600">After photos ({count}/4)</span>
                  </>
                );
              } else if (['CAR_WASH_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(order.status)) {
                const count = beforePhotos.length + afterPhotos.length;
                return (
                  <>
                    <CheckCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-green-600" />
                    <span className="text-green-700">Photos complete ({count}/8)</span>
                  </>
                );
              } else {
                const count = beforePhotos.length;
                if (count >= requiredBefore) {
                  return (
                    <>
                      <CheckCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-green-600" />
                      <span className="text-green-700">Before photos ready ({count}/4)</span>
                    </>
                  );
                }
                return (
                  <>
                    <AlertTriangle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-500" />
                    <span className="text-amber-600">Before photos ({count}/4)</span>
                  </>
                );
              }
            })()
          ) : isBatteryOrTire ? (
            (() => {
              const beforePhotos = Array.isArray(order.prePickupPhotos) ? order.prePickupPhotos : [];
              const afterPhotos = Array.isArray(order.serviceExecution?.afterPhotos) ? order.serviceExecution.afterPhotos : [];
              
              if (isBattery && order.status === 'INSTALLATION') {
                return (
                  <>
                    <CheckCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-green-600" />
                    <span className="text-green-700">Photos complete ({beforePhotos.length}/{BATTERY_BEFORE_PHOTOS_REQUIRED})</span>
                  </>
                );
              } else if (isBattery && ['DELIVERY', 'COMPLETED'].includes(order.status)) {
                return (
                  <>
                    <CheckCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-green-600" />
                    <span className="text-green-700">Photos complete ({beforePhotos.length}/{BATTERY_BEFORE_PHOTOS_REQUIRED})</span>
                  </>
                );
              } else if (order.status === 'INSTALLATION') {
                const count = afterPhotos.length;
                if (count >= BATTERY_AFTER_PHOTOS_REQUIRED) {
                  return (
                    <>
                      <CheckCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-green-600" />
                      <span className="text-green-700">After photos ready ({count}/{BATTERY_AFTER_PHOTOS_REQUIRED})</span>
                    </>
                  );
                }
                return (
                  <>
                    <AlertTriangle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-500" />
                    <span className="text-amber-600">After photos ({count}/{BATTERY_AFTER_PHOTOS_REQUIRED})</span>
                  </>
                );
              } else if (['DELIVERY', 'COMPLETED'].includes(order.status)) {
                const count = beforePhotos.length + afterPhotos.length;
                return (
                  <>
                    <CheckCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-green-600" />
                    <span className="text-green-700">Photos complete ({count}/{BATTERY_BEFORE_PHOTOS_REQUIRED + BATTERY_AFTER_PHOTOS_REQUIRED})</span>
                  </>
                );
              } else {
                const count = beforePhotos.length;
                if (count >= BATTERY_BEFORE_PHOTOS_REQUIRED) {
                  return (
                    <>
                      <CheckCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-green-600" />
                      <span className="text-green-700">Before photos ready ({count}/{BATTERY_BEFORE_PHOTOS_REQUIRED})</span>
                    </>
                  );
                }
                return (
                  <>
                    <AlertTriangle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-500" />
                    <span className="text-amber-600">Before photos ({count}/{BATTERY_BEFORE_PHOTOS_REQUIRED})</span>
                  </>
                );
              }
            })()
          ) : (
            Array.isArray(order.prePickupPhotos) && order.prePickupPhotos.length >= 4 ? (
              <>
                <CheckCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-green-600" />
                <span className="text-green-700 hidden sm:inline">Pickup photos ready</span>
                <span className="text-green-700 sm:hidden">4/4</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-500" />
                <span className="text-amber-600">
                  {Array.isArray(order.prePickupPhotos) ? `${order.prePickupPhotos.length}/4` : '0/4'}
                </span>
              </>
            )
          )}
        </span>
      </div>

      {(['ASSIGNED', 'ACCEPTED', 'REACHED_CUSTOMER', 'VEHICLE_PICKED', 'REACHED_MERCHANT', 'SERVICE_COMPLETED', 'OUT_FOR_DELIVERY', 'CAR_WASH_STARTED', 'CAR_WASH_COMPLETED', 'STAFF_REACHED_MERCHANT', 'PICKUP_BATTERY_TIRE', 'INSTALLATION', 'DELIVERY'].includes(order.status)) && (
        <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-sm space-y-4">
          <h3 className="font-medium text-sm sm:text-base">Order Actions</h3>



          <div className="space-y-3">
            {isWaitingForPayment && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Waiting for Customer Payment (₹{order.totalAmount}). Staff cannot pick up the vehicle until payment is completed.</span>
              </div>
            )}
            {nextAction && (
              <Button
                disabled={shouldDisablePrimaryAction}
                size="lg"
                className={`w-full justify-center gap-2 text-white text-sm sm:text-base ${nextAction.color}`}
                onClick={() => handleStatusUpdate(nextAction.nextStatus)}
              >
                <CheckCircle className="w-4 h-4" />
                {nextAction.label}
              </Button>
            )}

            <Button
              size="lg"
              variant="outline"
              className="w-full justify-center gap-2 text-sm sm:text-base"
              onClick={handleNavigate}
            >
              <Navigation className="w-4 h-4" />
              <span className="hidden sm:inline">Navigate to Location</span>
              <span className="sm:hidden">Navigate</span>
            </Button>

            {!['SERVICE_COMPLETED', 'OUT_FOR_DELIVERY', 'CAR_WASH_COMPLETED', 'DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status) && 
             !(isBattery && (order.status === 'STAFF_REACHED_MERCHANT' || order.status === 'INSTALLATION')) && (
              <Button
                size="lg"
                variant="secondary"
                className="w-full justify-center gap-2 text-sm sm:text-base"
                onClick={isCarWash ? handlePrePickupUploadClick : (isPrePickupPhase ? handlePrePickupUploadClick : handleUploadClick)}
                disabled={isCarWash ? isUploadingPrePickup : (isPrePickupPhase && isUploadingPrePickup)}
              >
                <Upload className="w-4 h-4" />
                {(() => {
                  if (isCarWash) {
                    if (order.status === 'REACHED_CUSTOMER') {
                      const beforeCount = order.carWash?.beforeWashPhotos?.length || 0;
                      return isUploadingPrePickup ? 'Uploading...' : (
                        <>
                          <span className="hidden sm:inline">
                            {beforeCount}/{CAR_WASH_MAX_PHOTOS} — Upload Before {isEssentials ? 'Service' : 'Wash'} Photos
                          </span>
                          <span className="sm:hidden">{beforeCount}/{CAR_WASH_MAX_PHOTOS} Before</span>
                        </>
                      );
                    } else if (order.status === 'CAR_WASH_STARTED') {
                      const afterCount = order.carWash?.afterWashPhotos?.length || 0;
                      return isUploadingPrePickup ? 'Uploading...' : (
                        <>
                          <span className="hidden sm:inline">
                            {afterCount}/{CAR_WASH_MAX_PHOTOS} — Upload After {isEssentials ? 'Service' : 'Wash'} Photos
                          </span>
                          <span className="sm:hidden">{afterCount}/{CAR_WASH_MAX_PHOTOS} After</span>
                        </>
                      );
                    }
                    return 'Upload Photos';
                  } else if (isBatteryOrTire) {
                    if (order.status === 'REACHED_CUSTOMER') {
                      const beforeCount = order.prePickupPhotos?.length || 0;
                      return isUploadingPrePickup ? 'Uploading...' : (
                        <>
                          <span className="hidden sm:inline">
                            {beforeCount}/{BATTERY_BEFORE_PHOTOS_REQUIRED} — Upload Old & New Part Photos
                          </span>
                          <span className="sm:hidden">{beforeCount}/{BATTERY_BEFORE_PHOTOS_REQUIRED} Old & New</span>
                        </>
                      );
                    } else if (order.status === 'INSTALLATION') {
                      const afterCount = order.serviceExecution?.afterPhotos?.length || 0;
                      return isUploadingPrePickup ? 'Uploading...' : (
                        <>
                          <span className="hidden sm:inline">
                            {afterCount}/{BATTERY_AFTER_PHOTOS_REQUIRED} — Upload After Service Photos
                          </span>
                          <span className="sm:hidden">{afterCount}/{BATTERY_AFTER_PHOTOS_REQUIRED} After</span>
                        </>
                      );
                    }
                    return 'Upload Photos';
                  } else {
                    if (isPrePickupPhase) {
                      const prePickupLabels = ['Front', 'Right', 'Back', 'Left'];
                      const photoCount = Array.isArray(order.prePickupPhotos) ? order.prePickupPhotos.length : 0;
                      const currentLabel = photoCount < 4 ? prePickupLabels[photoCount] : 'Upload Photos';
                      
                      return isUploadingPrePickup ? 'Uploading...' : (
                        <>
                          <span className="hidden sm:inline">{photoCount < 4 ? `Upload ${currentLabel} Photo` : 'Upload Photos'}</span>
                          <span className="sm:hidden">{currentLabel}</span>
                        </>
                      );
                    }
                    return 'Upload Photos';
                  }
                })()}
              </Button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={handleFileChange}
          />

          <input
            type="file"
            ref={prePickupInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={handlePrePickupFileChange}
          />

          {(isPrePickupPhase || (isCarWash && order.status === 'CAR_WASH_STARTED')) && 
           !(isBattery && order.status === 'STAFF_REACHED_MERCHANT') && (
            <div className="mt-4 space-y-2">
              {isCarWash ? (
                order.status === 'REACHED_CUSTOMER' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {isEssentials ? 'Before service photos' : 'Before wash photos'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {beforeWashPhotos.length}/{isEssentials ? 4 : CAR_WASH_MAX_PHOTOS}
                      </span>
                    </div>
                    {beforeWashPhotos.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {beforeWashPhotos.slice(0, CAR_WASH_MAX_PHOTOS).map((url, index) => (
                          <div key={index} className="relative rounded-lg overflow-hidden border border-border bg-muted">
                            <img src={url} alt={`Before ${index + 1}`} className="w-full h-12 sm:h-16 object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        No before {isEssentials ? 'service' : 'wash'} photos uploaded yet. Upload {isEssentials ? 4 : CAR_WASH_MIN_PHOTOS} clear photos.
                      </p>
                    )}
                  </>
                ) : order.status === 'CAR_WASH_STARTED' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {isEssentials ? 'After service photos' : 'After wash photos'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {afterWashPhotos.length}/{isEssentials ? 4 : CAR_WASH_MAX_PHOTOS}
                      </span>
                    </div>
                    {afterWashPhotos.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {afterWashPhotos.slice(0, CAR_WASH_MAX_PHOTOS).map((url, index) => (
                          <div key={index} className="relative rounded-lg overflow-hidden border border-border bg-muted">
                            <img src={url} alt={`After ${index + 1}`} className="w-full h-12 sm:h-16 object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        No after {isEssentials ? 'service' : 'wash'} photos uploaded yet. Upload {isEssentials ? 4 : CAR_WASH_MIN_PHOTOS} clear photos.
                      </p>
                    )}
                  </>
                ) : null
              ) : isBatteryOrTire && order.status === 'INSTALLATION' ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Before installation photos</span>
                      <span className="text-[11px] text-muted-foreground">
                        {order.prePickupPhotos?.length || 0}/{BATTERY_BEFORE_PHOTOS_REQUIRED}
                      </span>
                    </div>
                    {order.prePickupPhotos && order.prePickupPhotos.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {order.prePickupPhotos.slice(0, BATTERY_BEFORE_PHOTOS_REQUIRED).map((url, index) => (
                          <div key={index} className="relative rounded-lg overflow-hidden border border-border bg-muted">
                            <img src={url} alt={`Before ${index + 1}`} className="w-full h-12 sm:h-16 object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">No before photos uploaded.</p>
                    )}
                  </div>
                  {!isBattery && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">After service photos</span>
                        <span className="text-[11px] text-muted-foreground">
                          {order.serviceExecution?.afterPhotos?.length || 0}/{BATTERY_AFTER_PHOTOS_REQUIRED}
                        </span>
                      </div>
                      {order.serviceExecution?.afterPhotos && order.serviceExecution.afterPhotos.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {order.serviceExecution.afterPhotos.slice(0, BATTERY_AFTER_PHOTOS_REQUIRED).map((url, index) => (
                            <div key={index} className="relative rounded-lg overflow-hidden border border-border bg-muted">
                              <img src={url} alt={`After ${index + 1}`} className="w-full h-12 sm:h-16 object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Upload {BATTERY_AFTER_PHOTOS_REQUIRED} clear after service photos before completing delivery.
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {isBatteryOrTire ? 'Before installation photos' : 'Pre-pickup photos'}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {Array.isArray(order.prePickupPhotos) ? `${order.prePickupPhotos.length}/${isBatteryOrTire ? BATTERY_BEFORE_PHOTOS_REQUIRED : '4'}` : `0/${isBatteryOrTire ? BATTERY_BEFORE_PHOTOS_REQUIRED : '4'}`}
                </span>
              </div>
              {order.prePickupPhotos && order.prePickupPhotos.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {order.prePickupPhotos.slice(0, isBatteryOrTire ? BATTERY_BEFORE_PHOTOS_REQUIRED : 4).map((url, index) => (
                    <div
                      key={index}
                      className="relative rounded-lg overflow-hidden border border-border bg-muted"
                    >
                      <img
                        src={url}
                        alt={`Pre-pickup ${index + 1}`}
                        className="w-full h-12 sm:h-16 object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No photos uploaded yet. Upload {isBatteryOrTire ? BATTERY_BEFORE_PHOTOS_REQUIRED : '4'} clear photos {isBatteryOrTire ? 'before starting installation' : 'of the vehicle before pickup'}.
                </p>
              )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {order.status === 'REACHED_MERCHANT' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-2">
          <h3 className="font-medium text-yellow-800 flex items-center gap-2 text-sm sm:text-base">
            <AlertTriangle className="w-4 sm:w-5 h-4 sm:h-5" />
            Waiting for Handover
          </h3>
          <p className="text-sm text-yellow-700">
            You have reached the workshop. Please handover the vehicle to the merchant.
            The merchant will update the status once they receive the vehicle.
          </p>
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 text-xs sm:text-sm">
          <TabsTrigger value="overview" className="px-2 sm:px-4">Overview</TabsTrigger>
          <TabsTrigger value="vehicle" className="px-2 sm:px-4">Vehicle</TabsTrigger>
          <TabsTrigger value="navigation" className="px-1.5 sm:px-4 text-[11px] sm:text-sm leading-tight">
            Navigation
          </TabsTrigger>
          <TabsTrigger value="media" className="px-2 sm:px-4">Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-purple-50 rounded-full flex-shrink-0">
                <User className="w-4 sm:w-5 h-4 sm:h-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-base sm:text-lg truncate">{userDetails.name || 'Guest User'}</h3>
                <p className="text-muted-foreground text-sm">{userDetails.phone || 'No phone'}</p>
              </div>
              {userDetails.phone && (
                <a href={`tel:${userDetails.phone}`} className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 flex-shrink-0">
                  <Phone className="w-4 sm:w-5 h-4 sm:h-5" />
                </a>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vehicle" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-blue-50 rounded-full flex-shrink-0">
                <Car className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm sm:text-base">{vehicle.make} {vehicle.model}</h3>
                <p className="text-muted-foreground text-sm">{vehicle.licensePlate || 'No Plate'}</p>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Requested Services</h4>
              <ul className="space-y-2">
                {services.map((s, idx: number) => (
                  <li key={idx} className="text-sm p-2 bg-gray-50 rounded flex justify-between">
                    <span className="truncate">{typeof s === 'string' ? s : s.name || 'Service'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="navigation" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-amber-50 rounded-full flex-shrink-0">
                <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium mb-1 text-sm sm:text-base">{locationLabel}</h3>
                <p className="text-sm text-muted-foreground mb-3 break-words">
                  {addressDisplay}
                </p>
                {eta && (
                  <div className="mb-3 text-xs text-muted-foreground">
                    ETA: <span className="font-medium text-foreground">{eta.textDuration}</span>
                    <span className="mx-1">•</span>
                    {eta.textDistance}
                  </div>
                )}
                
                <Button onClick={handleNavigate} className="w-full gap-2 text-sm sm:text-base">
                  <Navigation className="w-4 h-4" />
                  <span className="hidden sm:inline">{navigateButtonText}</span>
                  <span className="sm:hidden">Navigate</span>
                </Button>
                
                {isTracking && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-xs text-green-600 font-medium animate-pulse">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    <span className="hidden sm:inline">Sharing Live Location</span>
                    <span className="sm:hidden">Live Location</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="media" className="mt-4 space-y-4">
          {(() => {
            if (isCarWash) {
              return (
                <>
                  {/* Before Wash Photos */}
                  <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1">
                        <h3 className="font-medium">{isEssentials ? 'Before Service Photos' : 'Before Wash Photos'}</h3>
                        <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border border-border">
                          {(() => {
                            const count = order.carWash?.beforeWashPhotos?.length || 0;
                            const badge = getPhotoStatusBadge(count, CAR_WASH_MIN_PHOTOS, CAR_WASH_MAX_PHOTOS);
                            return badge.isComplete ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                <span className="text-green-700">{badge.text}</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className={`w-3 h-3 ${badge.isOverLimit ? 'text-red-500' : 'text-amber-500'}`} />
                                <span className={badge.isOverLimit ? 'text-red-600' : 'text-amber-600'}>{badge.text}</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {order.carWash?.beforeWashPhotos && order.carWash.beforeWashPhotos.length > 0 ? (
                        order.carWash.beforeWashPhotos.slice(0, CAR_WASH_MAX_PHOTOS).map((url, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                            <img src={url} alt={`Before ${isEssentials ? 'service' : 'wash'} ${index + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))
                      ) : (
                        <div className="col-span-4 py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                          No before {isEssentials ? 'service' : 'wash'} photos yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* After Wash Photos */}
                  <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1">
                        <h3 className="font-medium">{isEssentials ? 'After Service Photos' : 'After Wash Photos'}</h3>
                        <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border border-border">
                          {(() => {
                            const count = order.carWash?.afterWashPhotos?.length || 0;
                            const badge = getPhotoStatusBadge(count, CAR_WASH_MIN_PHOTOS, CAR_WASH_MAX_PHOTOS);
                            return badge.isComplete ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                <span className="text-green-700">{badge.text}</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className={`w-3 h-3 ${badge.isOverLimit ? 'text-red-500' : 'text-amber-500'}`} />
                                <span className={badge.isOverLimit ? 'text-red-600' : 'text-amber-600'}>{badge.text}</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {order.carWash?.afterWashPhotos && order.carWash.afterWashPhotos.length > 0 ? (
                        order.carWash.afterWashPhotos.slice(0, CAR_WASH_MAX_PHOTOS).map((url, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                            <img src={url} alt={`After ${isEssentials ? 'service' : 'wash'} ${index + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))
                      ) : (
                        <div className="col-span-4 py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                          No after {isEssentials ? 'service' : 'wash'} photos yet
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            } else {
              return (
                <>
                  {/* Regular/Battery/Tire Service Photos */}
                  <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1">
                        <h3 className="font-medium">
                          {isBatteryOrTire ? 'Before Installation Photos' : 'Pre-Pickup Vehicle Photos'}
                        </h3>
                        <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border border-border">
                          {isBatteryOrTire ? (() => {
                            const count = order.prePickupPhotos?.length || 0;
                            const badge = getPhotoStatusBadge(count, BATTERY_BEFORE_PHOTOS_REQUIRED, BATTERY_BEFORE_PHOTOS_REQUIRED);
                            return badge.isComplete ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                <span className="text-green-700">{badge.text}</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className={`w-3 h-3 ${badge.isOverLimit ? 'text-red-500' : 'text-amber-500'}`} />
                                <span className={badge.isOverLimit ? 'text-red-600' : 'text-amber-600'}>{badge.text}</span>
                              </>
                            );
                          })() : (
                            order.prePickupPhotos && order.prePickupPhotos.length >= 4 ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                <span className="text-green-700">4/4 photos captured</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                <span className="text-amber-600">
                                  {order.prePickupPhotos?.length || 0}/4 photos
                                </span>
                              </>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {order.prePickupPhotos && order.prePickupPhotos.length > 0 ? (
                        order.prePickupPhotos.slice(0, isBatteryOrTire ? BATTERY_BEFORE_PHOTOS_REQUIRED : 4).map((url, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group">
                            <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                            {isBatteryOrTire && (
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center py-0.5">
                                {getBatteryBeforePhotoLabel(index)}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="col-span-4 py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                          No photos yet
                        </div>
                      )}
                    </div>
                  </div>
                  {isBatteryOrTire && !isBattery && ['INSTALLATION', 'DELIVERY', 'COMPLETED'].includes(order.status) && (
                    <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-1">
                          <h3 className="font-medium">After Service Photos</h3>
                          <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border border-border">
                            {(() => {
                              const count = order.serviceExecution?.afterPhotos?.length || 0;
                              const badge = getPhotoStatusBadge(count, BATTERY_AFTER_PHOTOS_REQUIRED, BATTERY_AFTER_PHOTOS_REQUIRED);
                              return badge.isComplete ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <span className="text-green-700">{badge.text}</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className={`w-3 h-3 ${badge.isOverLimit ? 'text-red-500' : 'text-amber-500'}`} />
                                  <span className={badge.isOverLimit ? 'text-red-600' : 'text-amber-600'}>{badge.text}</span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {order.serviceExecution?.afterPhotos && order.serviceExecution.afterPhotos.length > 0 ? (
                          order.serviceExecution.afterPhotos.slice(0, BATTERY_AFTER_PHOTOS_REQUIRED).map((url, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group">
                              <img src={url} alt={`After service ${index + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center py-0.5">
                                {getBatteryAfterPhotoLabel(index)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-4 py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                            No after service photos yet
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <h3 className="font-medium mb-3">Uploaded Photos</h3>
                    {order.media && order.media.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {order.media.map((url, index) => (
                          <div key={index} className="relative rounded-lg overflow-hidden border border-border bg-muted">
                            <img src={url} alt={`Order media ${index + 1}`} className="w-full h-32 object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No photos uploaded yet. Use the Actions menu to upload.</p>
                    )}
                  </div>
                </>
              );
            }
          })()}
        </TabsContent>
      </Tabs>

    </div>
  );
};

export default StaffOrderPage;
