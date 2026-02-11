import api from './api';

export const uploadService = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload', formData);
    return response.data; // { url, filename, ... }
  },

  uploadFiles: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await api.post('/upload/multiple', formData);
    return response.data; // { files: [{ url, ... }] }
  }
};
