import api from './api';
import { Vehicle } from './vehicleService';
import { Service } from './serviceService';

export interface Booking {
  _id: string;
  user: string | { _id: string; name: string; email: string; phone?: string };
  vehicle: Vehicle | string;
  services: Service[] | string[];
  date: string;
  status: 'Booked' | 'Pickup Assigned' | 'In Garage' | 'Servicing' | 'Ready' | 'Delivered' | 'Cancelled';
  totalAmount: number;
  notes?: string;
  location?: string;
  pickupRequired: boolean;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentId?: string;
  createdAt: string;
  merchant?: { _id: string; name: string; email: string; phone?: string };
  pickupDriver?: { _id: string; name: string; email: string; phone?: string };
  technician?: { _id: string; name: string; email: string; phone?: string };
  media?: string[];
  parts?: {
    product?: string | { _id: string; name: string; price: number };
    name?: string;
    quantity: number;
    price: number;
  }[];
}

export const bookingService = {
  createBooking: async (data: {
    vehicleId: string;
    serviceIds: string[];
    date: string;
    notes?: string;
    location?: string;
    pickupRequired: boolean;
  }) => {
    const response = await api.post('/bookings', data);
    return response.data;
  },

  getMyBookings: async () => {
    const response = await api.get('/bookings/mybookings');
    return response.data;
  },

  // Admin/Garage
  getAllBookings: async () => {
    const response = await api.get('/bookings');
    return response.data;
  },

  getUserBookings: async (userId: string) => {
    const response = await api.get(`/bookings/user/${userId}`);
    return response.data;
  },

  getVehicleBookings: async (vehicleId: string) => {
    const response = await api.get(`/bookings/vehicle/${vehicleId}`);
    return response.data;
  },

  getMerchantBookings: async (merchantId: string) => {
    const response = await api.get(`/bookings/merchant/${merchantId}`);
    return response.data;
  },

  getBookingById: async (id: string) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  updateBookingStatus: async (id: string, status: string) => {
    const response = await api.put(`/bookings/${id}/status`, { status });
    return response.data;
  },

  assignBooking: async (id: string, data: { merchantId?: string; driverId?: string; technicianId?: string; slot?: string }) => {
    const response = await api.put(`/bookings/${id}/assign`, data);
    return response.data;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateBookingDetails: async (id: string, data: { media?: string[]; parts?: any[]; notes?: string }) => {
    const response = await api.put(`/bookings/${id}/details`, data);
    return response.data;
  },
};
