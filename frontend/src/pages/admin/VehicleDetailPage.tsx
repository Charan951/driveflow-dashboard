import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { bookingService, Booking } from '@/services/bookingService';
import { serviceService, Service } from '@/services/serviceService';
import { userService } from '@/services/userService';
import { toast } from 'sonner';
import { 
  Car, 
  User as UserIcon, 
  Calendar, 
  MapPin, 
  FileText, 
  Shield, 
  ArrowLeft,
  AlertCircle,
  MoreVertical,
  Navigation
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const VehicleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;
        const [vehicleData, bookingsData] = await Promise.all([
          vehicleService.getVehicleById(id),
          bookingService.getVehicleBookings(id)
        ]);
        setVehicle(vehicleData);
        setBookings(bookingsData);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load vehicle details');
        navigate('/admin/vehicles');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, navigate]);

  if (isLoading || !vehicle) {
    return <div className="p-8 text-center">Loading vehicle details...</div>;
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'On Route': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'In Service': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Idle': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const owner = typeof vehicle.user === 'object' ? vehicle.user : null;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin/vehicles')}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {vehicle.make} {vehicle.model}
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
              {vehicle.status || 'Idle'}
            </span>
          </h1>
          <p className="text-muted-foreground text-sm font-mono">{vehicle.licensePlate}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Vehicle Info */}
        <div className="space-y-6">
          {/* Main Info Card */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
             <div className="aspect-video bg-muted relative">
                {vehicle.image ? (
                  <img src={vehicle.image} alt="Vehicle" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                    <Car className="w-16 h-16 text-muted-foreground/50" />
                  </div>
                )}
             </div>
             
             <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs text-muted-foreground uppercase font-medium">Type</label>
                      <p className="font-medium">{vehicle.type || 'Car'}</p>
                   </div>
                   <div>
                      <label className="text-xs text-muted-foreground uppercase font-medium">Year</label>
                      <p className="font-medium">{vehicle.year}</p>
                   </div>
                   <div>
                      <label className="text-xs text-muted-foreground uppercase font-medium">Fuel</label>
                      <p className="font-medium">{vehicle.fuelType || 'N/A'}</p>
                   </div>
                   <div>
                      <label className="text-xs text-muted-foreground uppercase font-medium">Color</label>
                      <p className="font-medium">{vehicle.color || 'N/A'}</p>
                   </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center gap-2">
                       <UserIcon className="w-4 h-4 text-primary" /> Owner Details
                    </h3>
                    {owner && (
                       <button 
                         onClick={() => navigate(`/admin/users/${owner._id}`)}
                         className="text-xs text-primary hover:underline"
                       >
                         View Profile
                       </button>
                    )}
                  </div>
                  {owner ? (
                    <div className="bg-muted/50 p-3 rounded-xl space-y-1">
                       <p className="font-medium text-sm">{owner.name}</p>
                       <p className="text-xs text-muted-foreground">{owner.email}</p>
                       <p className="text-xs text-muted-foreground">{owner.phone || 'No phone'}</p>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Unknown Owner</div>
                  )}
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">VIN</span>
                      <span className="font-mono">{vehicle.vin || 'N/A'}</span>
                   </div>
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mileage</span>
                      <span>{vehicle.mileage ? `${vehicle.mileage} km` : 'N/A'}</span>
                   </div>
                </div>
             </div>
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
             <button className="p-3 bg-card border border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors">
                <Navigation className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-medium">Track Live</span>
             </button>
             <button className="p-3 bg-card border border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors">
                <FileText className="w-5 h-5 text-orange-500" />
                <span className="text-xs font-medium">Service Record</span>
             </button>
          </div>
        </div>

        {/* Main Content - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto rounded-none mb-6">
              <TabsTrigger 
                value="history"
                className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Service History
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="documents"
                className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documents
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="tracking"
                className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Live Tracking
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="space-y-4">
              {bookings.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium">No service history</h3>
                  <p className="text-muted-foreground">This vehicle hasn't been serviced yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                   {bookings.map(booking => (
                      <div key={booking._id} className="bg-card p-4 rounded-xl border border-border flex items-center justify-between">
                         <div>
                            <div className="font-medium mb-1">
                               {Array.isArray(booking.services) 
                                ? (booking.services as Service[]).map(s => s.name).join(', ') 
                                : 'Service'}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-3">
                               <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {new Date(booking.date).toLocaleDateString()}
                               </span>
                               <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" /> {(booking.user as unknown as User)?.name || 'Unknown User'}
                               </span>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="font-bold mb-1">${booking.totalAmount}</div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                              ${booking.status === 'Delivered' ? 'bg-green-100 text-green-800' : 
                                booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 
                                'bg-yellow-100 text-yellow-800'}`}>
                              {booking.status}
                            </span>
                         </div>
                      </div>
                   ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-xl border border-border flex items-start gap-3">
                     <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Shield className="w-6 h-6" />
                     </div>
                     <div className="flex-1">
                        <h3 className="font-medium mb-1">Insurance Policy</h3>
                        <p className="text-xs text-muted-foreground mb-3">Valid until: Dec 2024</p>
                        <button className="text-sm text-primary hover:underline font-medium">View Document</button>
                     </div>
                  </div>
                  <div className="bg-card p-4 rounded-xl border border-border flex items-start gap-3">
                     <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <FileText className="w-6 h-6" />
                     </div>
                     <div className="flex-1">
                        <h3 className="font-medium mb-1">Registration Certificate</h3>
                        <p className="text-xs text-muted-foreground mb-3">RC No: {vehicle.licensePlate}</p>
                        <button className="text-sm text-primary hover:underline font-medium">View Document</button>
                     </div>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="tracking">
              <div className="bg-muted/30 rounded-2xl border border-dashed border-border h-[400px] flex items-center justify-center flex-col">
                <MapPin className="w-12 h-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">Live Tracking</h3>
                <p className="text-muted-foreground mb-4">Live location data is not available for this vehicle.</p>
                {vehicle.status === 'On Route' && (
                   <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium animate-pulse">
                      Vehicle is currently On Route
                   </div>
                )}
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailPage;
