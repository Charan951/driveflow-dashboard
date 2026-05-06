import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    orderId: {
      type: String,
      required: true,
      index: true
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    refundStatus: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING'
    },
    reason: {
      type: String,
      default: ''
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

refundSchema.index({ createdAt: -1, refundStatus: 1 });

export default mongoose.model('Refund', refundSchema);
