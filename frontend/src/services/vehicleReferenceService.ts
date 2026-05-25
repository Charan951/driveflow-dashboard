import api from './api';

export const importVehicleReference = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/vehicle-reference/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getVehicleReference = async () => {
  const response = await api.get('/vehicle-reference');
  return response.data;
};

export const searchVehicleReference = async (brand_name: string, model: string, variant?: string) => {
  const b = (brand_name || '').trim();
  const m = (model || '').trim();
  if (!b || !m) return null;
  const params = new URLSearchParams({ brand_name: b, model: m });
  const v = (variant || '').trim();
  if (v) params.set('variant', v);
  try {
    const response = await api.get(`/vehicle-reference/search?${params.toString()}`);
    return response.data;
  } catch {
    return null;
  }
};

export const createVehicleReference = async (data: any) => {
  const response = await api.post('/vehicle-reference', data);
  return response.data;
};

export const updateVehicleReference = async (id: string, data: any) => {
  const response = await api.put(`/vehicle-reference/${id}`, data);
  return response.data;
};

export const deleteVehicleReference = async (id: string) => {
  const response = await api.delete(`/vehicle-reference/${id}`);
  return response.data;
};

export const deleteAllVehicleReference = async () => {
  const response = await api.delete('/vehicle-reference/all');
  return response.data;
};
