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
      required: [true, 'Email is required.'],
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email cannot be longer than 254 characters.'],
      validate: {
        validator: function (email) {
          if (!email) return false;
          if (!/^[a-zA-Z]/.test(email)) return false;
          if (/\s/.test(email)) return false;
          if (/\.\./.test(email)) return false;
          if (/^\./.test(email) || /\.$/.test(email) || /@\./.test(email) || /\.@/.test(email)) return false;
          if ((email.match(/@/g) || []).length !== 1) return false;
          const domainPart = email.split('@')[1];
          if (!domainPart || !domainPart.includes('.')) return false;
          const domainParts = domainPart.split('.');
          if (domainParts.some(part => part === '')) return false;
          const validExtensions = new Set(['com', 'in', 'org', 'net', 'co', 'io', 'tech', 'app', 'dev', 'edu', 'gov', 'mil']);
          const extension = domainParts[domainParts.length - 1].toLowerCase();
          if (!validExtensions.has(extension)) {
            if (domainParts.length >= 2) {
              const lastPart = domainParts[domainParts.length - 1];
              if (!validExtensions.has(lastPart)) return false;
            } else {
              return false;
            }
          }
          return true;
        },
        message: 'Please enter a valid email address.'
      }
    },
    password: {
      type: String,
      required: true,
      maxlength: 100,
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
