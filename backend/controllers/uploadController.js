import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config();

// Configure AWS S3 v3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Configure Multer Storage for memory
const storage = multer.memoryStorage();

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

// Helper to process and upload a single file
const processAndUpload = async (file) => {
  const folder = 'driveflow_uploads/';
  const fileName = `${Date.now().toString()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const key = folder + fileName;
  
  let buffer = file.buffer;
  let mimetype = file.mimetype;

  // Process images with sharp
  if (file.mimetype.startsWith('image/')) {
    try {
      buffer = await sharp(file.buffer)
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      mimetype = 'image/jpeg';
    } catch (error) {
      console.error('Sharp processing error:', error);
      // Fallback to original buffer if processing fails
    }
  }

  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  };

  await s3.send(new PutObjectCommand(uploadParams));

  // Construct the URL manually as S3Client.send doesn't return it
  const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return {
    url: fileUrl,
    filename: key,
    originalName: file.originalname,
    mimetype: mimetype,
    size: buffer.length
  };
};

// Single file upload handler
export const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  try {
    const result = await processAndUpload(req.file);
    res.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error processing/uploading file' });
  }
};

// Multiple file upload handler
export const uploadFiles = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const uploadPromises = req.files.map(file => processAndUpload(file));
    const files = await Promise.all(uploadPromises);
    res.json({ files });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ message: 'Error processing/uploading files' });
  }
};

export { upload };

