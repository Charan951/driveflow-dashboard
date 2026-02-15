import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User as UserIcon, Calendar, Wrench, Car, AlertTriangle, MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { bookingService, Booking } from '../../services/bookingService';
import { socketService } from '@/services/socket';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;
import { Service } from '@/services/serviceService';
import { Vehicle } from '@/services/vehicleService';
import { User } from '@/services/userService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Panels
import StatusControlPanel from '../../components/merchant/StatusControlPanel';
import InspectionPanel from '../../components/merchant/InspectionPanel';
import ServiceExecutionPanel from '../../components/merchant/ServiceExecutionPanel';
import QCPanel from '../../components/merchant/QCPanel';
import BillUploadPanel from '../../components/merchant/BillUploadPanel';
import MediaUploadPanel from '../../components/merchant/MediaUploadPanel';
import ChatPanel from '../../components/merchant/ChatPanel';

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
  const [staffLocation, setStaffLocation] = useState<{lat: number, lng: number} | null>(null);

  const fetchBooking = async () => {
    if (!id) return;
    try {
      const data = await bookingService.getBookingById(id);
      setBooking(data);
    } catch (error) {
      toast.error('Failed to load order details');
      navigate('/merchant/orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();

    // Socket Connection for Live Tracking
    if (id) {
      socketService.connect();
      socketService.joinRoom(`booking_${id}`);

      socketService.on('liveLocation', (data) => {
        if (data.lat && data.lng && data.role === 'staff') {
          setStaffLocation({ lat: data.lat, lng: data.lng });
        }
      });

      socketService.on('bookingUpdated', (updatedBooking: Booking) => {
        if (updatedBooking._id === id) {
             setBooking(updatedBooking);
        }
      });

      return () => {
        socketService.leaveRoom(`booking_${id}`);
        socketService.off('liveLocation');
        socketService.off('bookingUpdated');
      };
    }
  }, [id, navigate]);

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
      className="max-w-7xl mx-auto space-y-6 pb-10"
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
            <span>{new Date(booking.date).toLocaleDateString()}</span>
            <span>•</span>
            <span className="font-medium text-primary">{booking.status}</span>
          </div>
        </div>
      </motion.div>

      {/* Status & Workflow Control */}
      <motion.div variants={itemVariants}>
        <StatusControlPanel booking={booking} onUpdate={fetchBooking} />
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="inspection">Inspection</TabsTrigger>
                <TabsTrigger value="service">Service</TabsTrigger>
                <TabsTrigger value="qc">QC Check</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Order Info Card */}
                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4">Order Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <Car className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Vehicle Details</p>
                                        <p className="font-medium">{(booking.vehicle as unknown as Vehicle)?.licensePlate || 'N/A'}</p>
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
                                        <Calendar className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Scheduled Date</p>
                                        <p className="font-medium">{new Date(booking.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                {booking.location && (
                                  <div className="flex items-start gap-3">
                                      <div className="p-2 bg-indigo-50 rounded-lg">
                                          <MapPin className="w-5 h-5 text-indigo-600" />
                                      </div>
                                      <div>
                                          <p className="text-sm font-medium text-muted-foreground">Pickup Location</p>
                                          {typeof booking.location === 'string' ? (
                                              <p className="font-medium text-sm">{booking.location}</p>
                                          ) : (
                                              <div>
                                                  <p className="font-medium text-sm">{booking.location.address}</p>
                                                  {booking.location.lat && booking.location.lng && (
                                                      <a 
                                                          href={`https://www.google.com/maps?q=${booking.location.lat},${booking.location.lng}`} 
                                                          target="_blank" 
                                                          rel="noreferrer"
                                                          className="text-xs text-blue-600 hover:underline"
                                                      >
                                                          View on Map
                                                      </a>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                )}
                            </div>
                            
                            {booking.notes && (
                                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Customer Notes / Issue</p>
                                    <p className="text-sm">{booking.notes}</p>
                                </div>
                            )}

                            {booking.revisit?.isRevisit && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                                    <div>
                                        <p className="font-semibold text-red-800">Revisit Order</p>
                                        <p className="text-sm text-red-700">This is a revisit for a previous service. Please prioritize.</p>
                                        <p className="text-xs text-red-600 mt-1">Reason: {booking.revisit.reason}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Live Tracking Map for Staff (pickup bookings) */}
                        {booking.pickupRequired && (([
                          'ASSIGNED',
                          'ACCEPTED',
                          'REACHED_CUSTOMER',
                          'VEHICLE_PICKED',
                          'REACHED_MERCHANT',
                          'OUT_FOR_DELIVERY'
                        ].includes(booking.status)) || staffLocation) && (
                          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-border flex justify-between items-center">
                              <h3 className="font-semibold flex items-center gap-2">
                                <Navigation className="w-5 h-5 text-primary" />
                                Live Staff Tracking
                              </h3>
                              {staffLocation && <span className="text-xs text-green-600 font-medium animate-pulse">● Live</span>}
                            </div>
                            <div className="h-64 w-full relative bg-muted">
                               {staffLocation ? (
                                 <MapContainer 
                                    center={[staffLocation.lat, staffLocation.lng]} 
                                    zoom={15} 
                                    style={{ height: '100%', width: '100%' }}
                                    zoomControl={false}
                                 >
                                    <TileLayer
                                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    <Marker position={[staffLocation.lat, staffLocation.lng]}>
                                      <Popup>
                                        Staff is here
                                      </Popup>
                                    </Marker>
                                 </MapContainer>
                               ) : (
                                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                   <MapPin className="w-8 h-8 mb-2 opacity-50" />
                                   <p className="text-sm">Waiting for live location...</p>
                                 </div>
                               )}
                            </div>
                          </div>
                        )}

                        {/* Chat */}
                        <ChatPanel bookingId={booking._id} />
                    </div>
                </div>
            </TabsContent>

            {/* Inspection Tab */}
            <TabsContent value="inspection" className="mt-6">
                <InspectionPanel booking={booking} onUpdate={fetchBooking} />
            </TabsContent>

            {/* Service Tab */}
            <TabsContent value="service" className="space-y-6 mt-6">
                <ServiceExecutionPanel booking={booking} onUpdate={fetchBooking} />
                <MediaUploadPanel bookingId={booking._id} booking={booking} onUploadComplete={fetchBooking} />
            </TabsContent>

            {/* QC Tab */}
            <TabsContent value="qc" className="mt-6">
                <QCPanel booking={booking} onUpdate={fetchBooking} />
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="mt-6">
                <BillUploadPanel booking={booking} onUploadComplete={fetchBooking} />
            </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};

export default OrderDetail;
