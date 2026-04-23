import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import crypto from 'crypto';
import { emitBookingUpdate } from './bookingController.js';
import { emitEntitySync } from '../utils/syncService.js';
import { sendPushToUser } from '../utils/pushService.js';
import paymentService from '../services/paymentService.js';
import { logAudit } from './auditController.js';

/**
 * @desc    Create Razorpay order
 * @route   POST /api/payments/create-order
 * @access  Private
 */
export const createOrder = async (req, res) => {
  try {
    const { bookingId, amount, currency = 'INR', tempBookingData } = req.body;
    const userId = req.user._id;

    // Handle temporary booking creation (Car Wash, Battery, Tires)
    if (tempBookingData && tempBookingData.requiresPaymentService) {
      // For services requiring payment first, create order with temp data
      const orderData = await paymentService.createOrder(
        userId, 
        null, // No booking ID yet
        tempBookingData.totalAmount, 
        currency,
        tempBookingData // Pass temp data to be stored in payment metadata
      );

      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          ...orderData,
          tempBookingData,
          isTemporaryBooking: true
        }
      });
    }

    // Handle existing booking payment
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required for existing bookings'
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check ownership
    if (booking.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create payment for this booking'
      });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this booking'
      });
    }

    const orderAmount = amount || booking.totalAmount;
    const orderData = await paymentService.createOrder(userId, bookingId, orderAmount, currency);

    // Log audit
    await logAudit({
      user: userId,
      action: 'CREATE_PAYMENT_ORDER',
      targetModel: 'Payment',
      targetId: orderData.paymentId,
      details: { bookingId, amount: orderAmount },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: orderData
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
};

/**
 * @desc    Verify Razorpay payment
 * @route   POST /api/payments/verify
 * @access  Private
 */
export const verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      bookingId,
      tempBookingData 
    } = req.body;

    // Verify payment and process results (includes creating booking if temp data exists)
    const { payment, booking } = await paymentService.processSuccessfulPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    // If a new booking was created (for Car Wash, Battery, Tires etc.)
    if (!bookingId && booking) {
      // The booking was created by the service layer.
      // We just need to handle notifications here.
      
      // Populate for real-time consumers
      const populated = await Booking.findById(booking._id)
        .populate('user', 'id name email phone')
        .populate('vehicle')
        .populate('services');

      // Emit socket event for real-time updates
      emitBookingUpdate(populated);

      // Import required models for notifications
      const Service = (await import('../models/Service.js')).default;
      const services = await Service.find({ _id: { $in: booking.services } });
      const serviceNames = services.map(s => s.name).join(', ');
      const serviceType = services.some(s => s.category === 'Car Wash' || s.category === 'Wash') 
        ? 'Car Wash' 
        : services.some(s => s.category === 'Battery' || s.category === 'Tyre & Battery')
        ? 'Battery'
        : services.some(s => s.category === 'Essentials')
        ? 'Essentials'
        : 'Tire';

      // Send email confirmation
      if (req.user.email) {
        const { sendEmail } = await import('../utils/emailService.js');
        sendEmail(
          req.user.email,
          `${serviceType} Service Booking Confirmed`,
          `Dear ${req.user.name},\n\nYour ${serviceType.toLowerCase()} service booking has been confirmed!\n\nBooking Details:\n- Services: ${serviceNames}\n- Date: ${new Date(booking.date).toLocaleDateString()}\n- Amount Paid: ₹${booking.totalAmount}\n- Order Number: #${booking.orderNumber}\n- Payment ID: ${razorpay_payment_id}\n\nOur team will assign staff to your booking shortly.\n\nThank you for choosing DriveFlow!`
        ).catch(emailError => console.error('Error sending confirmation email:', emailError));
      }

      // Send push notification
      await sendPushToUser(
        req.user._id,
        `${serviceType} Booking Confirmed`,
        `Payment successful! Your service booking #${booking.orderNumber} has been created. We'll assign staff shortly.`,
        { type: 'service_confirmed', bookingId: booking._id.toString() }
      );

      // Log audit
      await logAudit({
        user: req.user._id,
        action: 'PAYMENT_VERIFIED_NEW_BOOKING',
        targetModel: 'Booking',
        targetId: booking._id,
        details: { paymentId: razorpay_payment_id, amount: booking.totalAmount },
        ipAddress: req.ip
      });

      return res.json({
        success: true,
        message: 'Payment verified and booking created successfully',
        data: {
          payment,
          booking,
          paymentId: razorpay_payment_id,
          status: 'paid'
        }
      });
    }

    // Handle existing booking payment verification
    if (booking) {
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

      // Send notifications
      const bookingIdStr = String(populated._id);
      const orderNum = populated.orderNumber || bookingIdStr.slice(-6).toUpperCase();
      
      if (booking.carWash?.isCarWashService) {
        await sendPushToUser(
          booking.user,
          'Car Wash Payment Confirmed',
          `Payment for car wash service #${orderNum} has been confirmed. We'll assign staff shortly.`,
          { type: 'car_wash_confirmed', bookingId: bookingIdStr }
        );
      } else {
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
    }

    // Log audit
    await logAudit({
      user: req.user._id,
      action: 'PAYMENT_VERIFIED',
      targetModel: 'Payment',
      targetId: payment._id,
      details: { paymentId: razorpay_payment_id, bookingId },
      ipAddress: req.ip
    });

    // Real-time Sync for payment entity
    emitEntitySync('payment', 'updated', payment);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        payment,
        booking,
        paymentId: razorpay_payment_id,
        status: 'paid'
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Payment verification failed'
    });
  }
};

