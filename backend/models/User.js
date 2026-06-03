import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MAX_CONSECUTIVE_CHARS = 10;

const hasExcessiveRepeatedChars = (str) => {
  if (!str) return false;
  const regex = new RegExp(`(.)\\1{${MAX_CONSECUTIVE_CHARS},}`, 'g');
  return regex.test(str);
};

const nameValidator = {
  validator: function(value) {
    const trimmed = value.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length > 50) return false;
    if (hasExcessiveRepeatedChars(trimmed)) return false;
    return /^[a-zA-Z][a-zA-Z0-9\s'-]*$/.test(trimmed);
  },
  message: 'Name is invalid. Must be 1-50 characters, no excessive repeated characters'
};

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    validate: nameValidator,
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [35, 'Email cannot exceed 35 characters'],
    match: [/^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]*[a-zA-Z][a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    maxlength: [100, 'Password cannot exceed 100 characters'],
  },
  role: {
    type: String,
    enum: {
      values: ['customer', 'admin', 'merchant', 'staff'],
      message: 'Invalid role'
    },
    default: 'customer',
    index: true,
  },
  subRole: {
    type: String,
    enum: {
      values: ['Driver', 'Support', 'Manager', null],
      message: 'Invalid sub-role'
    },
    default: null,
    index: true,
  },
  status: {
    type: String,
    enum: {
      values: ['Active', 'Inactive', 'On Leave'],
      message: 'Invalid status'
    },
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
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
  },
  category: {
    type: [String],
    enum: {
      values: ['general', 'battery', 'tires'],
      message: 'Invalid category'
    },
    default: ['general'],
    index: true,
  },
  addresses: [
    {
      label: { 
        type: String, 
        default: 'Home', 
        trim: true,
        maxlength: [50, 'Address label cannot exceed 50 characters'],
      },
      address: { 
        type: String, 
        required: [true, 'Address is required'], 
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters'],
      },
      lat: { type: Number, required: [true, 'Latitude is required'] },
      lng: { type: Number, required: [true, 'Longitude is required'] },
      isDefault: { type: Boolean, default: false }
    }
  ],
  paymentMethods: [
    {
      type: { 
        type: String, 
        enum: ['card', 'upi', 'wallet'], 
        required: [true, 'Payment type is required'] 
      },
      label: { 
        type: String, 
        required: [true, 'Payment label is required'],
        trim: true,
        maxlength: [50, 'Payment label cannot exceed 50 characters'],
      },
      details: { 
        type: String,
        required: [true, 'Payment details are required'],
        trim: true,
        maxlength: [100, 'Payment details cannot exceed 100 characters'],
      },
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
    address: { 
      type: String,
      trim: true,
      maxlength: [500, 'Location address cannot exceed 500 characters'],
    },
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
      default: [0, 0]
    }
  },
  fcmTokens: [
    {
      token: { type: String, required: false, trim: true },
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

  // Mark addresses and paymentMethods as modified if they're being updated
  if (this.isModified('addresses')) {
    this.markModified('addresses');
  }
  if (this.isModified('paymentMethods')) {
    this.markModified('paymentMethods');
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
