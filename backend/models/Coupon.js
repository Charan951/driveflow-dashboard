import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  maxDiscountAmount: {
    type: Number,
    default: null
  },
  minOrderAmount: {
    type: Number,
    default: 0
  },
  usageLimit: {
    type: Number,
    default: null
  },
  usageCount: {
    type: Number,
    default: 0
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableServices: {
    type: [String],
    default: ['All']
  },
  targetUsers: [{
    email: String,
    mobile: String
  }],
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});


couponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
