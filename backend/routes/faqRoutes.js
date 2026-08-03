import express from 'express';
import {
  getPublicFaqs,
  getAdminFaqs,
  createCategory,
  updateCategory,
  deleteCategory,
  createFaqItem,
  updateFaqItem,
  deleteFaqItem,
} from '../controllers/faqController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route
router.get('/', getPublicFaqs);

// Admin routes
router.get('/admin', protect, admin, getAdminFaqs);

// Category / Heading routes
router.post('/categories', protect, admin, createCategory);
router.put('/categories/:id', protect, admin, updateCategory);
router.delete('/categories/:id', protect, admin, deleteCategory);

// Question & Answer Item routes
router.post('/items', protect, admin, createFaqItem);
router.put('/items/:id', protect, admin, updateFaqItem);
router.delete('/items/:id', protect, admin, deleteFaqItem);

export default router;
