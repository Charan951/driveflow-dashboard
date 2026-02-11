import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { socketService } from '@/services/socket';
import { updateMyLocation, updateOnlineStatus } from '@/services/trackingService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface TrackingContextType {
  isTracking: boolean;
  location: { lat: number; lng: number } | null;
  error: string | null;
  lastUpdate: Date | null;
  lastServerSync: Date | null;
  startTracking: () => void;
  stopTracking: () => void;
  setActiveBookingId: (id: string | null) => void;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const [isTracking, setIsTracking] = useState(() => {
    return localStorage.getItem('isTracking') === 'true';
  });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [lastServerSync, setLastServerSync] = useState<Date | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const lastRestUpdate = useRef<number>(0);
  const lastSocketUpdate = useRef<number>(0);

  // Ref for activeBookingId to be accessible in the callback closure
  const activeBookingIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    activeBookingIdRef.current = activeBookingId;
  }, [activeBookingId]);

  const handlePositionUpdate = async (position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;
    const now = Date.now();
    
    try {
      setLocation({ lat: latitude, lng: longitude });
      
      // Emit via Socket.IO (Throttle to every 5 seconds for live feel)
      if (now - lastSocketUpdate.current > 5000) {
        const payload: any = {
          userId: user?._id,
          role: user?.role,
          subRole: user?.subRole,
          lat: latitude,
          lng: longitude,
          timestamp: new Date().toISOString()
        };

        if (activeBookingIdRef.current) {
          payload.bookingId = activeBookingIdRef.current;
        }

        socketService.emit('location', payload);
        lastSocketUpdate.current = now;
      }

      // Also update via REST for persistence (Throttle to every 2 minutes)
      if (now - lastRestUpdate.current > 120000) { // 2 minutes
        await updateMyLocation(latitude, longitude);
        lastRestUpdate.current = now;
        setLastServerSync(new Date());
        // toast.success('Location synced to server'); // Optional: too noisy if global
      }
      
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to update server', err);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsTracking(true);
    localStorage.setItem('isTracking', 'true');
    setError(null);
    socketService.connect();
    
    // Set status to online
    updateOnlineStatus(true).catch(err => console.error('Failed to set online status', err));
    
    if (user?._id) {
        socketService.joinRoom(`user-${user._id}`);
    }

    // Initial update - don't stop tracking on error, just log it
    navigator.geolocation.getCurrentPosition(
      (position) => handlePositionUpdate(position),
      (err) => {
        console.warn('Initial position check failed:', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );

    // Helper to start watching with specific accuracy
    const startWatch = (highAccuracy: boolean) => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }

      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          handlePositionUpdate(position);
          setError(null);
        },
        (err) => {
          // If high accuracy fails with timeout or unavailable, try low accuracy
          if (highAccuracy && (err.code === 2 || err.code === 3)) { // POSITION_UNAVAILABLE or TIMEOUT
             console.warn('High accuracy failed, switching to low accuracy...', err);
             toast('Weak GPS signal', { description: 'Switching to network location...' });
             startWatch(false);
          } else {
             console.error('Tracking error:', err);

             if (err.code === 1) { // PERMISSION_DENIED
                setError('Location permission denied');
                setIsTracking(false);
                toast.error('Location permission denied. Please enable location services.');
             } else if (!highAccuracy) {
                // Only show error toast if we are already in low accuracy mode or it's a different error
                toast.error(`Location error: ${err.message || 'Unknown error'}`);
             }
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: 20000,
          maximumAge: 5000
        }
      );
    };

    // Start with high accuracy
    startWatch(true);
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
    localStorage.setItem('isTracking', 'false');
    
    // Set status to offline
    updateOnlineStatus(false).catch(err => console.error('Failed to set offline status', err));
  };

  // Restore tracking on mount if persisted
  useEffect(() => {
    if (isTracking) {
      startTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount (of the provider, which is usually app close or logout)
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      socketService.disconnect();
    };
  }, []);

  return (
    <TrackingContext.Provider value={{
      isTracking,
      location,
      error,
      lastUpdate,
      lastServerSync,
      startTracking,
      stopTracking,
      setActiveBookingId
    }}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (context === undefined) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
};
