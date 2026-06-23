import mongoose from 'mongoose';

const pendingLoginSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 35,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    mobile: {
      type: String,
      required: true,
    },
    otpHash: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    lastOtpSentAt: {
      type: Date,
    },
    otpVerifyAttempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

pendingLoginSchema.index({ email: 1 }, { unique: true });

const PendingLogin = mongoose.model('PendingLogin', pendingLoginSchema);

export default PendingLogin;
