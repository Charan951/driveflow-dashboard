import express from 'express';
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
  getPaymentHistory,
  processRefund,
  getAllPayments
} from '../controllers/paymentController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  paymentRateLimit,
  validateCreateOrder,
  validateVerifyPayment,
  validateRefund,
  verifyWebhookSignature
} from '../middleware/paymentMiddleware.js';

const router = express.Router();

// Public routes
router.post('/webhook', verifyWebhookSignature, handleWebhook);

// Protected routes
router.use(protect); // All routes below require authentication

// Payment operations
router.post('/create-order', paymentRateLimit, validateCreateOrder, createOrder);
router.post('/verify', validateVerifyPayment, verifyPayment);
router.get('/status/:id', getPaymentStatus);
router.get('/history', getPaymentHistory);

// Admin only routes
router.post('/refund', admin, validateRefund, processRefund);
router.get('/all', admin, getAllPayments);

export default router;