import api from './api';

export interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  category: 'Periodic' | 'Repair' | 'Wash' | 'Tyres' | 'Denting' | 'Painting' | 'Detailing' | 'AC' | 'Accessories' | 'Other';
  vehicleType: 'Car' | 'Bike';
  image?: string;
  features?: string[];
}

export const serviceService = {
  getServices: async (vehicleType?: string, category?: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {};
    if (vehicleType) params.vehicleType = vehicleType;
    if (category) params.category = category;
    const response = await api.get('/services', { params });
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
