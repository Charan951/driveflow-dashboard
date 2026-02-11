import express from 'express';
import { protect, admin, merchant } from '../middleware/authMiddleware.js';
import {
  createBooking,
  getMyBookings,
  getAllBookings,
  updateBookingStatus,
  getUserBookings,
  getVehicleBookings,
  getMerchantBookings,
  getBookingById,
  assignBooking,
  updateBookingDetails,
} from '../controllers/bookingController.js';
import { getBookingInvoice } from '../controllers/bookingInvoiceController.js';

const router = express.Router();

router.route('/')
  .post(protect, createBooking)
  .get(protect, merchant, getAllBookings);

router.route('/mybookings').get(protect, getMyBookings);
router.route('/user/:userId').get(protect, merchant, getUserBookings);
router.route('/vehicle/:vehicleId').get(protect, merchant, getVehicleBookings);
router.route('/merchant/:merchantId').get(protect, admin, getMerchantBookings);

router.route('/:id')
  .get(protect, getBookingById);

router.route('/:id/assign').put(protect, admin, assignBooking); // Admin only

router.route('/:id/status').put(protect, updateBookingStatus); // Permission handled in controller

router.route('/:id/details').put(protect, updateBookingDetails);

router.route('/:id/invoice').get(protect, getBookingInvoice);

export default router;
