import mongoose from 'mongoose';

const pendingSignupSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    /** Set when OTP is sent via WhatsApp outbound (we verify locally). */
    otpHash: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

pendingSignupSchema.index({ mobile: 1 }, { unique: true });

const PendingSignup = mongoose.model('PendingSignup', pendingSignupSchema);

export default PendingSignup;
