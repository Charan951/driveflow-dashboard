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
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS } from '@/lib/statusFlow';

const AdminBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchBookings();

    // Socket Setup
    socketService.connect();
    socketService.joinRoom('admin');

    socketService.on('bookingUpdated', (updatedBooking: Booking) => {
       setBookings(prev => prev.map(b => b._id === updatedBooking._id ? updatedBooking : b));
    });

    return () => {
        socketService.leaveRoom('admin');
        socketService.off('bookingUpdated');
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
          'VEHICLE_AT_MERCHANT', 
          'SERVICE_STARTED',
          'SERVICE_COMPLETED',
          'OUT_FOR_DELIVERY'
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
      result = result.filter(b => 
        b._id.toLowerCase().includes(query) ||
        (b.orderNumber && String(b.orderNumber).toLowerCase().includes(query)) ||
        (typeof b.user === 'object' && b.user.name.toLowerCase().includes(query)) ||
        (typeof b.vehicle === 'object' && b.vehicle.licensePlate.toLowerCase().includes(query))
      );
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'CREATED': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'ASSIGNED': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'ACCEPTED': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      'REACHED_CUSTOMER': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      'VEHICLE_PICKED': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'REACHED_MERCHANT': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      'VEHICLE_AT_MERCHANT': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
      'SERVICE_STARTED': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'SERVICE_COMPLETED': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'OUT_FOR_DELIVERY': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      'DELIVERED': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      'COMPLETED': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      'CANCELLED': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Booking Management</h1>
          <p className="text-muted-foreground">Manage service requests and order flow.</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-card p-4 rounded-xl border border-border">
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
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-96">
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
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[1000px]">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-4 font-medium">Order #</th>
                  <th className="p-4 font-medium">Customer & Vehicle</th>
                  <th className="p-4 font-medium">Service Info</th>
                  <th className="p-4 font-medium">Date & Slot</th>
                  <th className="p-4 font-medium">Assigned To</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-xs text-muted-foreground">#{booking.orderNumber ?? booking._id.slice(-6).toUpperCase()}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{(booking.user && typeof booking.user === 'object' && 'name' in booking.user && booking.user.name) || 'Unknown User'}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Car className="w-3 h-3" />
                          {(booking.vehicle && typeof booking.vehicle === 'object' && 'model' in booking.vehicle && booking.vehicle.model) || 'Unknown Vehicle'}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="max-w-[200px] truncate" title={Array.isArray(booking.services) ? booking.services.map(s => typeof s === 'object' ? s.name : 'Service').join(', ') : ''}>
                         {Array.isArray(booking.services) 
                            ? booking.services.map(s => typeof s === 'object' ? s.name : 'Service').join(', ') 
                            : 'Service'}
                      </div>
                      {booking.pickupRequired && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                          <Truck className="w-3 h-3" /> Pickup Req.
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1">
                           <Calendar className="w-3 h-3 text-muted-foreground" />
                           {new Date(booking.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                           <Clock className="w-3 h-3" /> 10:00 AM {/* Mock slot for now */}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      {booking.technician?.name || booking.pickupDriver?.name || <span className="text-muted-foreground italic">Unassigned</span>}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="p-4 font-medium">
                      ₹{booking.totalAmount}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => navigate(`/admin/bookings/${booking._id}`)}
                        className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
      )}
    </div>
  );
};

export default AdminBookingsPage;
