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
  const v = (variant || '').trim();
  if (!b || !m || !v) return null;
  const url = `/vehicle-reference/search?brand_name=${encodeURIComponent(b)}&model=${encodeURIComponent(m)}&variant=${encodeURIComponent(v)}`;
  const response = await api.get(url);
  return response.data;
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
