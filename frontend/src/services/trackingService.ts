import api from './api';

export interface LocationPoint {
  lat: number;
  lng: number;
  updatedAt: string;
  address?: string;
}

export interface TrackedStaff {
  _id: string;
  name: string;
  role?: string;
  subRole?: string;
  phone?: string;
  email: string;
  isOnline?: boolean;
  isShopOpen?: boolean;
  lastSeen?: string;
  location: LocationPoint;
  currentJob?: {
    _id: string;
    location: string;
    status: string;
    date: string;
  } | null;
}

export interface TrackedVehicle {
  _id: string;
  make: string;
  model: string;
  licensePlate: string;
  status: string;
  type: string;
  location: LocationPoint;
  user?: {
    name: string;
  };
}

export interface LiveData {
  staff: TrackedStaff[];
  vehicles: TrackedVehicle[];
  merchants: TrackedStaff[]; // Merchants share similar structure to Staff
  timestamp: string;
}

export const getLiveLocations = async () => {
  const response = await api.get('/tracking');
  return response.data;
};

export const updateMyLocation = async (lat: number, lng: number, address?: string) => {
  const response = await api.put('/tracking/user', { lat, lng, address });
  return response.data;
};

export const updateOnlineStatus = async (isOnline: boolean) => {
  const response = await api.put('/users/online-status', { isOnline });
  return response.data;
};
