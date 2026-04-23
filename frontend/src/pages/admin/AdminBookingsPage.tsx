import React, { useEffect, useState } from 'react';
import { bookingService, Booking } from '@/services/bookingService';
import { socketService } from '@/services/socket';
import { toast } from 'sonner';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Car, 
  MoreVertical, 
  Store,
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Wrench,
  Eye,
  Shield
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { STATUS_LABELS, getStatusLabel } from '@/lib/statusFlow';

const AdminBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Check for query parameters whenever the location changes
    const params = new URLSearchParams(location.search);
    const dateParam = params.get('date');
    if (dateParam === 'today') {
      const todayStr = new Date().toLocaleDateString('en-GB');
      setSearchQuery(todayStr);
    }
  }, [location.search]);

  useEffect(() => {
    fetchBookings();

    // Socket Setup
    socketService.connect();
    socketService.joinRoom('admin');

    const bookingUpdatedHandler = (updatedBooking: Booking) => {
      setBookings(prev => prev.map(b => b._id === updatedBooking._id ? updatedBooking : b));
    };

    const bookingCreatedHandler = (newBooking: Booking) => {
      setBookings(prev => [newBooking, ...prev]);
      toast.success('New Booking Received!', {
        description: `Order #${newBooking.orderNumber} has been created.`,
        action: {
          label: 'View',
          onClick: () => navigate(`/admin/bookings/${newBooking._id}`)
        }
      });
    };

    const globalSyncHandler = (data: any) => {
      if (!data) return;
      const entity = (data as any).entity;
      const action = (data as any).action;
      if (entity === 'booking') {
        if (action === 'created' || action === 'updated' || action === 'deleted' || action === 'cancelled') {
          fetchBookings();
        }
      }
    };

    socketService.on('bookingUpdated', bookingUpdatedHandler);
    socketService.on('bookingCreated', bookingCreatedHandler);
    socketService.on('global:sync', globalSyncHandler);

    return () => {
        socketService.leaveRoom('admin');
        socketService.off('bookingUpdated', bookingUpdatedHandler);
        socketService.off('bookingCreated', bookingCreatedHandler);
        socketService.off('global:sync', globalSyncHandler);
    };
  }, []);

  useEffect(() => {
    let result = bookings;

    // Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'new') {
        result = result.filter(b => b.status === 'CREATED');
      } else if (statusFilter === 'active') {
        result = result.filter(b => [
          'ASSIGNED', 
          'ACCEPTED', 
          'REACHED_CUSTOMER', 
          'VEHICLE_PICKED', 
          'REACHED_MERCHANT', 
          'SERVICE_STARTED',
          'SERVICE_COMPLETED',
          'OUT_FOR_DELIVERY',
          'CAR_WASH_STARTED',
          'CAR_WASH_COMPLETED'
        ].includes(b.status));
      } else if (statusFilter === 'completed') {
        result = result.filter(b => ['DELIVERED', 'COMPLETED'].includes(b.status));
      } else if (statusFilter === 'cancelled') {
        result = result.filter(b => b.status === 'CANCELLED');
      }
    }

    // Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => {
        const matchesSearch = 
          (b._id?.toLowerCase() || '').includes(query) ||
          (b.orderNumber && String(b.orderNumber).toLowerCase().includes(query)) ||
          (typeof b.user === 'object' && b.user?.name?.toLowerCase().includes(query)) ||
          (typeof b.vehicle === 'object' && b.vehicle?.licensePlate?.toLowerCase().includes(query));
          
        const dateStr = new Date(b.date).toLocaleDateString('en-GB').toLowerCase();
        const matchesDate = dateStr.includes(query);
        
        return matchesSearch || matchesDate;
      });
    }

    setFilteredBookings(result);
  }, [bookings, searchQuery, statusFilter]);

  const fetchBookings = async () => {
    try {
      const data = await bookingService.getAllBookings();
      setBookings(data);
    } catch (error) {
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string, services: any[] = []) => {
    const styles: Record<string, string> = {
      'CREATED': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'ASSIGNED': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'ACCEPTED': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      'REACHED_CUSTOMER': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      'VEHICLE_PICKED': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'REACHED_MERCHANT': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      'SERVICE_STARTED': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'SERVICE_COMPLETED': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'OUT_FOR_DELIVERY': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      'DELIVERED': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      'COMPLETED': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      'CANCELLED': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      'CAR_WASH_STARTED': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'CAR_WASH_COMPLETED': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {getStatusLabel(status, services)}
      </span>
    );
  };

  return (
    <div className="space-y-4 p-4 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold mb-1">Booking Management</h1>
          <p className="text-sm text-muted-foreground">Manage service requests and order flow.</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-card p-3 lg:p-4 rounded-xl border border-border">
        <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
          {[
            { id: 'all', label: 'All Bookings' },
            { id: 'new', label: 'New' },
            { id: 'active', label: 'In Progress' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ID, Customer, or Vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="text-center py-12">Loading bookings...</div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-3 font-medium w-20">Order #</th>
                    <th className="p-3 font-medium w-48">Customer & Vehicle</th>
                    <th className="p-3 font-medium w-40">Service Info</th>
                    <th className="p-3 font-medium w-32">Date & Slot</th>
                    <th className="p-3 font-medium w-28">Assigned To</th>
                    <th className="p-3 font-medium w-24">Status</th>
                    <th className="p-3 font-medium w-20 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredBookings.map((booking) => (
                    <tr 
                      key={booking._id} 
                      className={`${
                        booking.status === 'CREATED' 
                          ? 'bg-red-50/50 hover:bg-red-100/50 dark:bg-red-950/10 dark:hover:bg-red-900/20' 
                          : 'hover:bg-muted/30'
                      } transition-colors cursor-pointer`}
                      onClick={() => navigate(`/admin/bookings/${booking._id}`)}
                    >
                      <td className="p-3">
                        <span className="font-mono text-xs text-muted-foreground">#{booking.orderNumber ?? booking._id.slice(-6).toUpperCase()}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm truncate max-w-[180px]">{(booking.user && typeof booking.user === 'object' && 'name' in booking.user && booking.user.name) || 'Unknown User'}</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Car className="w-3 h-3 shrink-0" />
                            <span className="truncate">{(booking.vehicle && typeof booking.vehicle === 'object' && 'model' in booking.vehicle && booking.vehicle.model) || 'Unknown Vehicle'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="max-w-[150px] truncate text-sm" title={Array.isArray(booking.services) ? booking.services.map(s => typeof s === 'object' ? s.name : 'Service').join(', ') : ''}>
                           {Array.isArray(booking.services) 
                              ? booking.services.map(s => typeof s === 'object' ? s.name : 'Service').join(', ') 
                              : 'Service'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1 text-xs">
                             <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                             <span className="truncate">{new Date(booking.date).toLocaleDateString('en-GB')}</span>
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                             <Clock className="w-3 h-3 shrink-0" /> 
                             <span>{new Date(booking.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="max-w-[100px] truncate">
                          {(() => {
                            // Check if this is a car wash or essentials service
                            const isCarWashService = Array.isArray(booking.services) && 
                              booking.services.some(service => 
                                typeof service === 'object' && (
                                  service.category === 'Car Wash' || 
                                  service.category === 'Wash' ||
                                  service.category === 'Essentials'
                                )
                              );
                            
                            if (isCarWashService) {
                              return booking.carWash?.staffAssigned?.name || <span className="text-muted-foreground italic">Unassigned</span>;
                            } else {
                              return booking.pickupDriver?.name || <span className="text-muted-foreground italic">Unassigned</span>;
                            }
                          })()}
                        </div>
                      </td>
                      <td className="p-3">
                        {getStatusBadge(booking.status, booking.services)}
                      </td>
                      <td className="p-3 font-medium text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm">₹{booking.totalAmount}</span>
                          {(() => {
                            // Check if this is a battery/tire service with warranty
                            const isBatteryOrTireService = Array.isArray(booking.services) && 
                              booking.services.some((service: any) => 
                                ['Battery', 'Tyres', 'Tyre & Battery'].includes(service.category)
                              );
                            const hasWarranty = isBatteryOrTireService && booking.batteryTire?.warranty;
                            
                            if (hasWarranty) {
                              return (
                                <span className="text-xs text-green-600 inline-flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  {booking.batteryTire.warranty.warrantyMonths}m warranty
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {filteredBookings.length === 0 && (
                     <tr>
                       <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No bookings found matching your filters.
                       </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredBookings.map((booking) => (
              <div 
                key={booking._id} 
                className={`${
                  booking.status === 'CREATED' 
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' 
                    : 'bg-card border-border'
                } p-4 rounded-xl border shadow-sm active:scale-[0.98] transition-all`}
                onClick={() => navigate(`/admin/bookings/${booking._id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs text-muted-foreground">#{booking.orderNumber ?? booking._id.slice(-6).toUpperCase()}</span>
                    <span className="font-bold text-sm mt-0.5">{(booking.user && typeof booking.user === 'object' && 'name' in booking.user && booking.user.name) || 'Unknown User'}</span>
                  </div>
                  {getStatusBadge(booking.status, booking.services)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Car className="w-4 h-4 shrink-0" />
                    <span className="truncate">{(booking.vehicle && typeof booking.vehicle === 'object' && 'model' in booking.vehicle && booking.vehicle.model) || 'Unknown Vehicle'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wrench className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {Array.isArray(booking.services) 
                        ? booking.services.map(s => typeof s === 'object' ? s.name : 'Service').join(', ') 
                        : 'Service'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span>{new Date(booking.date).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span>{new Date(booking.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                    </div>
                    <span className="font-bold text-primary">₹{booking.totalAmount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(() => {
                        const isCarWashService = Array.isArray(booking.services) && 
                          booking.services.some(service => 
                            typeof service === 'object' && (
                              service.category === 'Car Wash' || 
                              service.category === 'Wash' ||
                              service.category === 'Essentials'
                            )
                          );
                        
                        if (isCarWashService) {
                          return booking.carWash?.staffAssigned?.name || 'Unassigned';
                        } else {
                          return booking.pickupDriver?.name || 'Unassigned';
                        }
                      })()}
                    </span>
                  </div>
                  <button className="text-xs font-medium text-primary flex items-center gap-1">
                    View Details <Eye className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {filteredBookings.length === 0 && (
               <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  No bookings found matching your filters.
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingsPage;
