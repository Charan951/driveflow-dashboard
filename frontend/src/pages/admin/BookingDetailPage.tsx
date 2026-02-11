import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService, Booking } from '@/services/bookingService';
import { userService, User } from '@/services/userService';
import { serviceService, Service } from '@/services/serviceService';
import { socketService } from '@/services/socket';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Calendar, 
  Car, 
  User as UserIcon, 
  MapPin, 
  Truck, 
  Wrench, 
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Store,
  Shield,
  Signal
} from 'lucide-react';
import * as turf from '@turf/turf';

const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [merchants, setMerchants] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);

  // Assignment States
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;
        const [bookingData, usersData] = await Promise.all([
          bookingService.getBookingById(id),
          userService.getAllUsers()
        ]);
        setBooking(bookingData);
        
        // Helper to sort staff by Online Status and Proximity
        const sortStaff = (staffList: User[]) => {
            const targetLat = typeof bookingData.location === 'object' ? bookingData.location.lat : null;
            const targetLng = typeof bookingData.location === 'object' ? bookingData.location.lng : null;

            return [...staffList].sort((a, b) => {
                // 1. Online Priority
                if (a.isOnline && !b.isOnline) return -1;
                if (!a.isOnline && b.isOnline) return 1;

                // 2. Proximity (if location available)
                if (targetLat && targetLng && a.location?.lat && a.location?.lng && b.location?.lat && b.location?.lng) {
                     const from = turf.point([targetLng, targetLat]);
                     const toA = turf.point([a.location.lng, a.location.lat]);
                     const toB = turf.point([b.location.lng, b.location.lat]);
                     return turf.distance(from, toA) - turf.distance(from, toB);
                }
                return 0;
            });
        };

        // Helper to sort merchants by Open Status and Proximity
        const sortMerchants = (merchantList: User[]) => {
            const targetLat = typeof bookingData.location === 'object' ? bookingData.location.lat : null;
            const targetLng = typeof bookingData.location === 'object' ? bookingData.location.lng : null;

            return [...merchantList].sort((a, b) => {
                // 1. Open Shop Priority (Active/Open shops first)
                // Note: isShopOpen defaults to true usually, but check explicit false
                const aOpen = a.isShopOpen !== false; 
                const bOpen = b.isShopOpen !== false;
                
                if (aOpen && !bOpen) return -1;
                if (!aOpen && bOpen) return 1;

                // 2. Proximity (if location available)
                if (targetLat && targetLng && a.location?.lat && a.location?.lng && b.location?.lat && b.location?.lng) {
                     const from = turf.point([targetLng, targetLat]);
                     const toA = turf.point([a.location.lng, a.location.lat]);
                     const toB = turf.point([b.location.lng, b.location.lat]);
                     return turf.distance(from, toA) - turf.distance(from, toB);
                }
                return 0;
            });
        };

        // Populate lists for assignment
        setMerchants(sortMerchants(usersData.filter((u: User) => u.role === 'merchant')));

        setDrivers(sortStaff(usersData.filter((u: User) => 
          u.role === 'staff' && (!u.subRole || u.subRole === 'Driver')
        )));
        
        setTechnicians(sortStaff(usersData.filter((u: User) => 
          u.role === 'staff' && (!u.subRole || u.subRole === 'Technician')
        ))); 

        // Helper to safely get ID
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getResourceId = (resource: any) => {
           if (!resource) return '';
           if (typeof resource === 'string') return resource;
           if (typeof resource === 'object' && resource._id) return resource._id;
           return '';
        };

        // Set initial values
        if (bookingData.merchant) setSelectedMerchant(getResourceId(bookingData.merchant));
        if (bookingData.pickupDriver) setSelectedDriver(getResourceId(bookingData.pickupDriver));
        if (bookingData.technician) setSelectedTechnician(getResourceId(bookingData.technician));

      } catch (error) {
        console.error(error);
        toast.error('Failed to load booking details');
        navigate('/admin/bookings');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    
    // Socket Connection
    socketService.connect();
    socketService.joinRoom('admin');

    socketService.on('bookingUpdated', (updatedBooking: Booking) => {
      if (updatedBooking._id === id) {
         setBooking(updatedBooking);
         // toast.info(`Status updated: ${updatedBooking.status}`);
      }
    });

    return () => {
       socketService.leaveRoom('admin');
       socketService.off('bookingUpdated');
    };
  }, [id]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!booking) return;
    try {
      await bookingService.updateBookingStatus(booking._id, newStatus);
      setBooking({ ...booking, status: newStatus as Booking['status'] });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAssignment = async () => {
    if (!booking) return;
    try {
      await bookingService.assignBooking(booking._id, {
        merchantId: selectedMerchant || undefined,
        driverId: selectedDriver || undefined,
        technicianId: selectedTechnician || undefined
      });
      
      // Refetch to get populated data back
      const updatedBooking = await bookingService.getBookingById(booking._id);
      setBooking(updatedBooking);
      toast.success('Assignments updated successfully');
    } catch (error) {
      toast.error('Failed to update assignments');
    }
  };

  if (isLoading || !booking) {
    return <div className="p-8 text-center">Loading booking details...</div>;
  }

  const customer = booking.user as unknown as User;
  const vehicle = booking.vehicle as unknown as Vehicle;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/admin/bookings')}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Booking #{booking._id.slice(-6).toUpperCase()}
            <span className={`px-3 py-1 rounded-full text-xs font-medium 
              ${booking.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 
                booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                'bg-blue-100 text-blue-800'}`}>
              {booking.status}
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">Created on {new Date(booking.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer & Vehicle */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary" /> Customer Details
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Name:</span> {customer?.name}</p>
              <p><span className="text-muted-foreground">Email:</span> {customer?.email}</p>
              <p><span className="text-muted-foreground">Phone:</span> {customer?.phone || 'N/A'}</p>
              <button 
                onClick={() => navigate(`/admin/users/${customer?._id}`)}
                className="text-primary hover:underline text-xs"
              >
                View Profile
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" /> Vehicle Details
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Vehicle:</span> {vehicle?.make} {vehicle?.model}</p>
              <p><span className="text-muted-foreground">Plate:</span> {vehicle?.licensePlate}</p>
              <p><span className="text-muted-foreground">Type:</span> {vehicle?.type}</p>
              <button 
                onClick={() => navigate(`/admin/vehicles/${vehicle?._id}`)}
                className="text-primary hover:underline text-xs"
              >
                View Vehicle
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
             <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Payment Info
             </h3>
             <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                   <span className="text-muted-foreground">Amount:</span>
                   <span className="font-bold">₹{booking.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-muted-foreground">Status:</span>
                   <span className={`capitalize ${booking.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                      {booking.paymentStatus}
                   </span>
                </div>
             </div>
          </div>
        </div>

        {/* Center/Right Column - Booking Details & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Details */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-lg mb-4">Service Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-muted-foreground uppercase font-medium">Services Requested</label>
                <div className="mt-2 space-y-1">
                  {Array.isArray(booking.services) && (booking.services as Service[]).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Wrench className="w-4 h-4 text-muted-foreground" />
                      <span>{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                   <label className="text-xs text-muted-foreground uppercase font-medium">Scheduled Date</label>
                   <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{new Date(booking.date).toLocaleDateString()}</span>
                   </div>
                </div>
                <div>
                   <label className="text-xs text-muted-foreground uppercase font-medium">Pickup Required</label>
                   <div className="flex items-center gap-2 mt-1">
                      {booking.pickupRequired ? (
                         <span className="flex items-center gap-1 text-amber-600 text-sm font-medium">
                            <Truck className="w-4 h-4" /> Yes, Pickup Requested
                         </span>
                      ) : (
                         <span className="text-sm">No</span>
                      )}
                   </div>
                </div>
                {booking.location && (
                  <div>
                     <label className="text-xs text-muted-foreground uppercase font-medium">Pickup Location</label>
                     <div className="mt-1">
                        {typeof booking.location === 'string' ? (
                           <span className="text-sm">{booking.location}</span>
                        ) : (
                           <div>
                              <p className="text-sm">{booking.location.address}</p>
                              {booking.location.lat && booking.location.lng && (
                                 <a 
                                    href={`https://www.google.com/maps?q=${booking.location.lat},${booking.location.lng}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                 >
                                    <MapPin className="w-3 h-3" /> View on Map
                                 </a>
                              )}
                           </div>
                        )}
                     </div>
                  </div>
                )}
              </div>
            </div>
            {booking.notes && (
               <div className="mt-4 pt-4 border-t border-border">
                  <label className="text-xs text-muted-foreground uppercase font-medium">Customer Notes</label>
                  <p className="mt-1 text-sm italic">"{booking.notes}"</p>
               </div>
            )}
          </div>

          {/* Assignment Panel */}
          <div className="bg-card rounded-2xl border border-border p-6">
             <h3 className="font-semibold text-lg mb-4 flex items-center justify-between">
                <span>Assignments & Operations</span>
                <button 
                  onClick={handleAssignment}
                  className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-lg hover:bg-primary/90"
                >
                   Save Assignments
                </button>
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                   <label className="text-sm font-medium flex items-center gap-2">
                      <Store className="w-4 h-4 text-muted-foreground" /> Merchant/Workshop
                   </label>
                   <select 
                      className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                      value={selectedMerchant}
                      onChange={(e) => setSelectedMerchant(e.target.value)}
                   >
                      <option value="">Select Merchant...</option>
                      {merchants.map(m => {
                         let label = m.name;
                         // Add Open/Closed status
                         if (m.isShopOpen === false) label += " (Closed 🔴)";
                         else label += " (Open 🟢)";

                         // Add Distance
                         if (booking?.location && typeof booking.location === 'object' && booking.location.lat && m.location?.lat) {
                            try {
                               const from = turf.point([booking.location.lng!, booking.location.lat]);
                               const to = turf.point([m.location.lng!, m.location.lat]);
                               const distance = turf.distance(from, to);
                               label += ` - ${distance.toFixed(1)} km`;
                            } catch (e) {
                               // ignore error
                            }
                         }
                         return <option key={m._id} value={m._id}>{label}</option>
                      })}
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-medium flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" /> Pickup Driver
                   </label>
                   <select 
                      className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                      value={selectedDriver}
                      onChange={(e) => setSelectedDriver(e.target.value)}
                   >
                      <option value="">Select Driver...</option>
                      {drivers.map(d => {
                        let label = d.name;
                        if (d.isOnline) label += " 🟢 (Online)";
                        if (booking?.location && typeof booking.location === 'object' && booking.location.lat && d.location?.lat) {
                           try {
                              const from = turf.point([booking.location.lng!, booking.location.lat!]);
                              const to = turf.point([d.location.lng!, d.location.lat!]);
                              const dist = turf.distance(from, to, { units: 'kilometers' });
                              label += ` - ${dist.toFixed(1)}km`;
                           } catch (e) { /* ignore */ }
                        }
                        return <option key={d._id} value={d._id}>{label}</option>;
                      })}
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-medium flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-muted-foreground" /> Technician
                   </label>
                   <select 
                      className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                      value={selectedTechnician}
                      onChange={(e) => setSelectedTechnician(e.target.value)}
                   >
                      <option value="">Select Technician...</option>
                      {technicians.map(t => {
                        let label = t.name;
                        if (t.isOnline) label += " 🟢 (Online)";
                         if (booking?.location && typeof booking.location === 'object' && booking.location.lat && t.location?.lat) {
                           try {
                              const from = turf.point([booking.location.lng!, booking.location.lat!]);
                              const to = turf.point([t.location.lng!, t.location.lat!]);
                              const dist = turf.distance(from, to, { units: 'kilometers' });
                              label += ` - ${dist.toFixed(1)}km`;
                           } catch (e) { /* ignore */ }
                        }
                        return <option key={t._id} value={t._id}>{label}</option>;
                      })}
                   </select>
                </div>
             </div>
          </div>

          {/* Status Workflow */}
          <div className="bg-card rounded-2xl border border-border p-6">
             <h3 className="font-semibold text-lg mb-4">Workflow Actions</h3>
             <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Created', value: 'CREATED' },
                  { label: 'Assigned', value: 'ASSIGNED' },
                  { label: 'Accepted', value: 'ACCEPTED' },
                  { label: 'Vehicle Picked', value: 'VEHICLE_PICKED' },
                  { label: 'Reached Merchant', value: 'REACHED_MERCHANT' },
                  { label: 'Vehicle At Merchant', value: 'VEHICLE_AT_MERCHANT' },
                  { label: 'Job Card Created', value: 'JOB_CARD' },
                  { label: 'Service Started', value: 'SERVICE_STARTED' },
                  { label: 'Service Completed', value: 'SERVICE_COMPLETED' },
                  { label: 'Out For Delivery', value: 'OUT_FOR_DELIVERY' },
                  { label: 'Delivered', value: 'DELIVERED' },
                  { label: 'Cancelled', value: 'CANCELLED' }
                ].map((item) => (
                   <button
                      key={item.value}
                      onClick={() => handleStatusUpdate(item.value)}
                      disabled={booking.status === item.value}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors
                         ${booking.status === item.value 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'hover:bg-muted border-border'}`}
                   >
                      {item.label}
                   </button>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailPage;
