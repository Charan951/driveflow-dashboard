import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
    enum: ['created', 'attempted', 'paid', 'failed', 'refunded', 'partial_refund'],
    default: 'created'
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
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
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 }, { sparse: true }); // Only index non-null values
paymentSchema.index({ status: 1 });

// Virtual for payment URL (if needed)
paymentSchema.virtual('paymentUrl').get(function() {
  return `${process.env.FRONTEND_URL}/payment/${this.orderId}`;
});

export default mongoose.model('Payment', paymentSchema);