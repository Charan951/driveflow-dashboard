import express from 'express';
import {
  createReview,
  getAllReviews,
  getTargetReviews,
  deleteReview,
  getPublicReviews,
} from '../controllers/reviewController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/public', getPublicReviews);
router.post('/', protect, createReview);
router.get('/all', protect, admin, getAllReviews);
router.get('/target/:targetId', protect, getTargetReviews);
router.delete('/:id', protect, admin, deleteReview);

export default router;
