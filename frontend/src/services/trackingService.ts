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
  subRole: string;
  phone?: string;
  email: string;
  location: LocationPoint;
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
  timestamp: string;
}

export const getLiveLocations = async () => {
  const response = await api.get('/tracking');
  return response.data;
};

export const updateMyLocation = async (lat: number, lng: number) => {
  const response = await api.put('/tracking/user', { lat, lng });
  return response.data;
};
