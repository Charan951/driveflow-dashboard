import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { bookingService, Booking } from '@/services/bookingService';
import { serviceService, Service } from '@/services/serviceService';
import { toast } from 'sonner';
import { 
  Car, 
  Calendar, 
  FileText, 
  ArrowLeft,
  Clock,
  Activity,
  Trash2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VehicleHealthIndicators from '@/components/VehicleHealthIndicators';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const CustomerVehicleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteVehicle = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await vehicleService.deleteVehicle(id);
      toast.success('Vehicle deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['vehicle'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      navigate('/add-vehicle');
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
      toast.error('Failed to delete vehicle');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const { data: vehicle, isLoading: vehicleLoading, error: vehicleError } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => id ? vehicleService.getVehicleById(id) : Promise.reject('No vehicle ID'),
    enabled: !!id,
    staleTime: 0, // Always refetch when cache invalidated
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['vehicleBookings', id],
    queryFn: () => id ? bookingService.getVehicleBookings(id) : Promise.reject('No vehicle ID'),
    enabled: !!id,
    staleTime: 0, // Always refetch when cache invalidated
  });

  const isLoading = vehicleLoading || bookingsLoading;

  React.useEffect(() => {
    if (vehicleError) {
      console.error(vehicleError);
      toast.error('Failed to load vehicle details');
      navigate('/add-vehicle');
    }
  }, [vehicleError, navigate]);

  if (isLoading || !vehicle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse">Loading vehicle details...</p>
      </div>
    );
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'On Route': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'In Service': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Idle': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6 py-4 sm:py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex flex-wrap items-center gap-2 sm:gap-3">
            {vehicle.make} {vehicle.model}
            {vehicle.variant && (
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                {vehicle.variant}
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(vehicle.status)}`}>
              {vehicle.status || 'Idle'}
            </span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-mono uppercase tracking-wider">{vehicle.licensePlate}</p>
        </div>
        <Button 
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Vehicle Info */}
        <div className="space-y-6">
          {/* Main Info Card */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
             <div className="aspect-video bg-muted relative">
                {vehicle.image ? (
                  <img src={vehicle.image} alt="Vehicle" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                    <Car className="w-16 h-16 text-muted-foreground/30" />
                  </div>
                )}
             </div>
             
             <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Type</label>
                      <p className="font-semibold text-sm sm:text-base">{vehicle.type || 'Car'}</p>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Variant</label>
                      <p className="font-semibold text-sm sm:text-base">{vehicle.variant || 'N/A'}</p>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Year</label>
                      <p className="font-semibold text-sm sm:text-base">{vehicle.year}</p>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Fuel</label>
                      <p className="font-semibold text-sm sm:text-base">{vehicle.fuelType || 'N/A'}</p>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Color</label>
                      <p className="font-semibold text-sm sm:text-base">{vehicle.color || 'N/A'}</p>
                   </div>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">VIN</span>
                      <span className="font-mono font-medium">{vehicle.vin || 'N/A'}</span>
                   </div>
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mileage</span>
                      <span className="font-medium">{vehicle.mileage ? `${vehicle.mileage} km` : 'N/A'}</span>
                   </div>
                </div>
             </div>
          </div>
          

        </div>

        {/* Main Content - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="history" className="w-full">
            <div className="overflow-x-auto scrollbar-hide mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-full sm:w-auto justify-start border-b border-border bg-transparent p-0 h-auto rounded-none min-w-max">
                <TabsTrigger 
                  value="history"
                  className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary transition-all font-medium text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Service History
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="health"
                  className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary transition-all font-medium text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Vehicle Health
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="health" className="mt-0 focus-visible:outline-none">
               <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-6">Health Status</h3>
                  <div className="flex justify-center py-4">
                     <VehicleHealthIndicators 
                        healthIndicators={vehicle.healthIndicators} 
                        mileage={vehicle.mileage}
                        healthPercentBaselineAt={vehicle.healthPercentBaselineAt}
                        healthPercentDisplay={vehicle.healthPercentDisplay}
                     />
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0 focus-visible:outline-none space-y-4">
              {bookings.length === 0 ? (
                <div className="text-center py-16 bg-muted/20 rounded-2xl border border-dashed border-border">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">No service history</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">This vehicle hasn't been serviced with us yet. Book your first service today!</p>
                  <button 
                    onClick={() => navigate('/book-service')}
                    className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                  >
                    Book Service
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                   {bookings.map(booking => (
                      <div 
                        key={booking._id} 
                        className="bg-card p-5 rounded-2xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md hover:bg-muted/50 transition-all cursor-pointer"
                        onClick={() => navigate(`/track/${booking._id}`)}
                      >
                         <div className="space-y-2">
                            <div className="font-bold text-base sm:text-lg">
                               {Array.isArray(booking.services) 
                                ? (booking.services as Service[]).map(s => s.name).join(', ') 
                                : 'Service'}
                            </div>
                            <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-y-2 gap-x-4">
                               <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
                                  <Calendar className="w-3.5 h-3.5" /> {new Date(booking.date).toLocaleDateString()}
                               </span>
                               <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
                                  <Clock className="w-3.5 h-3.5" /> {new Date(booking.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                            </div>
                         </div>
                         <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
                            <div className="text-lg font-black text-primary">₹{booking.totalAmount}</div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase
                                  ${booking.status === 'DELIVERED' || booking.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                    booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}
                                >
                                  {booking.status}
                                </span>
                         </div>
                      </div>
                   ))}
                </div>
              )}
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Vehicle</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this vehicle? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteVehicle}
              disabled={isDeleting}
              className="rounded-xl min-w-[100px]"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerVehicleDetailPage;
