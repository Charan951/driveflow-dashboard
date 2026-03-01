import api from './api';
import imageCompression from 'browser-image-compression';

const compressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
};

export const uploadService = {
  uploadFile: async (file: File) => {
    let fileToUpload = file;
    
    // Compress if it's an image
    if (file.type.startsWith('image/')) {
      try {
        fileToUpload = await imageCompression(file, compressionOptions);
      } catch (error) {
        console.error('Image compression failed:', error);
      }
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);

    const response = await api.post('/upload', formData);
    return response.data; // { url, filename, ... }
  },

  uploadFiles: async (files: File[]) => {
    const compressedFiles = await Promise.all(
      files.map(async (file) => {
        if (file.type.startsWith('image/')) {
          try {
            return await imageCompression(file, compressionOptions);
          } catch (error) {
            console.error('Image compression failed:', error);
            return file;
          }
        }
        return file;
      })
    );

    const formData = new FormData();
    compressedFiles.forEach(file => {
      formData.append('files', file);
    });

    const response = await api.post('/upload/multiple', formData);
    return response.data; // { files: [{ url, ... }] }
  }
};
