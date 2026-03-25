import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'merchant', 'staff'],
    default: 'customer',
    index: true,
  },
  subRole: {
    type: String,
    enum: ['Driver', 'Support', 'Manager', null],
    default: null,
    index: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave'],
    default: 'Active',
    index: true,
  },
  isOnline: {
    type: Boolean,
    default: false,
    index: true,
  },
  isShopOpen: {
    type: Boolean,
    default: true,
    index: true,
  },
  lastSeen: {
    type: Date,
  },
  isApproved: {
    type: Boolean,
    default: false,
    index: true,
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  phone: {
    type: String,
  },
  addresses: [
    {
      label: { type: String, default: 'Home' },
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      isDefault: { type: Boolean, default: false }
    }
  ],
  paymentMethods: [
    {
      type: { type: String, enum: ['card', 'upi', 'wallet'], required: true },
      label: { type: String, required: true }, // e.g., "HDFC Card", "GPay UPI"
      details: { type: String }, // e.g., "**** 1234"
      isDefault: { type: Boolean, default: false }
    }
  ],
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
    updatedAt: { type: Date }
  },
  geo: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      default: [0, 0] // Provide a default to avoid index errors on empty arrays
    }
  },
  fcmTokens: [
    {
      token: { type: String, required: false },
      deviceType: { type: String, enum: ['android', 'ios', 'web'], default: 'android' },
      lastUpdated: { type: Date, default: Date.now }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create 2dsphere index on the geo field for geospatial queries
userSchema.index({ geo: '2dsphere' });

// Pre-save hook to clean fcmTokens and handle password encryption
userSchema.pre('save', async function () {
  // Clean up fcmTokens: remove any that don't have a token or are empty
  if (this.isModified('fcmTokens') || (this.fcmTokens && Array.isArray(this.fcmTokens))) {
    const originalLength = this.fcmTokens?.length || 0;
    this.fcmTokens = (this.fcmTokens || []).filter(t => t && typeof t.token === 'string' && t.token.trim() !== '');
    
    // If we changed the array, mark it as modified to ensure Mongoose saves the change
    if (this.fcmTokens.length !== originalLength) {
      this.markModified('fcmTokens');
    }
  }

  // Encrypt password if modified
  if (!this.isModified('password')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
