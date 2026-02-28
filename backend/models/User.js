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
  },
  subRole: {
    type: String,
    enum: ['Driver', 'Support', 'Manager', null],
    default: null,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave'],
    default: 'Active',
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  isShopOpen: {
    type: Boolean,
    default: true,
  },
  lastSeen: {
    type: Date,
  },
  isApproved: {
    type: Boolean,
    default: false,
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
      index: '2dsphere'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password before saving
userSchema.pre('save', async function () {
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
