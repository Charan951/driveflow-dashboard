import mongoose from 'mongoose';

/**
 * Phone-first signup verification: the mobile number is OTP-verified up
 * front (e.g. right after login detects it's not registered), independent
 * of name/email/password, which get collected afterward on the same
 * screen. `verified` flips true once the OTP is confirmed; `completeSignup`
 * checks it before creating the account so the user isn't asked for a
 * second OTP.
 */
const pendingPhoneSignupSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
    },
    otpHash: {
      type: String,
      default: null,
    },
    verified: {
      type: Boolean,
      default: false,
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

pendingPhoneSignupSchema.index({ mobile: 1 }, { unique: true });

const PendingPhoneSignup = mongoose.model('PendingPhoneSignup', pendingPhoneSignupSchema);

export default PendingPhoneSignup;
