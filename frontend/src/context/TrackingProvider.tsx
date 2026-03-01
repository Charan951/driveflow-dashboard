import React, { useEffect, useRef, useState, useCallback } from 'react';
import { socketService } from '@/services/socket';
import { updateMyLocation, updateOnlineStatus } from '@/services/trackingService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { bookingService, Booking } from '@/services/bookingService';
import { TrackingContext, TrackingContextType } from './TrackingContext';

interface LocationPayload {
  userId?: string;
  role?: string;
  subRole?: string;
  lat: number;
  lng: number;
  timestamp: string;
  bookingId?: string;
}

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
    const cached = localStorage.getItem('activeBookingId') || null;
    return cached;
  });

  const watchId = useRef<number | null>(null);
  const lastRestUpdate = useRef<number>(0);
  const lastSocketUpdate = useRef<number>(0);

  const activeBookingIdRef = useRef<string | null>(localStorage.getItem('activeBookingId') || null);

  const setActiveBookingId = useCallback((id: string | null) => {
    _setActiveBookingId(id);
    activeBookingIdRef.current = id;
    if (id) {
      localStorage.setItem('activeBookingId', id);
    } else {
      localStorage.removeItem('activeBookingId');
    }
  }, []);

  const handlePositionUpdate = useCallback(async (position: GeolocationPosition) => {
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
      }
      
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to update server', err);
    }
  }, [user?._id, user?.role, user?.subRole]);

  // Attempt native background tracking if available (Capacitor/Cordova)
  const bgRef = useRef<{ stop?: () => Promise<void> | void } | null>(null);

  const tryStartNativeBackground = useCallback(async () => {
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
    } catch (error) {
      console.error('Native background tracking failed', error);
    }
  }, [user?._id, user?.role, user?.subRole]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsTracking(true);
    localStorage.setItem('isTracking', 'true');
    setError(null);
    socketService.connect();
    
    updateOnlineStatus(true).catch(err => console.error('Failed to set online status', err));
    
    if (user?._id) {
        socketService.joinRoom(`user-${user._id}`);
    }

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
          if (highAccuracy && (err.code === 2 || err.code === 3)) { 
             console.warn('High accuracy failed, switching to low accuracy...', err);
             startWatch(false);
          } else {
             console.error('Tracking error:', err);
             if (err.code === 1) { 
                setError('Location permission denied');
                setIsTracking(false);
                toast.error('Location permission denied. Please enable location services.');
             }
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 8000 : 15000,
          maximumAge: highAccuracy ? 5000 : 30000
        }
      );
    };

    startWatch(true);
    tryStartNativeBackground();
  }, [handlePositionUpdate, tryStartNativeBackground, user?._id]);

  const stopTracking = useCallback(() => {
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
    updateOnlineStatus(false).catch(err => console.error('Failed to set offline status', err));
  }, []);

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

  useEffect(() => {
    if (isTracking) {
      startTracking();
    }
  }, [isTracking, startTracking]);

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

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      socketService.disconnect();
    };
  }, []);

  const value: TrackingContextType = {
    isTracking,
    location,
    error,
    lastUpdate,
    lastServerSync,
    activeBookingId,
    startTracking,
    stopTracking,
    setActiveBookingId
  };

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
};
