import express from 'express';
import { getAllDocuments } from '../controllers/documentController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, admin, getAllDocuments);

export default router;
