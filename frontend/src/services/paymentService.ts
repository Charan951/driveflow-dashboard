import api from './api';
import { Booking } from './bookingService';

// Payment interfaces
export interface PaymentOrder {
  orderId: string;
  paymentSessionId: string;
  amount: number;
  currency: string;
  paymentId: string;
  environment: 'sandbox' | 'production';
  tempBookingData?: Record<string, unknown>;
  isTemporaryBooking?: boolean;
}

export interface PaymentVerification {
  orderId: string;
  bookingId?: string;
}

export interface PaymentData {
  _id: string;
  userId: string;
  bookingId: string;
  orderId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: 'created' | 'attempted' | 'paid' | 'failed' | 'refunded' | 'partial_refund';
  cashfreeOrderId?: string;
  cashfreePaymentId?: string;
  failureReason?: string;
  refundId?: string;
  refundAmount: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    name: string;
    email: string;
    phone: string;
  };
  booking?: Booking;
  // Legacy fields for backward compatibility
  platformFee?: number;
  merchantEarnings?: number;
  date?: string;
  billing?: {
    invoiceNumber: string;
    invoiceDate: string;
    fileUrl: string;
    total: number;
  };
}

export interface PaymentHistory {
  payments: PaymentData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const paymentService = {
  /**
   * Create Cashfree order
   */
  createOrder: async (bookingId?: string, amount?: number, currency = 'INR', tempBookingData?: Record<string, unknown>): Promise<PaymentOrder> => {
    const requestData: Record<string, unknown> = { 
      amount,
      currency
    };

    if (tempBookingData) {
      requestData.tempBookingData = tempBookingData;
    }
    
    // Only add bookingId if it's a non-empty string and not the string 'undefined'
    if (bookingId && typeof bookingId === 'string' && bookingId.trim() !== '' && bookingId !== 'undefined' && bookingId !== 'null') {
      requestData.bookingId = bookingId;
    }

    const response = await api.post('/payments/create-order', requestData);
    return response.data.data;
  },

  /**
   * Verify payment with Cashfree
   */
  verifyPayment: async (data: PaymentVerification) => {
    const response = await api.post('/payments/verify', data);
    return response.data;
  },

  /**
   * Get payment by ID
   */
  getPaymentStatus: async (paymentId: string): Promise<PaymentData> => {
    const response = await api.get(`/payments/status/${paymentId}`);
    return response.data.data;
  },

  /**
   * Get user payment history
   */
  getPaymentHistory: async (page = 1, limit = 10): Promise<PaymentHistory> => {
    const response = await api.get(`/payments/history?page=${page}&limit=${limit}`);
    return response.data;
  },

  /**
   * Get all payments (Admin only)
   */
  getAllPayments: async (page = 1, limit = 20, filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.startDate && { startDate: filters.startDate }),
      ...(filters?.endDate && { endDate: filters.endDate })
    });

    const response = await api.get(`/payments/all?${params}`);
    return response.data;
  },

  /**
   * Process refund (Admin only)
   */
  processRefund: async (paymentId: string, amount?: number, reason?: string) => {
    const response = await api.post('/payments/refund', {
      paymentId,
      amount,
      reason
    });
    return response.data;
  },

  retryPayment: async (orderId: string): Promise<PaymentOrder> => {
    const response = await api.post('/payments/retry', { orderId });
    return response.data.data;
  },

  getUserOrders: async () => {
    const response = await api.get('/payments/orders');
    return response.data.data;
  }
};
