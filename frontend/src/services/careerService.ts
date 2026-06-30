import api from './api';

export interface Career {
  _id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  salary?: string;
  shortDescription?: string;
  applyUrl?: string;
  isActive: boolean;
  applicationCount?: number;
}

export interface CareerPayload {
  title: string;
  department: string;
  location: string;
  type: string;
  salary?: string;
  shortDescription?: string;
  applyUrl?: string;
  isActive?: boolean;
}

export interface CareerApplication {
  _id: string;
  career: string;
  name: string;
  email: string;
  mobileNumber: string;
  resumeUrl: string;
  additionalMessage?: string;
  status: 'new' | 'reviewed' | 'shortlisted' | 'rejected';
  createdAt?: string;
}

export const careerService = {
  getPublicCareers: async (): Promise<Career[]> => {
    const response = await api.get('/careers');
    return response.data;
  },
  getAdminCareers: async (): Promise<Career[]> => {
    const response = await api.get('/careers/admin/all');
    return response.data;
  },
  getAdminCareerById: async (id: string): Promise<Career> => {
    const response = await api.get(`/careers/admin/${id}`);
    return response.data;
  },
  getCareerApplications: async (id: string): Promise<CareerApplication[]> => {
    const response = await api.get(`/careers/admin/${id}/applications`);
    return response.data;
  },
  getCareerById: async (id: string): Promise<Career> => {
    const response = await api.get(`/careers/${id}`);
    return response.data;
  },
  applyForCareer: async (
    id: string,
    data: {
      name: string;
      email: string;
      mobileNumber: string;
      resumeUrl: string;
      additionalMessage?: string;
      captchaInput: string;
      captchaSignature: string;
      captchaExpiry: number;
    }
  ) => {
    const response = await api.post(`/careers/${id}/apply`, data);
    return response.data;
  },
  createCareer: async (data: CareerPayload) => {
    const response = await api.post('/careers', data);
    return response.data;
  },
  updateCareer: async (id: string, data: Partial<CareerPayload>) => {
    const response = await api.put(`/careers/${id}`, data);
    return response.data;
  },
  deleteCareer: async (id: string) => {
    const response = await api.delete(`/careers/${id}`);
    return response.data;
  },
};
