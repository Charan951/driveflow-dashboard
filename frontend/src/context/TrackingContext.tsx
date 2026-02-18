import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { socketService } from '@/services/socket';
import { updateMyLocation, updateOnlineStatus } from '@/services/trackingService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { bookingService, Booking } from '@/services/bookingService';

interface TrackingContextType {
  isTracking: boolean;
  location: { lat: number; lng: number } | null;
  error: string | null;
  lastUpdate: Date | null;
  lastServerSync: Date | null;
  activeBookingId: string | null;
  startTracking: () => void;
  stopTracking: () => void;
  setActiveBookingId: (id: string | null) => void;
}

interface LocationPayload {
  userId?: string;
  role?: string;
  subRole?: string;
  lat: number;
  lng: number;
  timestamp: string;
  bookingId?: string;
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
  const [activeBookingId, _setActiveBookingId] = useState<string | null>(() => {
    return localStorage.getItem('activeBookingId') || null;
  });

  const watchId = useRef<number | null>(null);
  const lastRestUpdate = useRef<number>(0);
  const lastSocketUpdate = useRef<number>(0);

  const activeBookingIdRef = useRef<string | null>(null);

  const setActiveBookingId = (id: string | null) => {
    _setActiveBookingId(id);
  };

  const handlePositionUpdate = async (position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;
    const now = Date.now();
    
    try {
      setLocation({ lat: latitude, lng: longitude });
      
      if (now - lastSocketUpdate.current > 5000) {
        const payload: LocationPayload = {
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
        await updateMyLocation(latitude, longitude, undefined, activeBookingIdRef.current || undefined);
        lastRestUpdate.current = now;
        setLastServerSync(new Date());
        // toast.success('Location synced to server'); // Optional: too noisy if global
      }
      
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to update server', err);
    }
  };

  // Attempt native background tracking if available (Capacitor/Cordova)
  const bgRef = useRef<{ stop?: () => Promise<void> | void } | null>(null);

  const tryStartNativeBackground = async () => {
    try {
      const capWindow = window as unknown as {
        Capacitor?: { Plugins?: Record<string, unknown> };
        BackgroundGeolocation?: unknown;
      };
      const cap = capWindow.Capacitor;
      const plugins = cap?.Plugins || {};
      const bg =
        plugins?.BackgroundGeolocation ||
        capWindow.BackgroundGeolocation ||
        plugins?.CapacitorBackgroundGeolocation ||
        null;

      if (!bg) return;

      if (typeof bg === 'object' && bg !== null && 'addListener' in bg && 'start' in bg) {
        type BackgroundLocation =
          | { latitude?: number; longitude?: number; coords?: { latitude?: number; longitude?: number } }
          | null
          | undefined;

        const plugin = bg as {
          addListener: (event: string, cb: (loc: BackgroundLocation) => void) => Promise<{ remove?: () => Promise<void> | void }>;
          start: () => Promise<void> | void;
          stop?: () => Promise<void> | void;
        };

        const onLoc = async (loc: BackgroundLocation) => {
          const lat = loc?.latitude ?? loc?.coords?.latitude;
          const lng = loc?.longitude ?? loc?.coords?.longitude;
          if (typeof lat === 'number' && typeof lng === 'number') {
            setLocation({ lat, lng });
            const payload: LocationPayload = {
              userId: user?._id,
              role: user?.role,
              subRole: user?.subRole,
              lat,
              lng,
              timestamp: new Date().toISOString()
            };
            if (activeBookingIdRef.current) payload.bookingId = activeBookingIdRef.current;
            socketService.emit('location', payload);
            try {
              await updateMyLocation(lat, lng, undefined, activeBookingIdRef.current || undefined);
              setLastServerSync(new Date());
            } catch (error) {
              console.error('Background geo REST sync failed', error);
            }
            setLastUpdate(new Date());
          }
        };
        const sub = await plugin.addListener('location', onLoc);
        await plugin.start();
        bgRef.current = {
          stop: async () => {
            try {
              await plugin.stop?.();
            } catch (error) {
              console.error('Failed to stop background tracking', error);
            }
            try {
              await sub?.remove?.();
            } catch (error) {
              console.error('Failed to remove background listener', error);
            }
          }
        };
        return;
      }

      if (typeof bg === 'object' && bg !== null && 'addWatcher' in bg) {
        const watcherPlugin = bg as {
          addWatcher: (
            options: {
              backgroundMessage: string;
              backgroundTitle: string;
              requestPermissions: boolean;
              stale: boolean;
            },
            callback: (
              loc: { latitude?: number; longitude?: number } | null,
              err: { message?: string } | null
            ) => void
          ) => Promise<string | number>;
          removeWatcher?: (args: { id: string | number }) => Promise<void> | void;
        };

        const watcherId = await watcherPlugin.addWatcher(
          {
            backgroundMessage: 'Location service running',
            backgroundTitle: 'VehicleCare',
            requestPermissions: true,
            stale: false
          },
          async (
            loc: { latitude?: number; longitude?: number } | null,
            err: { message?: string } | null
          ) => {
            if (err) return;
            if (!loc) return;
            const lat = loc?.latitude;
            const lng = loc?.longitude;
            if (typeof lat === 'number' && typeof lng === 'number') {
              setLocation({ lat, lng });
              const payload: LocationPayload = {
                userId: user?._id,
                role: user?.role,
                subRole: user?.subRole,
                lat,
                lng,
                timestamp: new Date().toISOString()
              };
              if (activeBookingIdRef.current) payload.bookingId = activeBookingIdRef.current;
              socketService.emit('location', payload);
              try {
                await updateMyLocation(lat, lng, undefined, activeBookingIdRef.current || undefined);
                setLastServerSync(new Date());
              } catch (error) {
                console.error('Background watcher REST sync failed', error);
              }
              setLastUpdate(new Date());
            }
          }
        );
        bgRef.current = {
          stop: async () => {
            try {
              await watcherPlugin.removeWatcher?.({ id: watcherId });
            } catch (error) {
              console.error('Failed to remove background watcher', error);
            }
          }
        };
      }
    } catch {
      // Ignore plugin errors on web
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

    // Start native background if available (no-op on web)
    tryStartNativeBackground();
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (bgRef.current?.stop) {
      try {
        bgRef.current.stop();
      } catch (error) {
        console.error('Failed to stop native background tracking', error);
      }
      bgRef.current = null;
    }
    setIsTracking(false);
    localStorage.setItem('isTracking', 'false');
    
    // Set status to offline
    updateOnlineStatus(false).catch(err => console.error('Failed to set offline status', err));
  };

  useEffect(() => {
    activeBookingIdRef.current = activeBookingId;
    if (activeBookingId) {
      localStorage.setItem('activeBookingId', activeBookingId);
      socketService.connect();
      if (!isTracking) {
        startTracking();
      }
    } else {
      localStorage.removeItem('activeBookingId');
    }
  }, [activeBookingId, isTracking, startTracking]);

  // Restore tracking on mount if persisted
  useEffect(() => {
    if (isTracking) {
      startTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-clear activeBookingId when next milestone is reached
  useEffect(() => {
    if (!activeBookingId) return;
    socketService.connect();
    const handler = (updatedBooking: Booking) => {
      if (!updatedBooking || String(updatedBooking._id) !== String(activeBookingId)) return;
      const status = updatedBooking.status;
      if (status === 'REACHED_MERCHANT' || status === 'VEHICLE_AT_MERCHANT' || status === 'DELIVERED' || status === 'CANCELLED') {
        _setActiveBookingId(null);
        localStorage.removeItem('activeBookingId');
        toast.success('Reached milestone; live sharing unbound from booking');
      }
    };
    socketService.on('bookingUpdated', handler);
    return () => {
      socketService.off('bookingUpdated', handler);
    };
  }, [activeBookingId]);

  useEffect(() => {
    let timer: number | null = null;
    const statuses = ['ASSIGNED','ACCEPTED','REACHED_CUSTOMER','VEHICLE_PICKED','REACHED_MERCHANT','SERVICE_COMPLETED','OUT_FOR_DELIVERY','QC_PENDING'];
    const sync = async () => {
      if (!user?._id || user.role !== 'staff') return;
      if (!isTracking) return;
      try {
        const bookings = (await bookingService.getMyBookings()) as Booking[];
        const active = bookings.find((b) => statuses.includes(b.status));
        if (active?._id && activeBookingId !== active._id) {
          _setActiveBookingId(active._id);
          localStorage.setItem('activeBookingId', active._id);
        }
        if (!active && activeBookingId) {
          _setActiveBookingId(null);
          localStorage.removeItem('activeBookingId');
        }
      } catch (error) {
        console.error('Failed to auto-bind active booking', error);
      }
    };
    sync();
    timer = window.setInterval(sync, 60000);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [user?._id, user?.role, isTracking, activeBookingId]);

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
      activeBookingId,
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
