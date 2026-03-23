import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';

// Rate limiting for payment endpoints
export const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 payment requests per windowMs
  message: {
    error: 'Too many payment requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper to check if a string is a valid MongoDB ObjectId
const isValidObjectId = (value) => {
  if (!value || value === '' || value === 'null' || value === 'undefined') return true;
  return mongoose.Types.ObjectId.isValid(value);
};

// Validation middleware for create order
export const validateCreateOrder = [
  body('amount')
    .optional({ values: 'falsy' })
    .isFloat({ min: 1 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional({ values: 'falsy' })
    .isIn(['INR', 'USD'])
    .withMessage('Currency must be INR or USD'),
  body('tempBookingData')
    .optional({ values: 'falsy' })
    .isObject()
    .withMessage('Temp booking data must be an object'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map(err => `${err.path}: ${err.msg}`).join(', ');
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errorDetails}`,
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation middleware for verify payment
export const validateVerifyPayment = [
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map(err => `${err.path}: ${err.msg}`).join(', ');
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errorDetails}`,
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation middleware for refund
export const validateRefund = [
  body('paymentId')
    .isMongoId()
    .withMessage('Invalid payment ID'),
  body('amount')
    .optional({ values: 'falsy' })
    .isFloat({ min: 1 })
    .withMessage('Refund amount must be a positive number'),
  body('reason')
    .optional({ values: 'falsy' })
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map(err => `${err.path}: ${err.msg}`).join(', ');
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errorDetails}`,
        errors: errors.array()
      });
    }
    next();
  }
];

// Webhook signature verification middleware
export const verifyWebhookSignature = (req, res, next) => {
  const signature = req.get('X-Razorpay-Signature');
  
  if (!signature) {
    return res.status(400).json({
      success: false,
      message: 'Missing webhook signature'
    });
  }

  // If body is already a buffer (from express.raw)
  if (Buffer.isBuffer(req.body)) {
    req.rawBody = req.body.toString('utf8');
    try {
      req.body = JSON.parse(req.rawBody);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON in webhook body'
      });
    }
  } else {
    // Fallback if express.json was used instead of express.raw
    req.rawBody = JSON.stringify(req.body);
  }
  
  next();
};