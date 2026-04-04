import express from 'express';
import { upload, uploadFile, uploadFiles } from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Upload single file
router.post('/', protect, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
  });
}, uploadFile);

// Upload multiple files
router.post('/multiple', protect, (req, res, next) => {
  console.log('Multiple upload request received');
  upload.array('files', 20)(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    console.log('Multer successfully processed files:', req.files?.length || 0);
    next();
  });
}, uploadFiles);

export default router;
