import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Can be Merchant or Staff
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking', // Optional link to booking
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
  },
  category: {
    type: String,
    enum: ['Merchant', 'Staff', 'Platform'], // Who is being rated
    required: true,
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
  isAccepted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;
