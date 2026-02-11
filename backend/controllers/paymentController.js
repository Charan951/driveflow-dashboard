import Razorpay from 'razorpay';
import crypto from 'crypto';
import Booking from '../models/Booking.js';
import dotenv from 'dotenv';

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
  const { bookingId } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check ownership (only user who made the booking can pay)
    // Allow admin to create order too if needed, but primarily for user
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(401).json({ message: 'Not authorized to pay for this booking' });
    }

    const options = {
      amount: Math.round(booking.totalAmount * 100), // amount in smallest currency unit, ensure integer
      currency: 'INR',
      receipt: `receipt_order_${bookingId}`,
    };

    const order = await razorpay.orders.create(options);

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

  const body = razorpay_order_id + '|' + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    // Payment success
    try {
        const booking = await Booking.findById(bookingId);
        if (booking) {
        
        if (booking.paymentStatus === 'paid') {
            return res.json({ message: 'Payment verified successfully' });
        }

        booking.paymentStatus = 'paid';
        booking.paymentId = razorpay_payment_id;
        
        // Calculate platform commission (e.g., 10%)
        const commissionRate = 0.10;
        booking.platformFee = booking.totalAmount * commissionRate;
        booking.merchantEarnings = booking.totalAmount - booking.platformFee;
        
        await booking.save();
      }
      res.json({ message: 'Payment verified successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else {
    res.status(400).json({ message: 'Invalid signature' });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('user', 'name email')
      .populate('merchant', 'name')
      .populate('vehicle', 'make model registrationNumber')
      .sort({ createdAt: -1 });
      
    // Transform into a payments view
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
    }));
    
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
