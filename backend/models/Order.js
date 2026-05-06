import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    currency: {
      type: String,
      default: 'INR'
    },
    orderStatus: {
      type: String,
      enum: ['ACTIVE', 'PAID', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE'
    },
    paymentStatus: {
      type: String,
      enum: ['created', 'pending', 'paid', 'failed', 'user_dropped', 'expired', 'refunded', 'partial_refund'],
      default: 'created'
    },
    paymentSessionId: {
      type: String
    },
    paymentMethod: {
      type: String,
      default: 'UNKNOWN'
    },
    transactionId: {
      type: String
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    retryCount: {
      type: Number,
      default: 0
    },
    isRefunded: {
      type: Boolean,
      default: false
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      index: true
    }
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1, paymentStatus: 1 });

export default mongoose.model('Order', orderSchema);
