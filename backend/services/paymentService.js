import crypto from 'crypto';
import { Cashfree, CFEnvironment } from 'cashfree-pg';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import Refund from '../models/Refund.js';
import Booking from '../models/Booking.js';
import { emitBookingUpdate } from '../controllers/bookingController.js';

class PaymentService {
  constructor() {
    const env = process.env.CASHFREE_ENV === 'production' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
    this.cashfree = new Cashfree(env, process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY);
    this.maxRetryCount = Number(process.env.PAYMENT_MAX_RETRY_COUNT || 3);
  }

  /**
   * Create Cashfree order + local order/payment records
   */
  async createOrder(userId, bookingId, amount, currency = 'INR', tempBookingData = null) {
    const normalizedBookingId =
      bookingId && mongoose.Types.ObjectId.isValid(bookingId) ? bookingId : null;

    let booking = null;
    if (normalizedBookingId) {
      booking = await Booking.findById(normalizedBookingId).populate('user');
      if (!booking) throw new Error('Booking not found');
      if (booking.user._id.toString() !== userId.toString()) throw new Error('Unauthorized access to booking');
      if (booking.paymentStatus === 'paid') throw new Error('Payment already completed for this booking');
    }

    const activeOrder = await Order.findOne({
      userId,
      bookingId: normalizedBookingId,
      paymentStatus: { $in: ['created', 'pending'] },
      expiresAt: { $gt: new Date() }
    });
    if (activeOrder) {
      throw new Error('Active payment already exists. Please complete or retry.');
    }

    const orderId = `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const request = {
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: currency,
      customer_details: {
        customer_id: String(userId),
        customer_email: tempBookingData?.customerEmail || 'no-reply@driveflow.local',
        customer_phone: tempBookingData?.customerPhone || '9999999999'
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/payment/callback?order_id={order_id}`
      },
      order_expiry_time: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      order_note: normalizedBookingId ? `booking:${normalizedBookingId}` : 'temp-booking'
    };

    const cfRes = await this.cashfree.PGCreateOrder(request);
    const { payment_session_id: paymentSessionId, cf_order_id: cfOrderId, order_expiry_time: orderExpiryTime } = cfRes.data;

    const order = await Order.create({
      orderId,
      userId,
      bookingId: normalizedBookingId,
      amount,
      currency,
      paymentSessionId,
      gatewayResponse: cfRes.data,
      expiresAt: orderExpiryTime ? new Date(orderExpiryTime) : new Date(Date.now() + 15 * 60 * 1000)
    });

    const payment = await Payment.create({
      userId,
      bookingId: normalizedBookingId,
      orderId,
      cashfreeOrderId: cfOrderId,
      cfPaymentSessionId: paymentSessionId,
      amount,
      currency,
      status: 'created',
      gatewayResponse: cfRes.data,
      metadata: {
        bookingDetails: booking
          ? { services: booking.services, vehicle: booking.vehicle, date: booking.date }
          : {},
        tempBookingData
      }
    });

    return {
      orderId,
      paymentSessionId,
      amount,
      currency,
      paymentId: payment._id,
      environment: process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox'
    };
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
  async verifyPayment(orderId) {
    const paymentsResponse = await this.cashfree.PGOrderFetchPayments(orderId);
    const attempts = paymentsResponse?.data || [];
    if (!attempts.length) {
      return { status: 'PENDING', attempts: [] };
    }
    const finalAttempt = [...attempts].sort((a, b) => new Date(b.payment_time || 0) - new Date(a.payment_time || 0))[0];
    return { status: finalAttempt.payment_status, attempts, finalAttempt };
  }

  /**
   * Get payment details
   */
  async processOrderStatus(orderId) {
    const payment = await Payment.findOne({ orderId });
    if (!payment) throw new Error('Payment record not found');
    const order = await Order.findOne({ orderId });
    if (!order) throw new Error('Order record not found');

    if (order.expiresAt && order.expiresAt < new Date() && ['created', 'pending'].includes(order.paymentStatus)) {
      order.paymentStatus = 'expired';
      order.orderStatus = 'EXPIRED';
      payment.status = 'expired';
      await Promise.all([order.save(), payment.save()]);
      return { payment, order, booking: null };
    }

    const verify = await this.verifyPayment(orderId);
    const status = verify.status;
    let mappedStatus = 'pending';
    if (status === 'SUCCESS') mappedStatus = 'paid';
    if (status === 'FAILED') mappedStatus = 'failed';
    if (status === 'USER_DROPPED') mappedStatus = 'user_dropped';

    payment.status = mappedStatus;
    payment.gatewayResponse = { ...(payment.gatewayResponse || {}), verification: verify };
    payment.cashfreePaymentId = verify.finalAttempt?.cf_payment_id || payment.cashfreePaymentId;
    payment.paymentMethod = verify.finalAttempt?.payment_method || payment.paymentMethod;
    payment.bankReference = verify.finalAttempt?.bank_reference || payment.bankReference;
    payment.transactionId = verify.finalAttempt?.cf_payment_id || payment.transactionId;

    order.paymentStatus = mappedStatus;
    if (mappedStatus === 'paid') order.orderStatus = 'PAID';
    await Promise.all([payment.save(), order.save()]);

    let booking = null;
    if (mappedStatus === 'paid') {
      if (!payment.bookingId && payment.metadata?.tempBookingData) {
        booking = await this.createBookingFromTempData(payment.metadata.tempBookingData, payment.userId, payment.transactionId || 'cashfree');
        payment.bookingId = booking._id;
        await payment.save();
      } else if (payment.bookingId) {
        booking = await Booking.findById(payment.bookingId);
        if (booking) {
          booking.paymentStatus = 'paid';
          booking.paymentId = payment.transactionId || payment.cashfreePaymentId;
          const commissionRate = 0.1;
          booking.platformFee = payment.amount * commissionRate;
          booking.merchantEarnings = payment.amount - booking.platformFee;
          await booking.save();
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
    }

    return { payment, order, booking };
  }

  /**
   * Get user payments
   */
  async retryPayment(orderId, userId) {
    const order = await Order.findOne({ orderId, userId });
    if (!order) throw new Error('Order not found');
    if (order.retryCount >= this.maxRetryCount) throw new Error('Retry limit exceeded');
    if (order.paymentStatus === 'paid') throw new Error('Payment already completed');
    order.retryCount += 1;
    await order.save();
    return this.createOrder(userId, order.bookingId, order.amount, order.currency, null);
  }

  /**
   * Refund payment (optional advanced feature)
   */
  async refundPayment(paymentId, amount = null, reason = '') {
    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status !== 'paid') {
      throw new Error('Payment not found or not eligible for refund');
    }
    const refundAmount = Number(amount || payment.amount);
    const refundRequest = {
      refund_amount: refundAmount,
      refund_id: `rfnd_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      refund_note: reason || 'Admin initiated refund'
    };
    const response = await this.cashfree.PGOrderCreateRefund(payment.orderId, refundRequest);
    const refundData = response.data;
    await Refund.create({
      refundId: refundData.refund_id || refundRequest.refund_id,
      orderId: payment.orderId,
      paymentId: payment._id,
      amount: refundAmount,
      refundStatus: (refundData.refund_status || 'PENDING').toUpperCase(),
      reason,
      gatewayResponse: refundData
    });
    payment.status = refundAmount === payment.amount ? 'refunded' : 'partial_refund';
    payment.refundAmount += refundAmount;
    await payment.save();
    await Order.findOneAndUpdate(
      { orderId: payment.orderId },
      { isRefunded: payment.status === 'refunded', refundAmount: payment.refundAmount, paymentStatus: payment.status }
    );
    return { refund: refundData, payment };
  }

  async processWebhookEvent(event) {
    const orderId = event?.data?.order?.order_id || event?.order?.order_id || event?.order_id;
    const eventId = event?.cf_payment_id || event?.data?.payment?.cf_payment_id || `${event?.type || 'event'}_${orderId || 'unknown'}`;
    if (!orderId) return { processed: false, reason: 'Missing order_id' };
    const payment = await Payment.findOne({ orderId });
    if (!payment) return { processed: false, reason: 'Payment not found' };
    if (payment.webhookEvents.some((e) => e.eventId === eventId)) {
      return { processed: false, reason: 'Already processed' };
    }
    const result = await this.processOrderStatus(orderId);
    payment.webhookEvents.push({ eventId, event: event?.type || 'cf_webhook' });
    await payment.save();
    return { processed: true, payment: result.payment };
  }
}

export default new PaymentService();
