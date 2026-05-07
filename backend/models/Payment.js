import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    default: null
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: false // Allow null for temporary bookings
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  cashfreeOrderId: {
    type: String
  },
  cashfreePaymentId: {
    type: String,
    sparse: true
  },
  cfPaymentSessionId: {
    type: String
  },
  paymentId: {
    type: String
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['created', 'attempted', 'paid', 'failed', 'pending', 'user_dropped', 'expired', 'refunded', 'partial_refund'],
    default: 'created'
  },
  paymentMethod: {
    type: mongoose.Schema.Types.Mixed,
    default: 'UNKNOWN'
  },
  bankReference: {
    type: String
  },
  transactionId: {
    type: String
  },
  cashfreeSignature: {
    type: String
  },
  failureReason: {
    type: String
  },
  refundId: {
    type: String
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  webhookEvents: [{
    eventId: String,
    event: String,
    processedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ cashfreeOrderId: 1 });
paymentSchema.index({ cashfreePaymentId: 1 }, { sparse: true });
paymentSchema.index({ status: 1 });

// Virtual for payment URL (if needed)
paymentSchema.virtual('paymentUrl').get(function() {
  return `${process.env.FRONTEND_URL}/payment/${this.orderId}`;
});

export default mongoose.model('Payment', paymentSchema);
