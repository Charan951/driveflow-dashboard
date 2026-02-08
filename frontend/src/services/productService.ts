import api from './api';

export interface Product {
  _id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
  merchant?: string;
}

export const getProducts = async () => {
  const response = await api.get('/products');
  return response.data;
};

export const createProduct = async (productData: Partial<Product>) => {
  const response = await api.post('/products', productData);
  return response.data;
};

export const updateProduct = async (id: string, productData: Partial<Product>) => {
  const response = await api.put(`/products/${id}`, productData);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};

export const getMerchantProducts = async (merchantId: string) => {
  const response = await api.get(`/products/merchant/${merchantId}`);
  return response.data;
};

export const getAllProducts = async () => {
  const response = await api.get('/products/all');
  return response.data;
};
