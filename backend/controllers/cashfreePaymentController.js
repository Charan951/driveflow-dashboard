import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import { Cashfree } from 'cashfree-pg';
import mongoose from 'mongoose';
import paymentService from '../services/paymentService.js';
import { logAudit } from './auditController.js';

export const createOrder = async (req, res) => {
  try {
    console.log('createOrder request body:', req.body);
    const { bookingId, amount, currency = 'INR', tempBookingData } = req.body;
    const userId = req.user._id;
    console.log('User ID:', userId);
    const safeBookingId = bookingId && mongoose.Types.ObjectId.isValid(bookingId) ? bookingId : null;
    console.log('Safe booking ID:', safeBookingId);
    let orderAmount = Number(amount || tempBookingData?.totalAmount);
    if (isNaN(orderAmount) || orderAmount < 1) {
      return res.status(400).json({ success: false, message: 'Invalid order amount' });
    }
    console.log('Order amount:', orderAmount);
    const orderData = await paymentService.createOrder(userId, safeBookingId, orderAmount, currency, tempBookingData || null);
    await logAudit({
      user: userId,
      action: 'CREATE_CASHFREE_ORDER',
      targetModel: 'Payment',
      targetId: orderData.paymentId,
      details: { bookingId: safeBookingId, amount: orderAmount },
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, message: 'Cashfree order created successfully', data: orderData });
  } catch (error) {
    console.error('Create order error in controller:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create order' });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const result = await paymentService.processOrderStatus(orderId);
    await logAudit({
      user: req.user._id,
      action: 'VERIFY_CASHFREE_PAYMENT',
      targetModel: 'Payment',
      targetId: result.payment?._id,
      details: { orderId, status: result.payment?.status },
      ipAddress: req.ip
    });
    res.json({ success: true, message: 'Payment status synced', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Payment verification failed' });
  }
};

export const handleWebhook = async (req, res) => {
  try {
    Cashfree.PGVerifyWebhookSignature(
      req.cashfreeSignature,
      req.rawBody,
      req.cashfreeTimestamp
    );
    const result = await paymentService.processWebhookEvent(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Webhook processing failed' });
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('bookingId').populate('userId', 'name email phone');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to get payment status' });
  }
};

export const retryPayment = async (req, res) => {
  try {
    const data = await paymentService.retryPayment(req.body.orderId, req.user._id);
    res.json({ success: true, message: 'Retry payment session generated', data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to retry payment' });
  }
};

export const processRefund = async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;
    const result = await paymentService.refundPayment(paymentId, amount, reason);
    res.json({ success: true, message: 'Refund initiated successfully', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to process refund' });
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const payments = await Payment.find({ userId: req.user._id }).populate('bookingId').sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    const total = await Payment.countDocuments({ userId: req.user._id });
    res.json({ success: true, data: payments, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to get payment history' });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch orders' });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = {};
    if (status) filter.status = status;
    const payments = await Payment.find(filter).populate('userId', 'name email phone').populate('bookingId').sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    const total = await Payment.countDocuments(filter);
    const stats = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          successAmount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
          refundedAmount: { $sum: '$refundAmount' },
          count: { $sum: 1 }
        }
      }
    ]);
    res.json({ success: true, data: payments, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }, stats: stats[0] || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch payments' });
  }
};
