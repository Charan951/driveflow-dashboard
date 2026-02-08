import React, { useEffect, useState, useRef } from 'react';
import { getLiveLocations, LiveData, TrackedStaff, TrackedVehicle } from '@/services/trackingService';
import { toast } from 'sonner';
import { 
  Car, 
  Bike, 
  User, 
  Navigation, 
  RefreshCw, 
  Filter, 
  MapPin, 
  Clock,
  MoreVertical,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock map coordinates for the simulated map (Hyderabad area approx)
// Center: 17.3850, 78.4867
// Range: +/- 0.05
const MAP_CENTER = { lat: 17.3850, lng: 78.4867 };
const MAP_ZOOM = 14;

const AdminTrackingPage: React.FC = () => {
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'vehicles' | 'staff'>('all');
  const [selectedItem, setSelectedItem] = useState<TrackedStaff | TrackedVehicle | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulated Map State
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const data = await getLiveLocations();
      
      // If no data, simulate some for demonstration
      if (data.staff.length === 0 && data.vehicles.length === 0) {
        setLiveData(generateMockData());
      } else {
        setLiveData(data);
      }
    } catch (error) {
      toast.error('Failed to load live tracking data');
      // Fallback to mock data for demo if API fails/is empty
      setLiveData(generateMockData());
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Helper to convert lat/lng to percentage positions for the div map
  const getPosition = (lat: number, lng: number) => {
    // Simple linear projection relative to a fixed bounding box around center
    const range = 0.08; // Roughly 8-10km span
    const y = ((MAP_CENTER.lat + range/2 - lat) / range) * 100;
    const x = ((lng - (MAP_CENTER.lng - range/2)) / range) * 100;
    
    // Clamp to 0-100 to stay in box
    return {
      top: `${Math.max(5, Math.min(95, y))}%`,
      left: `${Math.max(5, Math.min(95, x))}%`
    };
  };

  const generateMockData = (): LiveData => {
    return {
      timestamp: new Date().toISOString(),
      staff: [
        {
          _id: 's1',
          name: 'Rajesh Kumar',
          subRole: 'Driver',
          email: 'rajesh@driveflow.com',
          phone: '9876543210',
          location: { lat: 17.3950, lng: 78.4967, updatedAt: new Date().toISOString() }
        },
        {
          _id: 's2',
          name: 'Suresh Tech',
          subRole: 'Technician',
          email: 'suresh@driveflow.com',
          location: { lat: 17.3750, lng: 78.4767, updatedAt: new Date().toISOString() }
        }
      ],
      vehicles: [
        {
          _id: 'v1',
          make: 'Honda',
          model: 'City',
          licensePlate: 'TS08AB1234',
          status: 'On Route',
          type: 'Car',
          location: { lat: 17.3880, lng: 78.4800, updatedAt: new Date().toISOString() },
          user: { name: 'Customer A' }
        },
        {
          _id: 'v2',
          make: 'Royal Enfield',
          model: 'Classic 350',
          licensePlate: 'TS09XY9876',
          status: 'In Service',
          type: 'Bike',
          location: { lat: 17.3820, lng: 78.4950, updatedAt: new Date().toISOString() },
          user: { name: 'Customer B' }
        }
      ]
    };
  };

  const getIcon = (item: TrackedStaff | TrackedVehicle) => {
    if ('subRole' in item) {
      // It's staff
      return <User className="w-5 h-5 text-white" />;
    } else {
      // It's vehicle
      return item.type === 'Bike' 
        ? <Bike className="w-5 h-5 text-white" /> 
        : <Car className="w-5 h-5 text-white" />;
    }
  };

  const getColor = (item: TrackedStaff | TrackedVehicle) => {
    if ('subRole' in item) return 'bg-blue-500'; // Staff
    if (item.status === 'On Route') return 'bg-green-500'; // Active Vehicle
    return 'bg-orange-500'; // In Service/Other
  };

  const filteredItems = () => {
    if (!liveData) return [];
    let items: (TrackedStaff | TrackedVehicle)[] = [];
    if (filter === 'all' || filter === 'staff') items = [...items, ...liveData.staff];
    if (filter === 'all' || filter === 'vehicles') items = [...items, ...liveData.vehicles];
    return items;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Navigation className="w-6 h-6 text-blue-600" />
            Live Operations Panel
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Real-time tracking of staff and vehicles</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('vehicles')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === 'vehicles' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            Vehicles
          </button>
          <button
            onClick={() => setFilter('staff')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === 'staff' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            Staff
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar List */}
        <div className="w-80 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col shrink-0 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center justify-between">
              Active Assets
              <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                {filteredItems().length}
              </span>
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoading && !liveData ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredItems().length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                No active assets found
              </div>
            ) : (
              filteredItems().map((item) => (
                <div
                  key={item._id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedItem?._id === item._id
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                      : 'border-gray-100 hover:border-gray-200 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getColor(item)} bg-opacity-10 dark:bg-opacity-20`}>
                      {React.cloneElement(getIcon(item), { className: `w-4 h-4 ${getColor(item).replace('bg-', 'text-')}` })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {'name' in item ? item.name : `${item.make} ${item.model}`}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {'subRole' in item ? item.subRole : item.licensePlate}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span>1.2km away</span>
                        <span className="mx-1">•</span>
                        <Clock className="w-3 h-3" />
                        <span>Just now</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Area (Simulated) */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden group">
          {/* Map Placeholder Grid Background */}
          <div 
            className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(#808080 1px, transparent 1px), linear-gradient(90deg, #808080 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          ></div>
          
          {/* Streets/Roads simulation (Static SVGs for visuals) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 dark:opacity-10" xmlns="http://www.w3.org/2000/svg">
             <path d="M0 200 Q 400 250 800 200 T 1600 300" stroke="currentColor" strokeWidth="20" fill="none" className="text-gray-400" />
             <path d="M200 0 Q 250 400 200 800" stroke="currentColor" strokeWidth="15" fill="none" className="text-gray-400" />
             <path d="M600 0 L 600 800" stroke="currentColor" strokeWidth="10" fill="none" className="text-gray-400" />
             <path d="M0 500 L 1200 500" stroke="currentColor" strokeWidth="12" fill="none" className="text-gray-400" />
          </svg>

          {/* Map Items */}
          <AnimatePresence>
            {filteredItems().map((item) => {
              const pos = getPosition(item.location.lat, item.location.lng);
              const isSelected = selectedItem?._id === item._id;

              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1, top: pos.top, left: pos.left }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ type: 'spring', damping: 20 }}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 ${isSelected ? 'z-20' : ''}`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="relative group/marker">
                    {/* Ripple effect for selected/active */}
                    {isSelected && (
                      <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${getColor(item)}`}></div>
                    )}
                    
                    {/* Marker Icon */}
                    <div className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center border-2 border-white dark:border-gray-800 ${getColor(item)} text-white transition-transform hover:scale-110`}>
                      {getIcon(item)}
                    </div>

                    {/* Tooltip */}
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-white dark:bg-gray-800 p-2 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 text-xs transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/marker:opacity-100'} pointer-events-none`}>
                      <div className="font-bold text-gray-900 dark:text-white">
                        {'name' in item ? item.name : item.licensePlate}
                      </div>
                      <div className="text-gray-500">
                        {'status' in item ? item.status : item.subRole}
                      </div>
                      <div className="mt-1 text-gray-400 text-[10px]">
                        {new Date(item.location.updatedAt).toLocaleTimeString()}
                      </div>
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white dark:border-t-gray-800"></div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {/* Controls Overlay */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2">
             <button className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
               <Maximize2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
             </button>
          </div>
          
          <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-500">
            Lat: {MAP_CENTER.lat.toFixed(4)} | Lng: {MAP_CENTER.lng.toFixed(4)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTrackingPage;