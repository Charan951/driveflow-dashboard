import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User as UserIcon, Calendar, Wrench, CheckCircle, Car } from 'lucide-react';
import { toast } from 'sonner';
import { bookingService, Booking } from '../../services/bookingService';
import { serviceService, Service } from '@/services/serviceService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { userService, User } from '@/services/userService';
import ChatPanel from '../../components/merchant/ChatPanel';
import MediaUploadPanel from '../../components/merchant/MediaUploadPanel';
import BillUploadPanel from '../../components/merchant/BillUploadPanel';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaUploaded, setMediaUploaded] = useState(false);
  const [billUploaded, setBillUploaded] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) return;
      try {
        const data = await bookingService.getBookingById(id);
        setBooking(data);
        // Check if already uploaded (mock check based on status or existing fields if they existed)
        if (data.status === 'Ready' || data.status === 'Delivered') {
            setMediaUploaded(true);
            setBillUploaded(true);
        }
      } catch (error) {
        toast.error('Failed to load order details');
        navigate('/merchant/orders');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id, navigate]);

  const handleMarkComplete = async () => {
    if (!mediaUploaded || !billUploaded) {
        toast.error('Please upload both service media and bill before completing');
        return;
    }

    setCompleting(true);
    try {
        if (!id) return;
        console.log('Marking order as complete:', id);
        await bookingService.updateBookingStatus(id, 'Ready');
        toast.success('Order marked as complete!');
        navigate('/merchant/orders');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Error marking complete:', error);
        toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
        setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/merchant/orders')}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{booking._id?.slice(-6).toUpperCase()}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                booking.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}>
                {booking.status}
            </span>
            <span>•</span>
            <span>{new Date(booking.date).toLocaleDateString()}</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details & Chat */}
        <div className="lg:col-span-2 space-y-6">
            {/* Order Info Card */}
            <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Order Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Car className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Vehicle Details</p>
                            <p className="font-medium">{(booking.vehicle as unknown as Vehicle)?.registrationNumber || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{(booking.vehicle as unknown as Vehicle)?.make} {(booking.vehicle as unknown as Vehicle)?.model}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <UserIcon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Customer</p>
                            <p className="font-medium">{(booking.user as unknown as User)?.name || 'Guest User'}</p>
                            {/* Phone number hidden as per guardrails */}
                            <p className="text-xs text-muted-foreground italic">Contact hidden (Privacy)</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <Wrench className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Service Category</p>
                            <p className="font-medium">
                                {Array.isArray(booking.services) 
                                    ? (booking.services as unknown as Service[]).map((s) => s.name).join(', ') 
                                    : 'General Service'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <UserIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Assigned Staff</p>
                            <p className="font-medium">Rahul Kumar</p>
                            <p className="text-xs text-muted-foreground">Head Mechanic</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Media Upload */}
            <motion.div variants={itemVariants}>
                <MediaUploadPanel 
                    bookingId={booking._id} 
                    onUploadComplete={() => setMediaUploaded(true)} 
                />
            </motion.div>

            {/* Communication Panel */}
            <motion.div variants={itemVariants}>
                <ChatPanel bookingId={booking._id} />
            </motion.div>
        </div>

        {/* Right Column - Actions & Bill */}
        <div className="space-y-6">
            {/* Action Card */}
            <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Actions</h2>
                <button
                    onClick={handleMarkComplete}
                    disabled={!mediaUploaded || !billUploaded || completing || ['Ready', 'Delivered', 'Completed'].includes(booking.status)}
                    className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                        ['Ready', 'Delivered', 'Completed'].includes(booking.status)
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : mediaUploaded && billUploaded 
                                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-green-500/30' 
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                >
                    {completing ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : ['Ready', 'Delivered', 'Completed'].includes(booking.status) ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <CheckCircle className="w-5 h-5" />
                    )}
                    {['Ready', 'Delivered', 'Completed'].includes(booking.status) ? 'Service Completed' : 'Mark Service Complete'}
                </button>
                {!mediaUploaded && !['Ready', 'Delivered', 'Completed'].includes(booking.status) && (
                    <p className="text-xs text-red-500 mt-2 text-center">* Upload Service Media (Before/After) required</p>
                )}
                {!billUploaded && !['Ready', 'Delivered', 'Completed'].includes(booking.status) && (
                    <p className="text-xs text-red-500 mt-1 text-center">* Bill Upload required</p>
                )}
            </motion.div>

            {/* Bill Upload */}
            <motion.div variants={itemVariants}>
                <BillUploadPanel 
                    bookingId={booking._id} 
                    onUploadComplete={() => setBillUploaded(true)} 
                />
            </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default OrderDetail;
