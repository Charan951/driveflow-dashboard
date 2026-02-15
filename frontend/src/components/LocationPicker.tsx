import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/services/api';
import { Search, MapPin, Loader2, Locate } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export interface LocationValue {
  address: string;
  lat?: number;
  lng?: number;
}

interface LocationPickerProps {
  value: LocationValue | string;
  onChange: (value: LocationValue) => void;
  className?: string;
  mapClassName?: string;
}

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// Component to handle map clicks
const MapClickHandler = ({ setPosition, fetchAddress }: { 
  setPosition: (pos: [number, number]) => void,
  fetchAddress: (lat: number, lng: number) => void
}) => {
  const map = useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      await fetchAddress(lat, lng);
    },
  });
  return null;
};

// Component to update map center
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center, map]);
  return null;
};

const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange, className, mapClassName }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [position, setPosition] = useState<[number, number]>([20.5937, 78.9629]); // Default to India center
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const markerRef = useRef<L.Marker>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const response = await api.get('/tracking/reverse', { params: { lat, lng } });
      if (response.data && response.data.display_name) {
        const address = response.data.display_name;
        setQuery(address);
        onChange({ address, lat, lng });
        setIsTyping(false);
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      setIsTyping(false);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const newPos: [number, number] = [latitude, longitude];
          setPosition(newPos);
          await fetchAddress(latitude, longitude);
          setIsLocating(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLocating(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  };

  const handleDragEnd = async () => {
    const marker = markerRef.current;
    if (marker) {
      const { lat, lng } = marker.getLatLng();
      setPosition([lat, lng]);
      await fetchAddress(lat, lng);
    }
  };

  // Fetch current location on mount
  useEffect(() => {
    if (!value || (typeof value === 'string' && !value) || (typeof value === 'object' && !value.address)) {
      handleGetCurrentLocation();
    }
  }, []);

  // Helper function for searching
  const searchNominatim = async (q: string) => {
    try {
      const response = await api.get('/tracking/search', { params: { q, limit: 5, countrycodes: 'in' } });
      return response.data || [];
    } catch (e) {
      console.error('Nominatim search error:', e);
      return [];
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query && isTyping && query.length > 2) {
        setIsLoading(true);
        try {
          // Attempt 1: Full query
          let results = await searchNominatim(query);
          
          // Attempt 2: If no results and has commas, try removing first part (often house number/name)
          if (results.length === 0 && query.includes(',')) {
             const parts = query.split(',');
             if (parts.length > 1) {
                 const broaderQuery = parts.slice(1).join(',').trim();
                 if (broaderQuery.length > 3) {
                     // Small delay to be nice to the API
                     await new Promise(resolve => setTimeout(resolve, 500));
                     results = await searchNominatim(broaderQuery);
                 }
             }
          }
          
           // Attempt 3: If still no results, try last 2 parts (likely city/state) as a catch-all
          if (results.length === 0 && query.includes(',')) {
             const parts = query.split(',');
             if (parts.length > 2) {
                 const broaderQuery = parts.slice(-2).join(',').trim();
                 // Avoid repeating Attempt 2 if it was the same
                 if (broaderQuery.length > 3 && broaderQuery !== parts.slice(1).join(',').trim()) {
                     await new Promise(resolve => setTimeout(resolve, 500));
                     results = await searchNominatim(broaderQuery);
                 }
             }
          }

          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (!query) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 800); // Increased debounce time to reduce API calls

    return () => clearTimeout(timer);
  }, [query, isTyping]);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  // Update internal query if prop changes
  useEffect(() => {
    if (typeof value === 'string') {
      setQuery(value);
    } else {
      setQuery(value.address || '');
      if (value.lat && value.lng) {
        setPosition([value.lat, value.lng]);
      }
    }
  }, [value]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    setIsTyping(false);
    setPosition([lat, lon]);
    setQuery(suggestion.display_name);
    onChange({ address: suggestion.display_name, lat, lng: lon });
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsTyping(true);
    setQuery(e.target.value);
    // Keep existing lat/lng if we are just typing, or maybe clear them?
    // For now, let's pass the current position but maybe we should mark it as unverified?
    // Since the User interface has optional lat/lng, we can send undefined if we want.
    // But keeping it might be better if they are just correcting a typo.
    // Let's check what was the previous value.
    // Actually, onChange expects LocationValue.
    // Let's assume typing invalidates lat/lng for safety, OR we keep them.
    // If I type "New York" but map is on "India", that's bad.
    // So if typing, we should probably clear lat/lng until selected.
    onChange({ address: e.target.value }); 
  };

  return (
    <div className={`space-y-2 ${className}`} ref={wrapperRef}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <MapPin className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search for a location..."
          className="w-full pl-10 pr-10 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading || isLocating ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="Use current location"
            >
              <Locate className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-[1000] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-start gap-3"
              >
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{suggestion.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={cn("h-[300px] w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 relative z-0", mapClassName)}>
        <MapContainer 
          center={position} 
          zoom={13}  
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker 
            position={position} 
            draggable={true}
            ref={markerRef}
            eventHandlers={{
              dragend: handleDragEnd
            }}
          />
          <MapClickHandler 
            setPosition={setPosition} 
            fetchAddress={fetchAddress}
          />
          <MapUpdater center={position} />
        </MapContainer>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Search for a location or click on the map to pin-point the address.
      </p>
    </div>
  );
};

export default LocationPicker;
