import Booking from '../models/Booking.js';
import crypto from 'crypto';

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
    
    await booking.save();

    res.json({ 
      message: 'Dummy payment successful', 
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
