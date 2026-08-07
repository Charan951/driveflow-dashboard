import mongoose from 'mongoose';

// Backs the passwordless "log in with mobile number" flow: user enters just
// their phone number, we send an OTP, and verifying it logs them straight
// in (no password step) — separate from PendingLogin, which is keyed by
// email and used for the email+password+2FA-OTP flow.
const pendingPhoneLoginSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
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

pendingPhoneLoginSchema.index({ mobile: 1 }, { unique: true });

const PendingPhoneLogin = mongoose.model('PendingPhoneLogin', pendingPhoneLoginSchema);

export default PendingPhoneLogin;
