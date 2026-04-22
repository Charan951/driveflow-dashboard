import express from 'express';
import { protect, admin, merchant } from '../middleware/authMiddleware.js';
import {
  createBooking,
  getMyBookings,
  getAllBookings,
  updateBookingStatus,
  generateDeliveryOtp,
  verifyDeliveryOtp,
  getUserBookings,
  getVehicleBookings,
  getMerchantBookings,
  getBookingById,
  assignBooking,
  updateBookingDetails,
  uploadCarWashBeforePhotos,
  uploadCarWashAfterPhotos,
  startCarWash,
  completeCarWash,
  getCarWashBookings,
  batteryTireApproval,
  addWarranty,
  updateMessageApprovalStatus,
} from '../controllers/bookingController.js';
import { getBookingInvoice } from '../controllers/bookingInvoiceController.js';

const router = express.Router();

router.route('/')
  .post(protect, createBooking)
  .get(protect, merchant, getAllBookings);

router.route('/mybookings').get(protect, getMyBookings);
router.route('/user/:userId').get(protect, getUserBookings);
router.route('/vehicle/:vehicleId').get(protect, getVehicleBookings);
router.route('/merchant/:merchantId').get(protect, merchant, getMerchantBookings);

// Car wash specific routes
router.route('/carwash').get(protect, getCarWashBookings);
router.route('/:bookingId/carwash/before-photos').put(protect, uploadCarWashBeforePhotos);
router.route('/:bookingId/carwash/after-photos').put(protect, uploadCarWashAfterPhotos);
router.route('/:bookingId/carwash/start').put(protect, startCarWash);
router.route('/:bookingId/carwash/complete').put(protect, completeCarWash);

// Battery/Tire specific routes
router.route('/:id/battery-tire-approval').put(protect, batteryTireApproval);
router.route('/:id/warranty').put(protect, addWarranty);

router.route('/:id')
  .get(protect, getBookingById);

router.route('/:id/assign').put(protect, admin, assignBooking); // Admin only

router.route('/:id/status').put(protect, updateBookingStatus); // Permission handled in controller
router.post('/:id/generate-otp', protect, generateDeliveryOtp);
router.post('/:id/verify-otp', protect, verifyDeliveryOtp);

router.route('/:id/details').put(protect, updateBookingDetails);

router.route('/message/:messageId/approval').put(protect, updateMessageApprovalStatus);

router.route('/:id/invoice').get(protect, getBookingInvoice);

export default router;
