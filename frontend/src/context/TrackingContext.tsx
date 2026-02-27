import React, { createContext } from 'react';

export interface TrackingContextType {
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

export const TrackingContext = createContext<TrackingContextType | undefined>(undefined);
