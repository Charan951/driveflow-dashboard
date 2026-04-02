import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isPDF = file.mimetype === 'application/pdf';
    
    // For PDFs, use 'raw' resource type to avoid image processing errors
    // and ensure the original file is served as-is
    if (isPDF) {
      return {
        folder: 'driveflow_uploads',
        resource_type: 'raw',
        public_id: `${file.fieldname}-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      };
    }

    // For images, use 'image' resource type with transformations
    return {
      folder: 'driveflow_uploads',
      resource_type: 'image',
      transformation: [
        { width: 800, height: 800, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
      ]
    };
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDF files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Single file upload handler
export const uploadFile = (req, res) => {
  

  if (!req.file) {
    
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  // Cloudinary returns the URL in path
  const fileUrl = req.file.path;
  
  res.json({ 
    url: fileUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
};

// Multiple file upload handler
export const uploadFiles = (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  const files = req.files.map(file => ({
    url: file.path,
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  }));

  res.json({ files });
};

export { upload };

