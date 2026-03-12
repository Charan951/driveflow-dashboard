import Booking from '../models/Booking.js';
import User from '../models/User.js';
import crypto from 'crypto';
import { emitBookingUpdate } from './bookingController.js';
import { sendPushToUser } from '../utils/pushService.js';

/**
 * @desc    Process dummy payment (replaces Razorpay)
 * @route   POST /api/payments/dummy-pay
 * @access  Private
 */
export const dummyPayment = async (req, res) => {
  const { bookingId } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check ownership
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to pay for this booking' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.json({ message: 'Payment already completed', booking });
    }

    // Process dummy payment
    booking.paymentStatus = 'paid';
    booking.paymentId = `dummy_pay_${crypto.randomBytes(8).toString('hex')}`;
    
    // Calculate platform commission (10%)
    const commissionRate = 0.10;
    booking.platformFee = booking.totalAmount * commissionRate;
    booking.merchantEarnings = booking.totalAmount - booking.platformFee;
    
    // For car wash services, do NOT auto-assign staff - admin will assign manually
    // Just update payment status and keep status as CREATED
    
    await booking.save();

    // Populate for real-time consumers
    const populated = await Booking.findById(booking._id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('merchant', 'name email phone location')
      .populate('pickupDriver', 'name email phone')
      .populate('technician', 'name email phone')
      .populate('carWash.staffAssigned', 'name email phone');

    // Emit socket event for real-time updates
    emitBookingUpdate(populated);

    // Notify customer and relevant parties
    const bookingIdStr = String(populated._id);
    const orderNum = populated.orderNumber || bookingIdStr.slice(-6).toUpperCase();
    
    if (booking.carWash?.isCarWashService) {
      // Car wash specific notifications
      await sendPushToUser(
        booking.user,
        'Car Wash Payment Confirmed',
        `Payment for car wash service #${orderNum} has been confirmed. Admin will assign staff to your booking shortly.`,
        { type: 'car_wash_confirmed', bookingId: bookingIdStr }
      );
    } else {
      // Regular service notifications
      if (populated.merchant?._id) {
        await sendPushToUser(
          populated.merchant._id,
          'Payment Received',
          `Payment for booking #${orderNum} has been completed.`,
          { type: 'payment_update', bookingId: bookingIdStr }
        );
      }
      
      if (populated.pickupDriver?._id) {
        await sendPushToUser(
          populated.pickupDriver._id,
          'Payment Completed',
          `Customer has paid for booking #${orderNum}. You can now proceed with delivery.`,
          { type: 'payment_update', bookingId: bookingIdStr }
        );
      }
    }

    res.json({ 
      message: booking.carWash?.isCarWashService ? 'Car wash payment successful and confirmed' : 'Dummy payment successful', 
      bookingId: booking._id,
      paymentId: booking.paymentId,
      status: 'paid'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Legacy Razorpay endpoints (Dummy placeholders)
 */
export const createOrder = async (req, res) => {
    res.status(410).json({ message: 'Razorpay integration removed. Use /api/payments/dummy-pay instead.' });
};

export const verifyPayment = async (req, res) => {
    res.status(410).json({ message: 'Razorpay integration removed. Use /api/payments/dummy-pay instead.' });
};

export const getAllPayments = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('user', 'name email')
      .populate('merchant', 'name')
      .populate('vehicle', 'make model registrationNumber')
      .sort({ createdAt: -1 });
      
    const payments = bookings.map(booking => ({
      _id: booking._id,
      bookingId: booking._id,
      user: booking.user,
      merchant: booking.merchant,
      vehicle: booking.vehicle,
      amount: booking.totalAmount,
      status: booking.paymentStatus,
      date: booking.createdAt,
      paymentId: booking.paymentId,
      platformFee: booking.platformFee || 0,
      merchantEarnings: booking.merchantEarnings || 0,
      billing: booking.billing,
    }));
    
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
