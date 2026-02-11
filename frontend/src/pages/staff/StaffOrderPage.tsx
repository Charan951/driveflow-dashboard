import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { bookingService, Booking } from '@/services/bookingService';
import { useAuthStore } from '@/store/authStore';
import { useTracking } from '@/context/TrackingContext';
import { socketService } from '@/services/socket';
import { uploadService } from '@/services/uploadService';
import { MapPin, Navigation, Phone, Car, Wrench, User, Calendar, Clock, AlertTriangle, Upload, ChevronDown, CheckCircle } from 'lucide-react';
import * as turf from '@turf/turf';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

const StaffOrderPage: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { setActiveBookingId, startTracking, stopTracking, isTracking, location: staffLocation } = useTracking();
  const [order, setOrder] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Set active booking ID for tracking context
    if (id) {
      setActiveBookingId(id);
    }
    
    return () => {
      setActiveBookingId(null);
    };
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
  }, [order, staffLocation, isUpdating]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    try {
      setIsUpdating(true);
      await bookingService.updateBookingStatus(order._id, newStatus);
      setOrder({ ...order, status: newStatus as any });
      toast.success(`Order updated to ${newStatus}`);

      // Auto-navigate to merchant when vehicle is picked
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
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNavigate = () => {
    // Determine target based on status
    // If vehicle is picked up, we are going to the merchant
    const isHeadingToMerchant = order?.status === 'VEHICLE_PICKED';
    const targetLocation = isHeadingToMerchant ? order?.merchant?.location : order?.location;
    const targetName = isHeadingToMerchant ? "Merchant" : "Customer";

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

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!order) return <div className="p-6 text-center">Order not found</div>;

  // Safe access helpers
  const vehicle = (order.vehicle as any) || {};
  const userDetails = (order.user as any) || {};
  const services = Array.isArray(order.services) ? order.services : [];

  const getNextStatusAction = (currentStatus: string) => {
    switch (currentStatus) {
      case 'ASSIGNED': return { label: 'Accept Order', nextStatus: 'ACCEPTED', color: 'bg-blue-600 hover:bg-blue-700' };
      case 'ACCEPTED': return { label: 'Reached Location', nextStatus: 'REACHED_CUSTOMER', color: 'bg-blue-600 hover:bg-blue-700' };
      case 'REACHED_CUSTOMER': return { label: 'Vehicle Picked Up', nextStatus: 'VEHICLE_PICKED', color: 'bg-blue-600 hover:bg-blue-700' };
      case 'VEHICLE_PICKED': return { label: 'Reached Workshop', nextStatus: 'REACHED_MERCHANT', color: 'bg-purple-600 hover:bg-purple-700' };
      // case 'REACHED_MERCHANT': return { label: 'Handover to Merchant', nextStatus: 'VEHICLE_AT_MERCHANT', color: 'bg-indigo-600 hover:bg-indigo-700' };
      case 'SERVICE_COMPLETED': return { label: 'Pick for Delivery', nextStatus: 'OUT_FOR_DELIVERY', color: 'bg-orange-600 hover:bg-orange-700' };
      case 'OUT_FOR_DELIVERY': return { label: 'Confirm Delivery', nextStatus: 'DELIVERED', color: 'bg-green-600 hover:bg-green-700' };
      default: return null;
    }
  };

  const nextAction = getNextStatusAction(order.status);

  // Determine display location
  const isHeadingToMerchant = order.status === 'VEHICLE_PICKED';
  const targetLocation = isHeadingToMerchant ? order.merchant?.location : order.location;
  const locationLabel = isHeadingToMerchant ? 'Drop-off Location (Workshop)' : 'Pickup Location';
  const navigateButtonText = isHeadingToMerchant ? 'Navigate to Workshop' : 'Navigate & Start Job';
  const addressDisplay = typeof targetLocation === 'string' ? targetLocation : targetLocation?.address || 'No address provided';

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order Details</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          order.status === 'DELIVERED' || order.status === 'SERVICE_COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {order.status}
        </span>
      </div>

      {/* Status Actions */}
      {(['ASSIGNED', 'ACCEPTED', 'REACHED_CUSTOMER', 'VEHICLE_PICKED', 'REACHED_MERCHANT', 'SERVICE_COMPLETED', 'OUT_FOR_DELIVERY'].includes(order.status)) && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
          <h3 className="font-medium">Order Actions</h3>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isUpdating} className="w-full justify-between" size="lg">
                Actions <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="end">
              <DropdownMenuLabel>Available Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Status Update */}
              {nextAction && (
                <DropdownMenuItem 
                  onClick={() => handleStatusUpdate(nextAction.nextStatus)}
                  className="cursor-pointer text-primary font-medium"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {nextAction.label}
                </DropdownMenuItem>
              )}

              {/* Navigation */}
              <DropdownMenuItem onClick={handleNavigate} className="cursor-pointer">
                <Navigation className="mr-2 h-4 w-4" />
                Navigate to Location
              </DropdownMenuItem>

              {/* Upload */}
              <DropdownMenuItem onClick={handleUploadClick} className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Upload Photo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Waiting for Merchant Confirmation */}
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

      {/* Customer Info */}
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

      {/* Vehicle Info */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 rounded-full">
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium">{vehicle.make} {vehicle.model}</h3>
            <p className="text-muted-foreground text-sm">{vehicle.registrationNumber || 'No Plate'}</p>
          </div>
        </div>
      </div>

      {/* Location & Navigation */}
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

      {/* Services */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-gray-500" /> Requested Services
        </h3>
        <ul className="space-y-2">
          {services.map((s: any, idx: number) => (
            <li key={idx} className="text-sm p-2 bg-gray-50 rounded flex justify-between">
              <span>{s.name || 'Service'}</span>
            </li>
          ))}
        </ul>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default StaffOrderPage;
