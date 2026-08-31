import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/services/api';
import { Search, MapPin, Loader2, Locate } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  place_id: string;
  display_name: string;
}

/** Groups one search-and-select flow into a single Google billing session. */
const newSessionToken = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// Component to handle map clicks and zoom
const MapEventsHandler = ({ setPosition, setZoom, fetchAddress }: { 
  setPosition: (pos: [number, number]) => void,
  setZoom: (z: number) => void,
  fetchAddress: (lat: number, lng: number) => void
}) => {
  const map = useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      await fetchAddress(lat, lng);
    },
    zoomend: () => {
      setZoom(map.getZoom());
    }
  });
  return null;
};

// Component to update map center
const MapUpdater = ({ center, zoom }: { center: [number, number], zoom?: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom || map.getZoom());
  }, [center, map, zoom]);
  return null;
};

const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange, className, mapClassName }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [position, setPosition] = useState<[number, number]>([20.5937, 78.9629]); // Default to India center
  const [zoom, setZoom] = useState(13);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const sessionTokenRef = useRef(newSessionToken());
  const markerRef = useRef<L.Marker>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchAddress = useCallback(async (lat: number, lng: number) => {
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
  }, [onChange]);

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    if (isLocating) return;

    setIsLocating(true);
    setIsTyping(false);
    const loadingToast = toast.loading('Detecting your location...');

    const onLocationSuccess = async (position: GeolocationPosition) => {
      toast.dismiss(loadingToast);
      const { latitude, longitude } = position.coords;
      const newPos: [number, number] = [latitude, longitude];
      setPosition(newPos);
      setZoom(18); // Zoom in on detection
      await fetchAddress(latitude, longitude);
      setIsLocating(false);
    };

    const requestLocation = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        onLocationSuccess,
        (error) => {
          if (highAccuracy && (error.code === 2 || error.code === 3)) {
            console.warn('High accuracy geolocation failed/timeout, falling back to network:', error);
            toast('Improving location...', { 
              description: 'Getting faster network-based location',
              duration: 3000 
            });
            requestLocation(false);
            return;
          }
          toast.dismiss(loadingToast);
          console.warn('Error getting location:', error);
          toast.error('Could not get your exact location. Please search manually.');
          setIsLocating(false);
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 5000 : 10000,
          maximumAge: highAccuracy ? 30000 : 60000
        }
      );
    };

    // Fast-track: try to get a recently cached location first (within 5 mins)
    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      () => requestLocation(true), // If no cache, start the high-accuracy process
      {
        enableHighAccuracy: false,
        timeout: 1000, // Wait only 1s for cached/quick location
        maximumAge: 300000 // Accept location up to 5 mins old
      }
    );
  }, [fetchAddress, isLocating]);

  const handleDragEnd = async () => {
    const marker = markerRef.current;
    if (marker) {
      const { lat, lng } = marker.getLatLng();
      setPosition([lat, lng]);
      await fetchAddress(lat, lng);
    }
  };

  // Auto-locate once on mount if there's no initial address — but never
  // again after that, otherwise clearing the field to type a new search
  // just gets immediately overwritten with the current location.
  const hasAutoLocatedRef = useRef(false);
  useEffect(() => {
    if (hasAutoLocatedRef.current) return;
    hasAutoLocatedRef.current = true;
    if (!value || (typeof value === 'string' && !value) || (typeof value === 'object' && !value.address)) {
      handleGetCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Google Places Autocomplete, proxied through the backend so the API key
  // never reaches the browser bundle. Surfaces named places (businesses,
  // landmarks) the way Google Maps labels them, not just street addresses.
  const searchPlaces = useCallback(
    async (q: string): Promise<Suggestion[]> => {
      try {
        const response = await api.get('/tracking/places-autocomplete', {
          params: {
            q,
            sessiontoken: sessionTokenRef.current,
            lat: position[0],
            lng: position[1],
          },
        });
        const predictions = response.data?.predictions || [];
        return predictions.map((p: { place_id: string; description: string }) => ({
          place_id: p.place_id,
          display_name: p.description,
        }));
      } catch (e) {
        console.error('Place search error:', e);
        return [];
      }
    },
    [position]
  );

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query && isTyping && query.length > 2) {
        setIsLoading(true);
        try {
          const results = await searchPlaces(query);
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
    }, 400); // Debounce so we don't fire a request on every keystroke

    return () => clearTimeout(timer);
  }, [query, isTyping, searchPlaces]);

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
  }, []);

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

  const handleSuggestionClick = async (suggestion: Suggestion) => {
    setIsTyping(false);
    setQuery(suggestion.display_name);
    setShowSuggestions(false);
    setIsLoading(true);
    try {
      const response = await api.get('/tracking/place-details', {
        params: { place_id: suggestion.place_id, sessiontoken: sessionTokenRef.current },
      });
      const { lat, lng, address } = response.data || {};
      if (typeof lat === 'number' && typeof lng === 'number') {
        setPosition([lat, lng]);
        setZoom(16); // Zoom in on suggestion
        const finalAddress = address || suggestion.display_name;
        setQuery(finalAddress);
        onChange({ address: finalAddress, lat, lng });
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
      toast.error('Could not load that place. Please try another result.');
    } finally {
      setIsLoading(false);
      // Start a fresh session token now that this search-and-select is done.
      sessionTokenRef.current = newSessionToken();
    }
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
          className="w-full pl-10 pr-12 py-2.5 sm:py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
          {isLoading || isLocating ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="text-gray-400 hover:text-blue-500 transition-colors p-1"
              title="Use current location"
            >
              <Locate className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="mt-1 text-right text-[11px] text-gray-400 dark:text-gray-500">
          Powered by Google
        </p>

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
          <MapEventsHandler 
            setPosition={setPosition} 
            setZoom={setZoom}
            fetchAddress={fetchAddress}
          />
          <MapUpdater center={position} zoom={zoom} />
        </MapContainer>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Search for a location or click on the map to pin-point the address.
      </p>
    </div>
  );
};

export default LocationPicker;
