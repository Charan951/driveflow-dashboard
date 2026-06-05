import api from './api';
import imageCompression from 'browser-image-compression';

const compressionOptions = {
  maxSizeMB: 0.2, // Reduced from 0.5MB to 0.2MB for faster uploads
  maxWidthOrHeight: 1024,
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

    // 1. Get Presigned URL
    const response = await api.get('/upload/presigned-url', {
      params: { filename: fileToUpload.name, fileType: fileToUpload.type }
    });
    const { presignedUrl, fileUrl, filename, originalName } = response.data;

    // 2. Upload directly to S3
    await fetch(presignedUrl, {
      method: 'PUT',
      body: fileToUpload,
      headers: {
        'Content-Type': fileToUpload.type,
      },
    });

    return { url: fileUrl, filename, originalName, mimetype: fileToUpload.type, size: fileToUpload.size };
  },

  uploadPublicFile: async (file: File) => {
    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
      try {
        fileToUpload = await imageCompression(file, compressionOptions);
      } catch (error) {
        console.error('Image compression failed:', error);
      }
    }

    // 1. Get Presigned URL
    const response = await api.get('/upload/presigned-url/public', {
      params: { filename: fileToUpload.name, fileType: fileToUpload.type }
    });
    const { presignedUrl, fileUrl, filename, originalName } = response.data;

    // 2. Upload directly to S3
    await fetch(presignedUrl, {
      method: 'PUT',
      body: fileToUpload,
      headers: {
        'Content-Type': fileToUpload.type,
      },
    });

    return { url: fileUrl, filename, originalName, mimetype: fileToUpload.type, size: fileToUpload.size };
  },

  uploadFiles: async (files: File[]) => {
    const uploadPromises = files.map(async (file) => {
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        try {
          fileToUpload = await imageCompression(file, compressionOptions);
        } catch (error) {
          console.error('Image compression failed:', error);
        }
      }

      const response = await api.get('/upload/presigned-url', {
        params: { filename: fileToUpload.name, fileType: fileToUpload.type }
      });
      const { presignedUrl, fileUrl, filename, originalName } = response.data;

      await fetch(presignedUrl, {
        method: 'PUT',
        body: fileToUpload,
        headers: {
          'Content-Type': fileToUpload.type,
        },
      });

      return { url: fileUrl, filename, originalName, mimetype: fileToUpload.type, size: fileToUpload.size };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    return { files: uploadedFiles };
  }
};
