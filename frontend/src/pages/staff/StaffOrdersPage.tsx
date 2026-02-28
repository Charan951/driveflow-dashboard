import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle, Upload, Search, Filter, MapPin, Navigation } from 'lucide-react';
import { bookingService, Booking } from '@/services/bookingService';
import { uploadService } from '@/services/uploadService';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTracking } from '@/hooks/use-tracking';
import { getETA, ETAResponse } from '@/services/trackingService';

const ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'REACHED_CUSTOMER', 'VEHICLE_PICKED', 'REACHED_MERCHANT', 'VEHICLE_AT_MERCHANT', 'SERVICE_STARTED', 'SERVICE_COMPLETED', 'OUT_FOR_DELIVERY', 'QC_PENDING'];

const StaffOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { location: trackingLocation, setActiveBookingId, activeBookingId } = useTracking();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedOrderForUpload, setSelectedOrderForUpload] = useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<Booking | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [etaByBooking, setEtaByBooking] = useState<Record<string, ETAResponse>>({});
  const etaTimeoutRef = useRef<number | null>(null);

  const fetchData = async () => {
    try {
      const data = await bookingService.getMyBookings();
      setBookings(data);
      setFilteredBookings(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-bind an active booking to enable live sharing to customers/merchants
  useEffect(() => {
    if (activeBookingId) return;
    const candidate = bookings.find(b => ACTIVE_STATUSES.includes(b.status));
    if (candidate) {
      setActiveBookingId(candidate._id);
    }
  }, [bookings, activeBookingId, setActiveBookingId]);

  useEffect(() => {
    let result = bookings;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((b) => {
        const idMatch = (b._id?.toLowerCase() || '').includes(query) || (b.orderNumber && String(b.orderNumber).toLowerCase().includes(query));
        const userName =
          typeof b.user === 'object' && b.user !== null ? (b.user.name?.toLowerCase() || '') : '';
        const userMatch = userName.includes(query);
        return idMatch || userMatch;
      });
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        result = result.filter(b => ACTIVE_STATUSES.includes(b.status));
      } else if (statusFilter === 'completed') {
        result = result.filter(b => ['Ready', 'Delivered', 'Completed', 'DELIVERED', 'COMPLETED'].includes(b.status));
      } else {
        result = result.filter(b => b.status === statusFilter);
      }
    }

    setFilteredBookings(result);
  }, [searchQuery, statusFilter, bookings]);

  // Compute ETA badges for visible orders using OSRM backend endpoint
  useEffect(() => {
    if (!trackingLocation) {
      setEtaByBooking({});
      return;
    }
    if (etaTimeoutRef.current) {
      window.clearTimeout(etaTimeoutRef.current);
    }
    etaTimeoutRef.current = window.setTimeout(async () => {
      const updates: Record<string, ETAResponse> = {};
      const toProcess = filteredBookings.slice(0, 12);
      for (const b of toProcess) {
        let destLat: number | undefined;
        let destLng: number | undefined;
        if (['ASSIGNED', 'ACCEPTED', 'REACHED_CUSTOMER', 'OUT_FOR_DELIVERY'].includes(b.status)) {
          destLat = b.location?.lat;
          destLng = b.location?.lng;
        } else if (b.status === 'VEHICLE_PICKED' && b.merchant?.location) {
          destLat = b.merchant.location.lat;
          destLng = b.merchant.location.lng;
        }
        if (destLat && destLng) {
          try {
            const res = await getETA(trackingLocation.lat, trackingLocation.lng, destLat, destLng);
            updates[b._id] = res;
          } catch {
            // ignore
          }
        }
      }
      setEtaByBooking(prev => ({ ...prev, ...updates }));
    }, 400);
    return () => {
      if (etaTimeoutRef.current) {
        window.clearTimeout(etaTimeoutRef.current);
        etaTimeoutRef.current = null;
      }
    };
  }, [trackingLocation, filteredBookings]);

  const handleUploadClick = (orderId: string) => {
    setSelectedOrderForUpload(orderId);
    fileInputRef.current?.click();
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
        const loadingToast = toast.loading('Accepting order...');
        await bookingService.updateBookingStatus(orderId, 'ACCEPTED');
        setActiveBookingId(orderId);
        toast.dismiss(loadingToast);
        toast.success('Order accepted successfully');
        fetchData();
    } catch (error) {
        console.error(error);
        toast.error('Failed to accept order');
    }
  };

  const handleGetDirections = (order: Booking) => {
    const destLat = order.location?.lat;
    const destLng = order.location?.lng;
    const destAddress = order.location?.address;

    if (!destLat || !destLng) {
        // If lat/lng missing but address exists, try to search address
        if (destAddress) {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destAddress)}`;
            window.open(url, '_blank');
            return;
        }
        toast.error('Customer location not available');
        return;
    }

    // 1. Try to use cached location from TrackingContext (fastest)
    if (trackingLocation && trackingLocation.lat && trackingLocation.lng) {
        const url = `https://www.google.com/maps/dir/?api=1&origin=${trackingLocation.lat},${trackingLocation.lng}&destination=${destLat},${destLng}`;
        window.open(url, '_blank');
        return;
    }

    // 2. Fallback to requesting current position
    if (navigator.geolocation) {
        const loadingToast = toast.loading('Getting your location...');
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                toast.dismiss(loadingToast);
                const { latitude, longitude } = position.coords;
                const url = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${destLat},${destLng}`;
                window.open(url, '_blank');
            },
            (error) => {
                toast.dismiss(loadingToast);
                console.error('Error getting location', error);
                // If we can't get current location, just open maps with destination
                // Google Maps will try to find the route from "Your Location" automatically
                const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
                window.open(url, '_blank');
            },
            {
                enableHighAccuracy: true,
                timeout: 5000, // 5 seconds timeout to prevent hanging
                maximumAge: 10000
            }
        );
    } else {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
        window.open(url, '_blank');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedOrderForUpload) {
      try {
        const file = e.target.files[0];
        const loadingToast = toast.loading('Uploading photo...');
        
        const uploadRes = await uploadService.uploadFile(file);
        
        const order = bookings.find(b => b._id === selectedOrderForUpload);
        if (!order) {
            toast.dismiss(loadingToast);
            return;
        }
        
        const currentMedia = order.media || [];
        const newMedia = [...currentMedia, uploadRes.url];
        
        await bookingService.updateBookingDetails(selectedOrderForUpload, { media: newMedia });
        
        toast.dismiss(loadingToast);
        toast.success('Photo uploaded successfully');
        fetchData();
      } catch (error) {
        console.error(error);
        toast.error('Failed to upload photo');
      } finally {
        setSelectedOrderForUpload(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const openStatusDialog = (order: Booking) => {
    setSelectedOrderForStatus(order);
    setNewStatus(order.status);
    setStatusDialogOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrderForStatus || !newStatus) return;
    try {
      const loadingToast = toast.loading('Updating status...');
      if (newStatus === 'VEHICLE_PICKED') {
        const photos = Array.isArray(selectedOrderForStatus.prePickupPhotos) ? selectedOrderForStatus.prePickupPhotos : [];
        if (photos.length < 4) {
          toast.dismiss(loadingToast);
          toast.error('Please upload 4 vehicle photos before picking up the vehicle');
          return;
        }
      }
      if (newStatus === 'DELIVERED') {
        const otp = window.prompt('Enter delivery OTP');
        if (!otp) {
          toast.dismiss(loadingToast);
          return;
        }
        await bookingService.verifyDeliveryOtp(selectedOrderForStatus._id, otp);
      }
      const updated = await bookingService.updateBookingStatus(selectedOrderForStatus._id, newStatus);
      if (['ACCEPTED','REACHED_CUSTOMER','VEHICLE_PICKED','OUT_FOR_DELIVERY'].includes(newStatus)) {
        setActiveBookingId(selectedOrderForStatus._id);
      }
      if (newStatus === 'OUT_FOR_DELIVERY') {
        toast.success('Status updated successfully. Delivery OTP sent to customer');
      } else {
        toast.success('Status updated successfully');
      }
      toast.dismiss(loadingToast);
      setStatusDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]">Loading...</div>;
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Service Orders</h1>
          <p className="text-muted-foreground mt-1">Handle your assigned bookings and status updates</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search orders..." 
              className="pl-9 w-full sm:w-[200px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium">No orders found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBookings.map((order) => (
              <motion.div 
                key={order._id} 
                variants={staggerItem} 
                className="bg-card rounded-2xl border border-border p-4 flex flex-col h-full cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/staff/order/${order._id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Order #{order.orderNumber ?? order._id.slice(-6).toUpperCase()}</p>
                    <h3 className="font-semibold line-clamp-1">
                      {order.services && order.services.length > 0
                        ? (typeof order.services[0] === 'string' ? order.services[0] : order.services[0].name)
                        : 'Service'}
                      {order.services && order.services.length > 1 && ` +${order.services.length - 1} more`}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {typeof order.user === 'object' && order.user !== null ? order.user.name : 'Customer'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium whitespace-nowrap">{order.status}</span>
                    {etaByBooking[order._id] && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                        ETA {etaByBooking[order._id].textDuration}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 mb-4 flex-1">
                  {Array.isArray(order.services) &&
                    order.services.slice(0, 3).map((service, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-muted flex-shrink-0" />
                        <span className="truncate">{typeof service === 'object' ? service.name : service}</span>
                      </div>
                    ))}
                  {Array.isArray(order.services) && order.services.length > 3 && (
                     <div className="text-xs text-muted-foreground pl-6">+{order.services.length - 3} more services</div>
                  )}
                </div>

                {['ASSIGNED', 'ACCEPTED', 'REACHED_CUSTOMER', 'VEHICLE_PICKED'].includes(order.status) && order.location && (
                  <div className="mt-3 mb-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Pickup Location</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{order.location.address}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-border">
                  {order.status === 'ASSIGNED' ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAcceptOrder(order._id); }}
                      className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                      Accept Order
                    </button>
                  ) : (
                    <>
                      {(['ACCEPTED', 'VEHICLE_PICKED'].includes(order.status)) && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleGetDirections(order); }}
                          className="w-full py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                          <Navigation className="w-4 h-4" /> Get Directions
                        </button>
                      )}

                      <div className="flex gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleUploadClick(order._id); }}
                          className="flex-1 py-2 bg-muted rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted/80 transition-colors">
                          <Upload className="w-3.5 h-3.5" /> Upload
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openStatusDialog(order); }}
                          className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                          Update
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
      />

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Update the status for Order #{selectedOrderForStatus?.orderNumber ?? selectedOrderForStatus?._id.slice(-6).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
                <SelectItem value="Ready">Ready</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStatusUpdate}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default StaffOrdersPage;
