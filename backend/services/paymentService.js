import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { emitBookingUpdate } from '../controllers/bookingController.js';

class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  /**
   * Create Razorpay order
   */
  async createOrder(userId, bookingId, amount, currency = 'INR', tempBookingData = null) {
    try {
      let booking = null;
      
      // If bookingId is provided, validate booking exists and belongs to user
      if (bookingId) {
        booking = await Booking.findById(bookingId).populate('user');
        if (!booking) {
          throw new Error('Booking not found');
        }

        if (booking.user._id.toString() !== userId.toString()) {
          throw new Error('Unauthorized access to booking');
        }

        if (booking.paymentStatus === 'paid') {
          throw new Error('Payment already completed for this booking');
        }
      }

      // Generate unique order ID
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create Razorpay order
      const razorpayOrder = await this.razorpay.orders.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: orderId,
        notes: {
          bookingId: bookingId ? bookingId.toString() : 'temp_booking',
          userId: userId.toString(),
        }
      });

      // Save payment record
      const payment = new Payment({
        userId,
        bookingId: bookingId || null, // Allow null for temporary bookings
        orderId,
        amount,
        currency,
        status: 'created',
        razorpayOrderId: razorpayOrder.id,
        metadata: {
          bookingDetails: booking ? {
            services: booking.services,
            vehicle: booking.vehicle,
            date: booking.date
          } : {},
          tempBookingData: tempBookingData // Store temporary data for post-payment booking creation
        }
      });

      await payment.save();

      return {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        paymentId: payment._id,
        key: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  /**
   * Verify payment signature
   */
  verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === razorpaySignature;
  }

  /**
   * Process successful payment
   */
  async processSuccessfulPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      // Verify signature
      if (!this.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
        throw new Error('Invalid payment signature');
      }

      // Find payment record
      const payment = await Payment.findOne({ razorpayOrderId });
      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Update payment status
      payment.status = 'paid';
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      await payment.save();

      let booking = null;

      // Create booking from temporary data if applicable
      if (!payment.bookingId && payment.metadata?.tempBookingData) {
        booking = await this.createBookingFromTempData(payment.metadata.tempBookingData, payment.userId, razorpayPaymentId);
        payment.bookingId = booking._id;
        await payment.save();
      } else if (payment.bookingId) {
        // Update existing booking
        booking = await Booking.findById(payment.bookingId);
        if (booking) {
          booking.paymentStatus = 'paid';
          booking.paymentId = razorpayPaymentId;
          
          // Calculate platform commission (10%)
          const commissionRate = 0.10;
          booking.platformFee = payment.amount * commissionRate;
          booking.merchantEarnings = payment.amount - booking.platformFee;
          
          await booking.save();
          
          // Emit socket update
          const populated = await Booking.findById(booking._id)
            .populate('user', 'id name email phone')
            .populate('vehicle')
            .populate('services')
            .populate('merchant', 'name email phone location')
            .populate('pickupDriver', 'name email phone')
            .populate('technician', 'name email phone')
            .populate('carWash.staffAssigned', 'name email phone');
          emitBookingUpdate(populated);
        }
      }

      return { payment, booking };
    } catch (error) {
      console.error('Error processing successful payment:', error);
      throw error;
    }
  }

  /**
   * Helper to create a booking from temporary data stored during order creation
   */
  async createBookingFromTempData(tempData, userId, paymentId) {
    try {
      const Counter = (await import('../models/Counter.js')).default;
      const orderNumber = await Counter.next('booking');
      
      const booking = new Booking({
        user: userId,
        vehicle: tempData.vehicleId,
        services: tempData.serviceIds,
        date: tempData.date,
        orderNumber,
        notes: tempData.notes,
        location: tempData.location,
        totalAmount: tempData.totalAmount,
        paymentStatus: 'paid',
        status: 'CREATED',
        paymentId: paymentId,
        carWash: {
          isCarWashService: !!tempData.isCarWashService || !!tempData.isEssentialsService,
          beforeWashPhotos: [],
          afterWashPhotos: [],
        },
        batteryTire: {
          isBatteryTireService: !!tempData.isBatteryTireService
        }
      });

      // Calculate platform commission (10%)
      const commissionRate = 0.10;
      booking.platformFee = tempData.totalAmount * commissionRate;
      booking.merchantEarnings = tempData.totalAmount - booking.platformFee;

      await booking.save();
      
      // Emit socket update
      const populated = await Booking.findById(booking._id)
        .populate('user', 'id name email phone')
        .populate('vehicle')
        .populate('services')
        .populate('merchant', 'name email phone location')
        .populate('pickupDriver', 'name email phone')
        .populate('technician', 'name email phone')
        .populate('carWash.staffAssigned', 'name email phone');
      emitBookingUpdate(populated);
      
      return populated;
    } catch (error) {
      console.error('Error creating booking from temp data:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  async handleFailedPayment(razorpayOrderId, failureReason) {
    try {
      const payment = await Payment.findOne({ razorpayOrderId });
      if (payment) {
        payment.status = 'failed';
        payment.failureReason = failureReason;
        await payment.save();
      }
      return payment;
    } catch (error) {
      console.error('Error handling failed payment:', error);
      throw error;
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentId) {
    try {
      const payment = await Payment.findById(paymentId)
        .populate('userId', 'name email phone')
        .populate('bookingId');
      return payment;
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw error;
    }
  }

  /**
   * Get user payments
   */
  async getUserPayments(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const payments = await Payment.find({ userId })
        .populate('bookingId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Payment.countDocuments({ userId });

      return {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching user payments:', error);
      throw error;
    }
  }

  /**
   * Refund payment (optional advanced feature)
   */
  async refundPayment(paymentId, amount = null, reason = '') {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment || payment.status !== 'paid') {
        throw new Error('Payment not found or not eligible for refund');
      }

      const refundAmount = amount || payment.amount;
      
      // Create refund with Razorpay
      const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: Math.round(refundAmount * 100), // Convert to paise
        notes: {
          reason,
          paymentId: paymentId.toString()
        }
      });

      // Update payment record
      payment.status = refundAmount === payment.amount ? 'refunded' : 'partial_refund';
      payment.refundId = refund.id;
      payment.refundAmount += refundAmount;
      await payment.save();

      // Update booking if fully refunded
      if (refundAmount === payment.amount) {
        await Booking.findByIdAndUpdate(payment.bookingId, {
          paymentStatus: 'refunded'
        });
      }

      return { refund, payment };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(event, signature, body) {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(body, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const { event: eventType, payload } = event;
      
      // Prevent duplicate processing
      const existingPayment = await Payment.findOne({
        'webhookEvents.eventId': payload.payment?.entity?.id || payload.order?.entity?.id
      });

      if (existingPayment) {
        console.log('Webhook event already processed:', eventType);
        return { processed: false, reason: 'Already processed' };
      }

      let payment;
      
      switch (eventType) {
        case 'payment.captured':
          payment = await this.handlePaymentCaptured(payload.payment.entity);
          break;
        case 'payment.failed':
          payment = await this.handlePaymentFailed(payload.payment.entity);
          break;
        case 'order.paid':
          payment = await this.handleOrderPaid(payload.order.entity);
          break;
        default:
          console.log('Unhandled webhook event:', eventType);
          return { processed: false, reason: 'Unhandled event type' };
      }

      // Log webhook event
      if (payment) {
        payment.webhookEvents.push({
          eventId: payload.payment?.entity?.id || payload.order?.entity?.id,
          event: eventType
        });
        await payment.save();
      }

      return { processed: true, payment };
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }
  }

  async handlePaymentCaptured(paymentEntity) {
    const payment = await Payment.findOne({ razorpayOrderId: paymentEntity.order_id });
    if (payment && payment.status !== 'paid') {
      payment.status = 'paid';
      payment.razorpayPaymentId = paymentEntity.id;
      
      // Handle temporary booking creation
      if (!payment.bookingId && payment.metadata?.tempBookingData) {
        const booking = await this.createBookingFromTempData(payment.metadata.tempBookingData, payment.userId, paymentEntity.id);
        payment.bookingId = booking._id;
      } else if (payment.bookingId) {
        // Update existing booking
        await Booking.findByIdAndUpdate(payment.bookingId, {
          paymentStatus: 'paid',
          paymentId: paymentEntity.id
        });
      }
      
      await payment.save();
    }
    return payment;
  }

  async handlePaymentFailed(paymentEntity) {
    const payment = await Payment.findOne({ razorpayOrderId: paymentEntity.order_id });
    if (payment) {
      payment.status = 'failed';
      payment.failureReason = paymentEntity.error_description || 'Payment failed';
      await payment.save();
    }
    return payment;
  }

  async handleOrderPaid(orderEntity) {
    const payment = await Payment.findOne({ razorpayOrderId: orderEntity.id });
    if (payment && payment.status !== 'paid') {
      payment.status = 'paid';
      
      // Handle temporary booking creation
      if (!payment.bookingId && payment.metadata?.tempBookingData) {
        const booking = await this.createBookingFromTempData(payment.metadata.tempBookingData, payment.userId, 'webhook_order_paid');
        payment.bookingId = booking._id;
      } else if (payment.bookingId) {
        // Update existing booking
        await Booking.findByIdAndUpdate(payment.bookingId, {
          paymentStatus: 'paid'
        });
      }
      
      await payment.save();
    }
    return payment;
  }
}

export default new PaymentService();
