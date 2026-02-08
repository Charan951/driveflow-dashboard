import mongoose from 'mongoose';

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
    status: {
      type: String,
      required: true,
      enum: ['Booked', 'Pickup Assigned', 'In Garage', 'Servicing', 'Ready', 'Delivered', 'Cancelled'],
      default: 'Booked',
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    media: [{
      type: String, // URLs to images/videos
    }],
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
    }],
    notes: {
      type: String,
    },
    location: {
      type: String, // Address or coordinates
    },
    pickupRequired: {
      type: Boolean,
      default: false,
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    pickupDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
