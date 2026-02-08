import express from 'express';
import {
  getDashboardStats,
  getRevenueAnalytics,
  getTopServices,
  getMerchantPerformance,
} from '../controllers/reportController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', protect, admin, getDashboardStats);
router.get('/revenue', protect, admin, getRevenueAnalytics);
router.get('/top-services', protect, admin, getTopServices);
router.get('/merchants', protect, admin, getMerchantPerformance);

export default router;
