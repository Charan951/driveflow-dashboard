import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { bookingService, Booking } from '@/services/bookingService';
import { useAuthStore } from '@/store/authStore';
import { useTracking } from '@/hooks/use-tracking';
import { socketService } from '@/services/socket';
import { uploadService } from '@/services/uploadService';
import { MapPin, Navigation, Phone, Car, Wrench, User, Calendar, Clock, AlertTriangle, Upload, CheckCircle } from 'lucide-react';
import * as turf from '@turf/turf';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getETA, ETAResponse } from '@/services/trackingService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const StaffOrderPage: React.FC = () => {
  const { id } = useParams();
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

    try {
      setIsUpdating(true);
      if (newStatus === 'VEHICLE_PICKED') {
        const photos = Array.isArray(order.prePickupPhotos) ? order.prePickupPhotos : [];
        if (photos.length < 4) {
          toast.error('Please upload 4 vehicle photos before picking up the vehicle');
          setIsUpdating(false);
          return;
        }
      }
      if (newStatus === 'DELIVERED') {
        const otp = window.prompt('Enter the 4-digit delivery OTP from customer');
        if (!otp) {
          setIsUpdating(false);
          return;
        }
        await bookingService.verifyDeliveryOtp(order._id, otp);
      }
      const updated = await bookingService.updateBookingStatus(order._id, newStatus);
      setOrder(updated);
      toast.success(`Order updated to ${newStatus}`);

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
      if (newStatus === 'OUT_FOR_DELIVERY') {
        toast.info('Delivery OTP sent to customer');
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
    }
  }, [id, setActiveBookingId]);

  useEffect(() => {
    const fetchOrder = async () => {
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
    };
    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (id) {
        socketService.connect();
        socketService.joinRoom(`booking_${id}`);

        socketService.on('bookingUpdated', (updatedBooking: Booking) => {
            if (updatedBooking._id === id) {
                setOrder(updatedBooking);
            }
        });

        return () => {
            socketService.leaveRoom(`booking_${id}`);
            socketService.off('bookingUpdated');
        }
    }
  }, [id]);

  // Auto-status update when reaching customer or merchant location
  useEffect(() => {
    if (!staffLocation || !order || isUpdating) return;

    // 1. Reaching Customer (Status: ACCEPTED)
    if (order.status === 'ACCEPTED' && order.location) {
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

    // 2. Reaching Merchant (Status: VEHICLE_PICKED)
    if (order.status === 'VEHICLE_PICKED' && order.merchant?.location) {
        const targetLat = order.merchant.location.lat;
        const targetLng = order.merchant.location.lng;

        if (targetLat && targetLng && staffLocation.lat && staffLocation.lng) {
             const from = turf.point([staffLocation.lng, staffLocation.lat]);
             const to = turf.point([targetLng, targetLat]);
             const distance = turf.distance(from, to, { units: 'meters' });
             
             if (distance < 100) {
                 toast.info("You have arrived at the merchant location.");
                 handleStatusUpdate('REACHED_MERCHANT');
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
    const isHeadingToMerchant =
      order.status === 'VEHICLE_PICKED' || order.status === 'SERVICE_COMPLETED';
    let destLat: number | undefined;
    let destLng: number | undefined;
    if (
      order.status === 'ACCEPTED' ||
      order.status === 'REACHED_CUSTOMER' ||
      order.status === 'OUT_FOR_DELIVERY'
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
    const isHeadingToMerchant =
      order?.status === 'VEHICLE_PICKED' || order?.status === 'SERVICE_COMPLETED';
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
    if (e.target.files && e.target.files[0] && order) {
      try {
        const file = e.target.files[0];
        const loadingToast = toast.loading('Uploading photo...');
        
        const uploadRes = await uploadService.uploadFile(file);
        
        const currentMedia = order.media || [];
        const newMedia = [...currentMedia, uploadRes.url];
        
        await bookingService.updateBookingDetails(order._id, { media: newMedia });
        setOrder({ ...order, media: newMedia });
        
        toast.dismiss(loadingToast);
        toast.success('Photo uploaded successfully');
      } catch (error) {
        console.error(error);
        toast.error('Failed to upload photo');
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
    
    try {
      setIsUploadingPrePickup(true);
      const loadingToast = toast.loading('Uploading pre-pickup photos...');
      const res = await uploadService.uploadFiles(files);
      const newUrls = (res.files || []).map((f: { url: string }) => f.url);
      
      const currentPhotos = Array.isArray(order.prePickupPhotos) ? order.prePickupPhotos : [];
      const updatedPhotos = [...currentPhotos, ...newUrls];
      
      await bookingService.updateBookingDetails(order._id, { prePickupPhotos: updatedPhotos });
      setOrder({ ...order, prePickupPhotos: updatedPhotos });
      
      toast.dismiss(loadingToast);
      toast.success(`${newUrls.length} photos uploaded`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload pre-pickup photos');
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

  const getNextStatusAction = (currentStatus: string) => {
    switch (currentStatus) {
      case 'ASSIGNED':
      case 'ACCEPTED': return { label: 'Reached Customer', nextStatus: 'REACHED_CUSTOMER', color: 'bg-blue-600 hover:bg-blue-700' };
      case 'REACHED_CUSTOMER': return { label: 'Pickup Vehicle from Customer', nextStatus: 'VEHICLE_PICKED', color: 'bg-blue-600 hover:bg-blue-700' };
      case 'VEHICLE_PICKED': return { label: 'Reached Service Center', nextStatus: 'REACHED_MERCHANT', color: 'bg-purple-600 hover:bg-purple-700' };
      // case 'REACHED_MERCHANT': return { label: 'Handover to Merchant', nextStatus: 'VEHICLE_AT_MERCHANT', color: 'bg-indigo-600 hover:bg-indigo-700' };
      case 'SERVICE_COMPLETED': return { label: 'Pickup Vehicle from Workshop', nextStatus: 'OUT_FOR_DELIVERY', color: 'bg-orange-600 hover:bg-orange-700' };
      case 'OUT_FOR_DELIVERY': return { label: 'Complete Delivery', nextStatus: 'DELIVERED', color: 'bg-green-600 hover:bg-green-700' };
      default: return null;
    }
  };

  const nextAction = getNextStatusAction(order.status);
  const isWaitingForPayment = order.status === 'SERVICE_COMPLETED' && order.paymentStatus !== 'paid';
  const shouldDisablePrimaryAction =
    isUpdating ||
    isWaitingForPayment ||
    (nextAction?.nextStatus === 'VEHICLE_PICKED' &&
      (!Array.isArray(order.prePickupPhotos) || order.prePickupPhotos.length < 4));

  // Determine display location
  const isHeadingToMerchant = order.status === 'VEHICLE_PICKED';
  const isPrePickupPhase = order.status === 'REACHED_CUSTOMER';
  const targetLocation = isHeadingToMerchant ? order.merchant?.location : order.location;
  const locationLabel = isHeadingToMerchant ? 'Drop-off Location (Workshop)' : 'Pickup Location';
  const navigateButtonText = isHeadingToMerchant ? 'Navigate to Workshop' : 'Navigate & Start Job';
  const addressDisplay = typeof targetLocation === 'string' ? targetLocation : targetLocation?.address || 'No address provided';

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Order Details</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            order.status === 'DELIVERED' || order.status === 'SERVICE_COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {order.status}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-border">
          {Array.isArray(order.prePickupPhotos) && order.prePickupPhotos.length >= 4 ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-700">Pickup photos ready</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-600">
                {Array.isArray(order.prePickupPhotos) ? `${order.prePickupPhotos.length}/4 photos` : '0/4 photos'}
              </span>
            </>
          )}
        </span>
      </div>

      {(['ASSIGNED', 'ACCEPTED', 'REACHED_CUSTOMER', 'VEHICLE_PICKED', 'REACHED_MERCHANT', 'SERVICE_COMPLETED', 'OUT_FOR_DELIVERY'].includes(order.status)) && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
          <h3 className="font-medium">Order Actions</h3>

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
                className={`w-full justify-center gap-2 text-white ${nextAction.color}`}
                onClick={() => handleStatusUpdate(nextAction.nextStatus)}
              >
                <CheckCircle className="w-4 h-4" />
                {nextAction.label}
              </Button>
            )}

            <Button
              size="lg"
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={handleNavigate}
            >
              <Navigation className="w-4 h-4" />
              Navigate to Location
            </Button>

            <Button
              size="lg"
              variant="secondary"
              className="w-full justify-center gap-2"
              onClick={isPrePickupPhase ? handlePrePickupUploadClick : handleUploadClick}
              disabled={isPrePickupPhase && isUploadingPrePickup}
            >
              <Upload className="w-4 h-4" />
              {isPrePickupPhase
                ? isUploadingPrePickup
                  ? 'Uploading...'
                  : 'Upload Photos'
                : 'Upload Photo'}
            </Button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          {isPrePickupPhase && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pre-pickup photos</span>
                <span className="text-[11px] text-muted-foreground">
                  {Array.isArray(order.prePickupPhotos) ? `${order.prePickupPhotos.length}/4` : '0/4'}
                </span>
              </div>
              {order.prePickupPhotos && order.prePickupPhotos.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {order.prePickupPhotos.slice(0, 4).map((url, index) => (
                    <div
                      key={index}
                      className="relative rounded-lg overflow-hidden border border-border bg-muted"
                    >
                      <img
                        src={url}
                        alt={`Pre-pickup ${index + 1}`}
                        className="w-full h-16 object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No photos uploaded yet. Upload 4 clear photos of the vehicle before pickup.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {order.status === 'REACHED_MERCHANT' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 shadow-sm space-y-2">
          <h3 className="font-medium text-yellow-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Waiting for Handover
          </h3>
          <p className="text-sm text-yellow-700">
            You have reached the workshop. Please handover the vehicle to the merchant.
            The merchant will update the status once they receive the vehicle.
          </p>
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="media">Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-50 rounded-full">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-lg">{userDetails.name || 'Guest User'}</h3>
                <p className="text-muted-foreground text-sm">{userDetails.phone || 'No phone'}</p>
              </div>
              {userDetails.phone && (
                <a href={`tel:${userDetails.phone}`} className="ml-auto p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100">
                  <Phone className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vehicle" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-full">
                <Car className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">{vehicle.make} {vehicle.model}</h3>
                <p className="text-muted-foreground text-sm">{vehicle.licensePlate || 'No Plate'}</p>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Requested Services</h4>
              <ul className="space-y-2">
                {services.map((s, idx: number) => (
                  <li key={idx} className="text-sm p-2 bg-gray-50 rounded flex justify-between">
                    <span>{typeof s === 'string' ? s : s.name || 'Service'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="navigation" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-50 rounded-full">
                <MapPin className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">{locationLabel}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {addressDisplay}
                </p>
                {eta && (
                  <div className="mb-3 text-xs text-muted-foreground">
                    ETA: <span className="font-medium text-foreground">{eta.textDuration}</span>
                    <span className="mx-1">•</span>
                    {eta.textDistance}
                  </div>
                )}
                
                <Button onClick={handleNavigate} className="w-full gap-2">
                  <Navigation className="w-4 h-4" />
                  {navigateButtonText}
                </Button>
                
                {isTracking && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-xs text-green-600 font-medium animate-pulse">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    Sharing Live Location
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="media" className="mt-4 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <h3 className="font-medium">Pre-Pickup Vehicle Photos</h3>
                <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border border-border">
                  {order.prePickupPhotos && order.prePickupPhotos.length >= 4 ? (
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
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {order.prePickupPhotos && order.prePickupPhotos.length > 0 ? (
                order.prePickupPhotos.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                    <img src={url} alt={`Pre-pickup ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))
              ) : (
                <div className="col-span-4 py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  No pre-pickup photos yet
                </div>
              )}
            </div>
            <input
              type="file"
              ref={prePickupInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handlePrePickupFileChange}
            />
          </div>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffOrderPage;
