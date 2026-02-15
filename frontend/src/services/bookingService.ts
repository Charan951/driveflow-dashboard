import api from './api';
import { Vehicle } from './vehicleService';
import { Service } from './serviceService';

export interface Booking {
  _id: string;
  user: string | { _id: string; name: string; email: string; phone?: string };
  vehicle: Vehicle | string;
  services: Service[] | string[];
  date: string;
  status: 'CREATED' | 'ASSIGNED' | 'ACCEPTED' | 'REACHED_CUSTOMER' | 'VEHICLE_PICKED' | 'REACHED_MERCHANT' | 'VEHICLE_AT_MERCHANT' | 'JOB_CARD' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  notes?: string;
  location?: {
    address: string;
    lat?: number;
    lng?: number;
  };
  pickupRequired: boolean;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentId?: string;
  createdAt: string;
  merchant?: { 
    _id: string; 
    name: string; 
    email: string; 
    phone?: string;
    location?: {
      lat?: number;
      lng?: number;
      address?: string;
    };
  };
  pickupDriver?: { _id: string; name: string; email: string; phone?: string };
  technician?: { _id: string; name: string; email: string; phone?: string };
  media?: string[];
  parts?: {
    product?: string | { _id: string; name: string; price: number };
    name?: string;
    quantity: number;
    price: number;
  }[];
  inspection?: {
    photos?: string[];
    damageReport?: string;
    additionalParts?: { name: string; price: number; quantity: number; approved: boolean; approvalStatus?: 'Pending' | 'Approved' | 'Rejected'; image?: string; oldImage?: string }[];
  };
  delay?: {
    isDelayed: boolean;
    reason: string;
    note?: string;
    startTime?: string;
  };
  serviceExecution?: {
    jobStartTime?: string;
    jobEndTime?: string;
    beforePhotos?: string[];
    duringPhotos?: string[];
    afterPhotos?: string[];
  };
  qc?: {
    testRide: boolean;
    safetyChecks: boolean;
    noLeaks: boolean;
    noErrorLights: boolean;
    checklist?: Record<string, boolean>;
    notes?: string;
    completedAt?: string;
    completedBy?: string;
  };
  billing?: {
    invoiceNumber: string;
    invoiceDate: string;
    fileUrl: string;
    labourCost: number;
    gst: number;
    partsTotal: number;
    total: number;
  };
  revisit?: {
    isRevisit: boolean;
    originalBookingId: string;
    reason: string;
  };
}

export const bookingService = {
  createBooking: async (data: {
    vehicleId: string;
    serviceIds: string[];
    date: string;
    notes?: string;
    location?: {
      address: string;
      lat?: number;
      lng?: number;
    };
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

  generateDeliveryOtp: async (id: string) => {
    const response = await api.post(`/bookings/${id}/generate-otp`, {});
    return response.data;
  },

  verifyDeliveryOtp: async (id: string, otp: string) => {
    const response = await api.post(`/bookings/${id}/verify-otp`, { otp });
    return response.data;
  },

  assignBooking: async (id: string, data: { merchantId?: string; driverId?: string; technicianId?: string; slot?: string }) => {
    const response = await api.put(`/bookings/${id}/assign`, data);
    return response.data;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateBookingDetails: async (id: string, data: { 
    media?: string[]; 
    parts?: any[]; 
    notes?: string;
    inspection?: any;
    delay?: any;
    serviceExecution?: any;
    qc?: any;
    billing?: any;
    revisit?: any;
  }) => {
    const response = await api.put(`/bookings/${id}/details`, data);
    return response.data;
  },
};
