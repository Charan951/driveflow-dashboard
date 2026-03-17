import React, { useState, useEffect } from 'react';
import { Car, Clock, CheckCircle, MapPin, Phone } from 'lucide-react';
import { carWashService, CarWashBooking } from '../../services/carWashService';
import { CarWashPanel } from '../../components/CarWashPanel';
import { toast } from '../../hooks/use-toast';

export const CarWashPage: React.FC = () => {
  const [bookings, setBookings] = useState<CarWashBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<CarWashBooking | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const data = await carWashService.getCarWashBookings();
      setBookings(data);
    } catch (error) {
      console.error('Failed to fetch car wash bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load car wash bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleBookingUpdate = () => {
    fetchBookings();
    // Update selected booking if it exists
    if (selectedBooking) {
      const updatedBooking = bookings.find(b => b._id === selectedBooking._id);
      if (updatedBooking) {
        setSelectedBooking(updatedBooking);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
      case 'REACHED_CUSTOMER':
        return 'bg-blue-100 text-blue-800';
      case 'CAR_WASH_STARTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CAR_WASH_COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'DELIVERED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
      case 'REACHED_CUSTOMER':
        return <Clock className="w-4 h-4" />;
      case 'CAR_WASH_STARTED':
        return <Car className="w-4 h-4" />;
      case 'CAR_WASH_COMPLETED':
      case 'DELIVERED':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container-mobile space-y-6 no-horizontal-scroll">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Car Wash Services</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Manage your assigned car wash bookings
          </p>
        </div>
        <button
          onClick={fetchBookings}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base self-start sm:self-auto"
        >
          Refresh
        </button>
      </div>

      {selectedBooking ? (
        <div>
          <button
            onClick={() => setSelectedBooking(null)}
            className="mb-6 px-4 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors text-sm sm:text-base"
          >
            ← Back to Bookings
          </button>
          <CarWashPanel 
            booking={selectedBooking} 
            onUpdate={handleBookingUpdate}
          />
        </div>
      ) : (
        <div>
          {bookings.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Car className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No Car Wash Bookings</h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                You don't have any car wash bookings assigned to you yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {bookings.map((booking) => (
                <div
                  key={booking._id}
                  className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedBooking(booking)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <Car className="w-5 sm:w-6 h-5 sm:h-6 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold truncate">
                          Car Wash #{booking.orderNumber}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-full flex items-center gap-2 ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span className="hidden sm:inline">{booking.status.replace('_', ' ')}</span>
                        <span className="sm:hidden">{booking.status.split('_')[0]}</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium text-sm sm:text-base truncate">{booking.user.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <p className="text-sm text-muted-foreground truncate">{booking.user.phone}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vehicle</p>
                      <p className="font-medium text-sm sm:text-base truncate">
                        {booking.vehicle.make} {booking.vehicle.model}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {booking.vehicle.registrationNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium text-base sm:text-lg">₹{booking.totalAmount}</p>
                      <p className="text-sm text-green-600">Paid</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <p className="truncate">{booking.location.address}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm">
                      <span className={`flex items-center gap-1 ${
                        booking.carWash.beforeWashPhotos?.length > 0 ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline">Before Photos ({booking.carWash.beforeWashPhotos?.length || 0}/4)</span>
                        <span className="sm:hidden">Before ({booking.carWash.beforeWashPhotos?.length || 0}/4)</span>
                      </span>
                      <span className={`flex items-center gap-1 ${
                        booking.carWash.afterWashPhotos?.length > 0 ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline">After Photos ({booking.carWash.afterWashPhotos?.length || 0}/4)</span>
                        <span className="sm:hidden">After ({booking.carWash.afterWashPhotos?.length || 0}/4)</span>
                      </span>
                    </div>
                    <button className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors self-start sm:self-auto">
                      <span className="hidden sm:inline">Manage Service</span>
                      <span className="sm:hidden">Manage</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};