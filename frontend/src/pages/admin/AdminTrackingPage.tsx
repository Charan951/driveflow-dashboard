import React, { useEffect, useState, useRef } from 'react';
import { getLiveLocations, LiveData, TrackedStaff, TrackedVehicle } from '@/services/trackingService';
import { socketService } from '@/services/socket';
import { routingService } from '@/services/routingService';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { distance, point } from '@turf/turf';
import { SmoothMarker } from '@/components/SmoothMarker';
import { Booking } from '@/services/bookingService';
import { 
  Car, 
  User, 
  Navigation, 
  RefreshCw, 
  Filter, 
  MapPin, 
  Clock,
  MoreVertical,
  Maximize2,
  Store
} from 'lucide-react';

// Fix for default marker icon in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Center: 17.3850, 78.4867
const MAP_CENTER: [number, number] = [17.3850, 78.4867];
const MAP_ZOOM = 13;

const MapClickHandler = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapController = ({ onMapReady }: { onMapReady: (map: L.Map) => void }) => {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
};

const AdminTrackingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'vehicles' | 'staff' | 'merchants'>('all');
  const [selectedItem, setSelectedItem] = useState<TrackedStaff | TrackedVehicle | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number, duration: number, airDistance?: number } | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [etaByAsset, setEtaByAsset] = useState<Record<string, number>>({});

  // Use React Query for fetching data
  const { data: liveData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['tracking'],
    queryFn: getLiveLocations,
    refetchInterval: 60000, // Fallback polling every 1 minute
    staleTime: 10000, // Data is fresh for 10 seconds
  });

  useEffect(() => {
    socketService.connect();
    socketService.joinRoom('admin');
    
    interface LiveLocationEvent {
      userId: string;
      role?: string;
      subRole?: string;
      lat: number;
      lng: number;
      timestamp: string;
      isOnline?: boolean;
      isShopOpen?: boolean;
      lastSeen?: string;
    }

    interface UserStatusUpdateEvent {
      userId: string;
      isOnline?: boolean;
      isShopOpen?: boolean;
      lastSeen?: string;
    }

    socketService.on('liveLocation', (data: LiveLocationEvent) => {
       // data: { userId, role, subRole, lat, lng, timestamp }
       queryClient.setQueryData(['tracking'], (prev: LiveData | undefined) => {
         if (!prev) return prev;
         
         const newStaff = prev.staff.map(s => {
           if (s._id === data.userId) {
             return { ...s, location: { ...s.location, lat: data.lat, lng: data.lng, updatedAt: data.timestamp } };
           }
           return s;
         });

         const newMerchants = prev.merchants ? prev.merchants.map(m => {
           if (m._id === data.userId) {
             return { ...m, location: { ...m.location, lat: data.lat, lng: data.lng, updatedAt: data.timestamp } };
           }
           return m;
         }) : [];

         const newVehicles = prev.vehicles.map(v => {
           if (v.user?._id === data.userId || v.user === data.userId) { // Assuming vehicle linked to user
             return { ...v, location: { ...v.location, lat: data.lat, lng: data.lng, updatedAt: data.timestamp } };
           }
           return v;
         });

         return { staff: newStaff, vehicles: newVehicles, merchants: newMerchants, timestamp: new Date().toISOString() };
       });
    });

    socketService.on('userStatusUpdate', (data: UserStatusUpdateEvent) => {
       // Handle Shop Open/Close status
       if (typeof data.isShopOpen !== 'undefined') {
         queryClient.setQueryData(['tracking'], (prev: LiveData | undefined) => {
           if (!prev) return prev;
           
           const newMerchants = prev.merchants ? prev.merchants.map(m => {
              if (m._id === data.userId) {
                return { ...m, isShopOpen: data.isShopOpen, isOnline: data.isOnline, lastSeen: data.lastSeen };
              }
              return m;
           }) : [];

           return { ...prev, merchants: newMerchants };
         });
         return;
       }

       queryClient.setQueryData(['tracking'], (prev: LiveData | undefined) => {
         if (!prev) return prev;
         
         const newStaff = prev.staff.map(s => {
           if (s._id === data.userId) {
             return { ...s, isOnline: data.isOnline, lastSeen: data.lastSeen };
           }
           return s;
         });

         const newMerchants = prev.merchants ? prev.merchants.map(m => {
            if (m._id === data.userId) {
              return { ...m, isOnline: data.isOnline, lastSeen: data.lastSeen };
            }
            return m;
          }) : [];
         
         return { ...prev, staff: newStaff, merchants: newMerchants };
       });
    });

    socketService.on('bookingUpdated', (updatedBooking: Booking) => {
        queryClient.setQueryData(['tracking'], (prev: LiveData | undefined) => {
            if (!prev) return prev;
            
            const newStaff = prev.staff.map(s => {
                // Check if staff is involved in this booking
                const isDriver = typeof updatedBooking.pickupDriver === 'object' 
                    ? updatedBooking.pickupDriver?._id === s._id 
                    : updatedBooking.pickupDriver === s._id;
                    
                const isTechnician = typeof updatedBooking.technician === 'object'
                    ? updatedBooking.technician?._id === s._id
                    : updatedBooking.technician === s._id;
                
                if (isDriver || isTechnician) {
                    // Update current job status
                    return {
                        ...s,
                        currentJob: s.currentJob && s.currentJob._id === updatedBooking._id
                            ? { ...s.currentJob, status: updatedBooking.status }
                            : s.currentJob
                    };
                }
                return s;
            });
            
            return { ...prev, staff: newStaff };
        });
    });

    return () => {
      socketService.leaveRoom('admin');
      socketService.off('liveLocation');
      socketService.off('userStatusUpdate');
      socketService.off('bookingUpdated');
      socketService.disconnect();
    };
  }, [queryClient]);

  // Recompute route ETA live for the selected asset when its location updates
  useEffect(() => {
    interface LiveLocationEvent {
      userId: string;
      lat: number;
      lng: number;
      timestamp?: string;
    }

    const handler = async (data: LiveLocationEvent) => {
      if (!selectedItem || !destination) return;
      if (data.userId !== selectedItem._id) return;
      try {
        const start = [data.lat, data.lng] as [number, number];
        const end = destination;
        const response = await routingService.getRoute(start, end);
        if (response.routes && response.routes.length > 0) {
          const route = response.routes[0];
          const coordinates = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]) as [number, number][];
          setRouteGeometry(coordinates);
          setRouteInfo({
            distance: route.distance,
            duration: route.duration,
          });
        }
      } catch (e) {
        console.error('Failed to update live ETA', e);
      }
    };
    socketService.on('liveLocation', handler);
    return () => {
      socketService.off('liveLocation', handler);
    };
  }, [selectedItem, destination]);

  useEffect(() => {
    if (selectedItem && 'currentJob' in selectedItem && selectedItem.currentJob?.location) {
      const loc = selectedItem.currentJob.location as { lat?: number; lng?: number } | string | null | undefined;
      let jobLat: number | undefined;
      let jobLng: number | undefined;

      if (typeof loc === 'object' && loc.lat && loc.lng) {
        jobLat = loc.lat;
        jobLng = loc.lng;
      } else if (typeof loc === 'string') {
        // Try to parse location if it's coordinates "lat,lng"
        const parts = loc.split(',').map((p: string) => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          jobLat = parts[0];
          jobLng = parts[1];
        }
      }
      
      if (jobLat !== undefined && jobLng !== undefined) {
        // Auto-route
        setDestination([jobLat, jobLng]);
        
        const fetchRoute = async () => {
             try {
                const start = [selectedItem.location.lat, selectedItem.location.lng] as [number, number];
                const end = [jobLat, jobLng] as [number, number];
                
                // Calculate air distance using Turf.js
                const from = point([start[1], start[0]]);
                const to = point([end[1], end[0]]);
                const airDist = distance(from, to, { units: 'kilometers' });

                const response = await routingService.getRoute(start, end);
                if (response.routes && response.routes.length > 0) {
                    const route = response.routes[0];
                    const coordinates = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]) as [number, number][];
                    
                    setRouteGeometry(coordinates);
                    setRouteInfo({
                        distance: route.distance,
                        duration: route.duration,
                        airDistance: airDist
                    });
                    toast.success('Showing route to active job');
                }
            } catch (error) {
                console.error('Auto-route failed', error);
            }
        };
        
        fetchRoute();
      }
    }
  }, [selectedItem]);

  useEffect(() => {
    if (!liveData) return;
    const items = filteredItems().slice(0, 12);
    const doWork = async () => {
      const updates: Record<string, number> = {};
      for (const it of items) {
        if ('currentJob' in it && it.currentJob && it.currentJob.location) {
          const loc = it.currentJob.location as { lat?: number; lng?: number } | string | null | undefined;
          let destLat: number | undefined;
          let destLng: number | undefined;
          if (typeof loc === 'object' && loc.lat && loc.lng) {
            destLat = loc.lat;
            destLng = loc.lng;
          } else if (typeof loc === 'string') {
            const parts = loc.split(',').map((p: string) => parseFloat(p.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              destLat = parts[0];
              destLng = parts[1];
            }
          }
          if (destLat && destLng) {
            try {
              const start = [it.location.lat, it.location.lng] as [number, number];
              const end = [destLat, destLng] as [number, number];
              const response = await routingService.getRoute(start, end);
              if (response.routes && response.routes.length > 0) {
                const route = response.routes[0];
                updates[it._id] = Math.round(route.duration / 60);
              }
            } catch {
              // ignore
            }
          }
        }
      }
      if (Object.keys(updates).length) {
        setEtaByAsset(prev => ({ ...prev, ...updates }));
      }
    };
    doWork();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveData?.timestamp, filter]);
  // Removed old fetchData function as we use useQuery now

  const createCustomIcon = (type: 'staff' | 'vehicle' | 'merchant', status?: string, isShopOpen?: boolean) => {
    let color = '';
    if (type === 'staff') color = '#3b82f6';
    else if (type === 'merchant') color = isShopOpen === false ? '#ef4444' : '#6366f1'; // Red if closed, Indigo if open
    else color = status === 'On Route' ? '#22c55e' : '#f97316';

    const iconChar = type === 'staff' ? '👤' : (type === 'merchant' ? '🏪' : '🚗');
    
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${color}; 
        width: 36px; 
        height: 36px; 
        border-radius: 50%; 
        border: 2px solid white; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        font-size: 18px;
      ">${iconChar}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });
  };



  const getIcon = (item: TrackedStaff | TrackedVehicle) => {
    if ('role' in item && item.role === 'merchant') {
       return <Store className="w-5 h-5 text-white" />;
    }
    if ('type' in item) {
      // It's vehicle
      return <Car className="w-5 h-5 text-white" />;
    }
    // It's staff
    return <User className="w-5 h-5 text-white" />;
  };

  const getColor = (item: TrackedStaff | TrackedVehicle) => {
    if ('role' in item && item.role === 'merchant') return 'bg-indigo-500';
    if ('type' in item) { // Vehicle
      if (item.status === 'On Route') return 'bg-green-500'; // Active Vehicle
      return 'bg-orange-500'; // In Service/Other
    }
    return 'bg-blue-500'; // Staff
  };

  const filteredItems = () => {
    if (!liveData) return [];
    let items: (TrackedStaff | TrackedVehicle)[] = [];
    if (filter === 'all' || filter === 'staff') items = [...items, ...liveData.staff];
    if (filter === 'all' || filter === 'vehicles') items = [...items, ...liveData.vehicles];
    if (filter === 'all' || filter === 'merchants') items = [...items, ...(liveData.merchants || [])];
    return items;
  };

  const handleAssetClick = (item: TrackedStaff | TrackedVehicle) => {
    setSelectedItem(item);
    if (mapInstance) {
      mapInstance.flyTo([item.location.lat, item.location.lng], 16, { duration: 1.5 });
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (!selectedItem) {
        // Just set destination marker if no item selected, or do nothing
        return;
    }
    
    setDestination([lat, lng]);
    setRouteGeometry(null);
    setRouteInfo(null);
    
    const loadingToast = toast.loading('Calculating route...');
    
    try {
        const start = [selectedItem.location.lat, selectedItem.location.lng] as [number, number];
        const end = [lat, lng] as [number, number];
        
        const response = await routingService.getRoute(start, end);
        if (response.routes && response.routes.length > 0) {
            const route = response.routes[0];
            // OSRM returns [lng, lat], we need [lat, lng] for Leaflet
            const coordinates = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]) as [number, number][];
            
            setRouteGeometry(coordinates);
            setRouteInfo({
                distance: route.distance,
                duration: route.duration
            });
            toast.dismiss(loadingToast);
            toast.success(`Route found: ${(route.distance / 1000).toFixed(1)} km, ${Math.round(route.duration / 60)} min`);
        }
    } catch (error) {
        toast.dismiss(loadingToast);
        toast.error('Failed to calculate route');
    }
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
          <button
            onClick={() => setFilter('merchants')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === 'merchants' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            Merchants
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
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
                  onClick={() => handleAssetClick(item)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedItem?._id === item._id
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                      : 'border-gray-100 hover:border-gray-200 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getColor(item)} bg-opacity-10 dark:bg-opacity-20 relative`}>
                      {React.cloneElement(getIcon(item), { className: `w-4 h-4 ${getColor(item).replace('bg-', 'text-')}` })}
                      {('subRole' in item || ('role' in item && item.role === 'merchant')) && (
                        <span className={`absolute -top-1 -right-1 w-3 h-3 border-2 border-white dark:border-gray-800 rounded-full ${
                            ('role' in item && item.role === 'merchant')
                                ? (item.isShopOpen !== false ? 'bg-green-500' : 'bg-red-500') // Treat undefined as Open
                                : (item.isOnline ? 'bg-green-500' : 'bg-gray-300')
                        }`} title={
                            ('role' in item && item.role === 'merchant')
                                ? (item.isShopOpen ? 'Shop Open' : 'Shop Closed')
                                : (item.isOnline ? 'Online' : 'Offline')
                        } />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {'name' in item ? item.name : `${item.make} ${item.model}`}
                        </h3>
                        <div className="flex items-center gap-1">
                          {etaByAsset[item._id] !== undefined && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                              ETA {etaByAsset[item._id]}m
                            </span>
                          )}
                          {('subRole' in item || ('role' in item && item.role === 'merchant')) && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  ('role' in item && item.role === 'merchant') 
                                      ? (item.isShopOpen ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')
                                      : (item.isOnline ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400')
                              }`}>
                                  {('role' in item && item.role === 'merchant') 
                                      ? (item.isShopOpen !== false ? 'Open' : 'Closed') 
                                      : (item.isOnline ? 'Online' : 'Offline')}
                              </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {'subRole' in item ? item.subRole : ('role' in item && item.role === 'merchant' ? 'Merchant' : item.licensePlate)}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[120px]" title={item.location.address || `${item.location.lat}, ${item.location.lng}`}>
                          {item.location.address || `${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}`}
                        </span>
                        <span className="mx-1">•</span>
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          {item.location.updatedAt && !isNaN(new Date(item.location.updatedAt).getTime())
                            ? formatDistanceToNow(new Date(item.location.updatedAt), { addSuffix: true })
                            : 'Unknown time'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden shadow-inner z-0">
           <MapContainer 
            center={MAP_CENTER} 
             zoom={MAP_ZOOM} 
             style={{ height: '100%', width: '100%' }}
           >
             <MapClickHandler onMapClick={handleMapClick} />
             <MapController onMapReady={setMapInstance} />
             <TileLayer
               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
             />
             
             {routeGeometry && (
                <Polyline 
                  positions={routeGeometry} 
                  color="blue" 
                  weight={4} 
                  opacity={0.6}
                />
             )}

             {destination && (
               <Marker position={destination} icon={L.divIcon({ className: 'bg-transparent', html: '📍', iconSize: [24, 24] })}>
                 <Popup>Destination</Popup>
               </Marker>
             )}
             
             {filteredItems().map((item) => (
               <SmoothMarker 
                 key={item._id}
                 position={[item.location.lat, item.location.lng]}
                 icon={createCustomIcon(
                    'role' in item && item.role === 'merchant' ? 'merchant' : 
                    ('type' in item ? 'vehicle' : 'staff'), 
                    'status' in item ? item.status : undefined,
                    'isShopOpen' in item ? item.isShopOpen : undefined
                 )}
                 eventHandlers={{
                   click: () => handleAssetClick(item),
                 }}
               >
                 <Popup>
                   <div className="p-1">
                     <h3 className="font-bold text-sm">{'name' in item ? item.name : `${item.make} ${item.model}`}</h3>
                     <p className="text-xs text-gray-600">{'subRole' in item ? item.subRole : ('role' in item && item.role === 'merchant' ? 'Merchant' : item.licensePlate)}</p>
                     {'currentJob' in item && item.currentJob && (
                       <div className="mt-1 pt-1 border-t border-gray-200">
                         <p className="text-xs font-semibold text-blue-600">Active Job</p>
                         <p className="text-xs text-gray-500">{item.currentJob.status}</p>
                         {etaByAsset[item._id] !== undefined && (
                           <p className="text-xs text-blue-700 mt-1">ETA {etaByAsset[item._id]}m</p>
                         )}
                       </div>
                     )}
                     <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.location.updatedAt).toLocaleTimeString()}
                     </p>
                   </div>
                 </Popup>
               </SmoothMarker>
             ))}
           </MapContainer>
           
           <div className="absolute top-4 right-4 z-[400] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-500">
              Live Data {isFetching && '• Updating...'}
           </div>
           
           {routeInfo && (
             <div className="absolute bottom-4 left-4 z-[400] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-w-sm">
               <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Route Details</h3>
               <div className="flex gap-4">
                 <div>
                    <p className="text-xs text-gray-500">Road Dist.</p>
                    <p className="font-mono font-medium">{(routeInfo.distance / 1000).toFixed(1)} km</p>
                 </div>
                 {routeInfo.airDistance && (
                   <div>
                      <p className="text-xs text-gray-500">Air Dist.</p>
                      <p className="font-mono font-medium">{routeInfo.airDistance.toFixed(1)} km</p>
                   </div>
                 )}
                 <div>
                    <p className="text-xs text-gray-500">Est. Time</p>
                    <p className="font-mono font-medium">{Math.round(routeInfo.duration / 60)} min</p>
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AdminTrackingPage;
