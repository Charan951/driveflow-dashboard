import mongoose from 'mongoose';
import Counter from './Counter.js';

const bookingSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Vehicle',
    },
    services: [{
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Service',
    }],
    date: {
      type: Date,
      required: true,
    },
    orderNumber: {
      type: Number,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        'CREATED', 
        'ASSIGNED', 
        'ACCEPTED',
        'REACHED_CUSTOMER',
        'VEHICLE_PICKED', 
        'REACHED_MERCHANT', 
        'VEHICLE_AT_MERCHANT', 
        'SERVICE_STARTED', 
        'SERVICE_COMPLETED', 
        'OUT_FOR_DELIVERY', 
        'DELIVERED', 
        'COMPLETED',
        'CANCELLED'
      ],
      default: 'CREATED',
    },
    inspection: {
      photos: [String],
      damageReport: String,
      additionalParts: [{
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 },
        approved: { type: Boolean, default: false },
        approvalStatus: {
          type: String,
          enum: ['Pending', 'Approved', 'Rejected'],
          default: 'Pending'
        },
        image: String,
        oldImage: String
      }],
      completedAt: Date
    },
    delay: {
      isDelayed: { type: Boolean, default: false },
      reason: { 
        type: String, 
        enum: ['Waiting for parts', 'Customer approval pending', 'Other'] 
      },
      note: String,
      startTime: Date
    },
    serviceExecution: {
      jobStartTime: Date,
      jobEndTime: Date,
      beforePhotos: [String],
      duringPhotos: [String],
      afterPhotos: [String],
    },
    qc: {
      testRide: { type: Boolean, default: false },
      safetyChecks: { type: Boolean, default: false },
      noLeaks: { type: Boolean, default: false },
      noErrorLights: { type: Boolean, default: false },
      checklist: { type: Map, of: Boolean }, // Flexible checklist
      notes: String,
      completedAt: Date,
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    billing: {
      invoiceNumber: String,
      invoiceDate: Date,
      fileUrl: String, // Photo/PDF
      labourCost: { type: Number, default: 0 },
      gst: { type: Number, default: 0 },
      partsTotal: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    revisit: {
      isRevisit: { type: Boolean, default: false },
      originalBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
      reason: String
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    media: [{
      type: String, // URLs to images/videos
    }],
    prePickupPhotos: [String],
    parts: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      name: {
        type: String, // Allow manual entry if not linked to a product
      },
      quantity: {
        type: Number,
        default: 1,
      },
      price: {
        type: Number, // Price at the time of usage
        required: true,
      },
      image: String,
    }],
    notes: {
      type: String,
    },
    location: {
      address: { type: String },
      lat: { type: Number },
      lng: { type: Number }
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    pickupDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    deliveryOtp: {
      code: { type: String },
      expiresAt: { type: Date },
      attempts: { type: Number, default: 0 },
      verifiedAt: { type: Date },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    paymentId: {
      type: String, // Razorpay payment ID
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    merchantEarnings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ merchant: 1, createdAt: -1 });

bookingSchema.pre('save', async function () {
  if (!this.isNew) return;
  if (this.orderNumber != null) return;
  const seq = await Counter.next('booking');
  this.orderNumber = seq;
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
