import api from './api';

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 2048;
          const MAX_HEIGHT = 2048;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.9
          );
        } catch (err) {
          console.error('Canvas compression error:', err);
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export const uploadService = {
  uploadFile: async (file: File) => {
    let fileToUpload = file;
    
    // Compress if it's an image
    if (file.type.startsWith('image/')) {
      fileToUpload = await compressImage(file);
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
      fileToUpload = await compressImage(file);
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
        fileToUpload = await compressImage(file);
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
