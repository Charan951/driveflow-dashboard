import api from './api';

export interface Coupon {
  _id: string;
  code: string;
  discountPercentage: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  usageLimit?: number;
  usageCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidatedCoupon {
  valid: boolean;
  coupon?: {
    _id: string;
    code: string;
    discountPercentage: number;
    maxDiscountAmount?: number;
    minOrderAmount: number;
    description?: string;
    discountAmount: number;
  };
  message?: string;
}

export const couponService = {
  getCoupons: async (): Promise<Coupon[]> => {
    const response = await api.get('/coupons');
    return response.data;
  },

  getCoupon: async (id: string): Promise<Coupon> => {
    const response = await api.get(`/coupons/${id}`);
    return response.data;
  },

  validateCoupon: async (code: string, orderAmount: number): Promise<ValidatedCoupon> => {
    const response = await api.post('/coupons/validate', { code, orderAmount });
    return response.data;
  },

  createCoupon: async (data: Omit<Coupon, '_id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<Coupon> => {
    const response = await api.post('/coupons', data);
    return response.data;
  },

  updateCoupon: async (id: string, data: Partial<Omit<Coupon, '_id' | 'createdAt' | 'updatedAt'>>): Promise<Coupon> => {
    const response = await api.put(`/coupons/${id}`, data);
    return response.data;
  },

  deleteCoupon: async (id: string): Promise<void> => {
    await api.delete(`/coupons/${id}`);
  },
};
