import React, { useEffect, useState } from 'react';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import VehicleCard from '@/components/VehicleCard';
import { Search, Filter, Plus, Car, User, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const AdminVehiclesPage: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const data = await vehicleService.getAllVehicles(); 
      setVehicles(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof vehicle.user === 'object' && vehicle.user?.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    const matchesType = typeFilter === 'all' || vehicle.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'On Route': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'In Service': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Idle': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Vehicle Management</h1>
          <p className="text-muted-foreground">Monitor and manage the entire fleet.</p>
        </div>
        
        <button 
          onClick={() => toast.info('Add Vehicle feature coming soon')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Vehicle</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by plate, model, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-2 sm:pb-0">
          <div className="relative min-w-[140px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 appearance-none rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Status</option>
              <option value="Idle">Idle</option>
              <option value="On Route">On Route</option>
              <option value="In Service">In Service</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative min-w-[140px]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 appearance-none rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Types</option>
              <option value="Car">Car</option>
            </select>
            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading vehicles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVehicles.map((vehicle) => (
            <div 
              key={vehicle._id} 
              className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate(`/admin/vehicles/${vehicle._id}`)}
            >
              <div className="aspect-video bg-muted relative overflow-hidden">
                {vehicle.image ? (
                  <img 
                    src={vehicle.image} 
                    alt={`${vehicle.make} ${vehicle.model}`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                    <Car className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm ${getStatusColor(vehicle.status)}`}>
                    {vehicle.status || 'Idle'}
                  </span>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{vehicle.make} {vehicle.model}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{vehicle.licensePlate}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">
                    {vehicle.year}
                  </span>
                </div>
                
                <div className="space-y-2 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span className="truncate">
                      {typeof vehicle.user === 'object' ? vehicle.user?.name : 'Unknown Owner'}
                    </span>
                  </div>
                  {vehicle.nextService && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
                      <AlertCircle className="w-4 h-4" />
                      <span>Service due: {new Date(vehicle.nextService).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {filteredVehicles.length === 0 && (
             <div className="col-span-full text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
               <Car className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
               <h3 className="text-lg font-medium">No vehicles found</h3>
               <p className="text-muted-foreground">Try adjusting your search or filters.</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminVehiclesPage;
