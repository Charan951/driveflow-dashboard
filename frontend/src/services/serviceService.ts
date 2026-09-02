import api from './api';

export interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  estimationTime?: string;
  category: 'Services' | 'Periodic' | 'Wash' | 'Car Wash' | 'Tyre & Battery' | 'Tyres' | 'Battery' | 'Painting' | 'Denting' | 'Repair' | 'Detailing' | 'AC' | 'Accessories' | 'Essentials' | 'Other';
  /** Which per-vehicle price column (from Vehicle Reference Data / the
   * admin stock sheet) this service's price is looked up from at booking
   * time, instead of the flat `price` above. Empty/undefined = flat price. */
  vehiclePricingColumn?: '' | 'car_wash_exterior_price' | 'car_wash_interior_exterior_price' | 'car_wash_interior_exterior_underbody_price' | 'general_service_price';
  vehicleType: 'Car';
  image?: string;
  features?: string[];
  isQuickService?: boolean;
  isPremiumService?: boolean;
}

export const serviceService = {
  getServices: async (vehicleType?: string, category?: string, isQuickService?: boolean, isPremiumService?: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {};
    if (vehicleType) params.vehicleType = vehicleType;
    if (category) params.category = category;
    if (isQuickService !== undefined) params.isQuickService = isQuickService;
    if (isPremiumService !== undefined) params.isPremiumService = isPremiumService;
    const response = await api.get('/services', { params });
    return response.data;
  },

  getService: async (id: string) => {
    const response = await api.get(`/services/${id}`);
    return response.data;
  },
  
  // Admin only
  createService: async (data: Omit<Service, '_id'>) => {
    const response = await api.post('/services', data);
    return response.data;
  },

  updateService: async (id: string, data: Partial<Service>) => {
    const response = await api.put(`/services/${id}`, data);
    return response.data;
  },

  deleteService: async (id: string) => {
    const response = await api.delete(`/services/${id}`);
    return response.data;
  },
};
