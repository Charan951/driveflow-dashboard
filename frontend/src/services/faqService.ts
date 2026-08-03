import api from './api';

export interface PublicFaqItem {
  _id: string;
  q: string;
  a: string;
  order: number;
}

export interface PublicFaqCategory {
  _id: string;
  category: string;
  order: number;
  questions: PublicFaqItem[];
}

export interface AdminFaqQuestion {
  _id: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  categoryId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminFaqCategory {
  _id: string;
  title: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  questions: AdminFaqQuestion[];
}

export const faqService = {
  // Public get
  getPublicFaqs: async (): Promise<PublicFaqCategory[]> => {
    const response = await api.get('/faqs');
    return response.data;
  },

  // Admin get
  getAdminFaqs: async (): Promise<AdminFaqCategory[]> => {
    const response = await api.get('/faqs/admin');
    return response.data;
  },

  // Category / Heading CRUD
  createCategory: async (data: { title: string; order?: number; isActive?: boolean }): Promise<AdminFaqCategory> => {
    const response = await api.post('/faqs/categories', data);
    return response.data;
  },

  updateCategory: async (
    id: string,
    data: { title?: string; order?: number; isActive?: boolean }
  ): Promise<AdminFaqCategory> => {
    const response = await api.put(`/faqs/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/faqs/categories/${id}`);
    return response.data;
  },

  // Question & Answer Item CRUD
  createItem: async (data: {
    categoryId: string;
    question: string;
    answer: string;
    order?: number;
    isActive?: boolean;
  }): Promise<AdminFaqQuestion> => {
    const response = await api.post('/faqs/items', data);
    return response.data;
  },

  updateItem: async (
    id: string,
    data: {
      categoryId?: string;
      question?: string;
      answer?: string;
      order?: number;
      isActive?: boolean;
    }
  ): Promise<AdminFaqQuestion> => {
    const response = await api.put(`/faqs/items/${id}`, data);
    return response.data;
  },

  deleteItem: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/faqs/items/${id}`);
    return response.data;
  },
};

export default faqService;
