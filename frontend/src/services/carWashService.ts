import api from './api';
import { Booking } from './bookingService';

export interface CarWashBooking extends Booking {
  carWash: {
    isCarWashService: boolean;
    beforeWashPhotos: string[];
    afterWashPhotos: string[];
    washStartedAt?: string;
    washCompletedAt?: string;
    staffAssigned?: {
      _id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
}

export const carWashService = {
  // Get all car wash bookings (staff sees only their assigned ones)
  getCarWashBookings: async (): Promise<CarWashBooking[]> => {
    const response = await api.get('/bookings/carwash');
    return response.data;
  },

  // Upload before wash photos
  uploadBeforePhotos: async (bookingId: string, photos: string[]) => {
    const response = await api.put(`/bookings/${bookingId}/carwash/before-photos`, {
      photos
    });
    return response.data;
  },

  // Upload after wash photos
  uploadAfterPhotos: async (bookingId: string, photos: string[]) => {
    const response = await api.put(`/bookings/${bookingId}/carwash/after-photos`, {
      photos
    });
    return response.data;
  },

  // Start car wash
  startCarWash: async (bookingId: string) => {
    const response = await api.put(`/bookings/${bookingId}/carwash/start`);
    return response.data;
  },

  // Complete car wash
  completeCarWash: async (bookingId: string, photos?: string[]) => {
    const response = await api.put(`/bookings/${bookingId}/carwash/complete`, { photos });
    return response.data;
  },
};