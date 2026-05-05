import api from './api';

export interface BlogCategory {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface BlogPost {
  _id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
  category: BlogCategory | string;
  isPublished: boolean;
  publishedAt?: string;
  tags?: string[];
  readTime?: string;
  createdAt?: string;
}

export interface BlogPayload {
  title: string;
  excerpt: string;
  content: string;
  image?: string;
  author?: string;
  category: string;
  isPublished?: boolean;
  tags?: string[];
  readTime?: string;
}

export const blogService = {
  getPublicCategories: async (): Promise<BlogCategory[]> => {
    const response = await api.get('/blogs/categories');
    return response.data;
  },

  getPublicBlogs: async (params?: { category?: string; search?: string }): Promise<BlogPost[]> => {
    const response = await api.get('/blogs', { params });
    return response.data;
  },

  getPublicBlogById: async (id: string): Promise<BlogPost> => {
    const response = await api.get(`/blogs/${id}`);
    return response.data;
  },

  getAdminCategories: async (): Promise<BlogCategory[]> => {
    const response = await api.get('/blogs/admin/categories');
    return response.data;
  },

  getAdminBlogs: async (): Promise<BlogPost[]> => {
    const response = await api.get('/blogs/admin/all');
    return response.data;
  },

  createCategory: async (data: { name: string; description?: string }) => {
    const response = await api.post('/blogs/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: { name?: string; description?: string; isActive?: boolean }) => {
    const response = await api.put(`/blogs/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string) => {
    const response = await api.delete(`/blogs/categories/${id}`);
    return response.data;
  },

  createBlog: async (data: BlogPayload) => {
    const response = await api.post('/blogs', data);
    return response.data;
  },

  updateBlog: async (id: string, data: Partial<BlogPayload>) => {
    const response = await api.put(`/blogs/${id}`, data);
    return response.data;
  },

  deleteBlog: async (id: string) => {
    const response = await api.delete(`/blogs/${id}`);
    return response.data;
  },
};