/**
 * @desc    Handle Razorpay webhook
 * @route   POST /api/payments/webhook
 * @access  Public (but verified)
 */
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.get('X-Razorpay-Signature');
    const body = req.rawBody; // Use original raw body string

    const result = await paymentService.processWebhookEvent(req.body, signature, body);

    if (result.processed) {
      console.log('Webhook processed successfully:', req.body.event);
      
      // Log audit for webhook processing
      await logAudit({
        user: null, // System action
        action: 'WEBHOOK_PROCESSED',
        targetModel: 'Payment',
        targetId: result.payment?._id,
        details: { event: req.body.event, paymentId: result.payment?.razorpayPaymentId },
        ipAddress: req.ip
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Webhook processing failed'
    });
  }
};

/**
 * @desc    Get payment status
 * @route   GET /api/payments/status/:id
 * @access  Private
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentDetails(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check ownership
    if (payment.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment status'
    });
  }
};

/**
 * @desc    Get user payment history
 * @route   GET /api/payments/history
 * @access  Private
 */
export const getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const result = await paymentService.getUserPayments(userId, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result.payments,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment history'
    });
  }
};

/**
 * @desc    Process refund (Admin only)
 * @route   POST /api/payments/refund
 * @access  Private (Admin)
 */
export const processRefund = async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can process refunds'
      });
    }

    const result = await paymentService.refundPayment(paymentId, amount, reason);

    // Log audit
    await logAudit({
      user: req.user._id,
      action: 'PAYMENT_REFUNDED',
      targetModel: 'Payment',
      targetId: paymentId,
      details: { refundAmount: amount || result.payment.amount, reason },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: result
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process refund'
    });
  }
};


/**
 * @desc    Get all payments (Admin only)
 * @route   GET /api/payments/all
 * @access  Private (Admin)
 */
export const getAllPayments = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view all payments'
      });
    }

    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter)
      .populate('userId', 'name email phone')
      .populate('bookingId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    // Calculate summary statistics
    const stats = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalPaid: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] 
            } 
          },
          totalRefunded: { $sum: '$refundAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats[0] || { totalAmount: 0, totalPaid: 0, totalRefunded: 0, count: 0 }
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payments'
    });
  }
};
