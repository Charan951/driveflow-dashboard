import api from './api';

export interface PaymentData {
  _id: string;
  bookingId: string;
  amount: number;
  platformFee: number;
  merchantEarnings: number;
  status: string;
  paymentId?: string;
  date: string;
  user?: {
    name: string;
    email: string;
  };
  billing?: {
    invoiceNumber: string;
    invoiceDate: string;
    fileUrl: string;
    total: number;
  };
}

export const paymentService = {
  // Dummy payment (replaces Razorpay)
  processDummyPayment: async (bookingId: string) => {
    const response = await api.post('/payments/dummy-pay', { bookingId });
    return response.data;
  },

  // Legacy Razorpay endpoints (Keeping for backward compatibility, though they will return 410)
  createOrder: async (bookingId: string) => {
    const response = await api.post('/payments/create-order', { bookingId });
    return response.data;
  },

  verifyPayment: async (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    bookingId: string;
  }) => {
    const response = await api.post('/payments/verify-payment', data);
    return response.data;
  },

  getAllPayments: async (): Promise<PaymentData[]> => {
    const response = await api.get('/payments');
    return response.data;
  },
};
