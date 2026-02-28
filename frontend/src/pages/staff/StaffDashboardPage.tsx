import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, DollarSign, CheckCircle, Upload } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { bookingService, Booking } from '@/services/bookingService';
import { uploadService } from '@/services/uploadService';
import CounterCard from '@/components/CounterCard';
import { useTracking } from '@/hooks/use-tracking';
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

const StaffDashboardPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    todaysOrders: 0,
    pending: 0,
    completed: 0,
    earnings: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedOrderForUpload, setSelectedOrderForUpload] = useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<Booking | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const { setActiveBookingId } = useTracking();

  const handleUploadClick = (orderId: string) => {
    setSelectedOrderForUpload(orderId);
    fileInputRef.current?.click();
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
      await bookingService.updateBookingStatus(selectedOrderForStatus._id, newStatus);
      if (['ACCEPTED','REACHED_CUSTOMER','VEHICLE_PICKED','OUT_FOR_DELIVERY'].includes(newStatus)) {
        setActiveBookingId(selectedOrderForStatus._id);
      }
      toast.dismiss(loadingToast);
      toast.success('Status updated successfully');
      setStatusDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await bookingService.getMyBookings();
      setBookings(data);

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      
      const activeStatuses = [
        'ASSIGNED',
        'ACCEPTED',
        'REACHED_CUSTOMER',
        'VEHICLE_PICKED',
        'REACHED_MERCHANT',
        'VEHICLE_AT_MERCHANT',
        'JOB_CARD',
        'SERVICE_STARTED',
        'SERVICE_COMPLETED',
        'OUT_FOR_DELIVERY'
      ];

      const todaysOrders = data.filter(b => b.date && b.date.startsWith(today)).length;
      const pending = data.filter(b => activeStatuses.includes(b.status)).length;
      const completed = data.filter(b => ['SERVICE_COMPLETED', 'DELIVERED'].includes(b.status)).length;
      const earnings = data
        .filter(b => ['SERVICE_COMPLETED', 'DELIVERED'].includes(b.status))
        .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

      setStats({
        todaysOrders,
        pending,
        completed,
        earnings
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]">Loading...</div>;
  }

  // Filter active orders to display (excluding completed/cancelled for the active list)
  const activeStatuses = [
    'ASSIGNED',
    'ACCEPTED',
    'REACHED_CUSTOMER',
    'VEHICLE_PICKED',
    'REACHED_MERCHANT',
    'VEHICLE_AT_MERCHANT',
    'JOB_CARD',
    'SERVICE_STARTED',
    'SERVICE_COMPLETED',
    'OUT_FOR_DELIVERY'
  ];
  
  const STATUS_LABELS: Record<string, string> = {
    'CREATED': 'Created',
    'ASSIGNED': 'Assigned',
    'ACCEPTED': 'Accepted',
    'REACHED_CUSTOMER': 'Reached Location',
    'VEHICLE_PICKED': 'Vehicle Picked',
    'REACHED_MERCHANT': 'Reached Garage',
    'VEHICLE_AT_MERCHANT': 'Vehicle at Garage',
    'JOB_CARD': 'Job Card Created',
    'SERVICE_STARTED': 'Service Started',
    'SERVICE_COMPLETED': 'Service Completed',
    'OUT_FOR_DELIVERY': 'Out for Delivery',
    'DELIVERED': 'Delivered',
    'CANCELLED': 'Cancelled'
  };

  const activeOrders = bookings.filter(b => activeStatuses.includes(b.status));

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={staggerItem}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Staff Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Overview of your assigned jobs and live orders
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={staggerItem} className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <CounterCard label="Today's Orders" value={stats.todaysOrders} icon={<Package className="w-5 h-5 text-primary" />} delay={0} />
            <CounterCard label="Pending" value={stats.pending} icon={<Clock className="w-5 h-5 text-primary" />} delay={1} />
            <CounterCard label="Completed" value={stats.completed} icon={<CheckCircle className="w-5 h-5 text-primary" />} delay={2} />
            <CounterCard label="Job Value" value={`₹${stats.earnings}`} icon={<DollarSign className="w-5 h-5 text-primary" />} delay={3} />
          </div>

          <div>
            <h2 className="font-semibold text-lg mb-4">Active Orders</h2>
            {activeOrders.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium">No active orders</h3>
                <p className="text-muted-foreground">You don't have any active orders assigned.</p>
              </div>
            ) : (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
                {activeOrders.map((order) => (
                  <motion.div key={order._id} variants={staggerItem} className="bg-card rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Order #{order.orderNumber ?? order._id.slice(-6).toUpperCase()}</p>
                        <h3 className="font-semibold">
                          {order.services && order.services.length > 0
                            ? (typeof order.services[0] === 'string' ? order.services[0] : order.services[0].name)
                            : 'Service'}
                          {order.services && order.services.length > 1 && ` +${order.services.length - 1} more`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {typeof order.user === 'object' && order.user !== null ? order.user.name : 'Customer'}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">{STATUS_LABELS[order.status] || order.status}</span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {Array.isArray(order.services) &&
                        order.services.map((service, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="w-4 h-4 text-muted" />
                            {typeof service === 'object' ? service.name : service}
                          </div>
                        ))}
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleUploadClick(order._id)}
                        className="flex-1 py-3 bg-muted rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-muted/80 transition-colors">
                        <Upload className="w-4 h-4" /> Upload Photos
                      </button>
                      <button 
                        onClick={() => openStatusDialog(order)}
                        className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
                        Update Status
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="space-y-6">
        </motion.div>
      </div>

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
                {activeStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status] || status}
                  </SelectItem>
                ))}
                <SelectItem value="DELIVERED">Delivered</SelectItem>
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

export default StaffDashboardPage;
