import express from 'express';
import { 
    createOrder, 
    verifyPayment, 
    getAllPayments,
    dummyPayment 
} from '../controllers/paymentController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, admin, getAllPayments);
router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);
router.post('/dummy-pay', protect, dummyPayment);

export default router;
