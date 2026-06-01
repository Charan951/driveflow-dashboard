import mongoose from 'mongoose';

const MAX_CONSECUTIVE_CHARS = 10;

const hasExcessiveRepeatedChars = (str) => {
  if (!str) return false;
  const regex = new RegExp(`(.)\\1{${MAX_CONSECUTIVE_CHARS},}`, 'g');
  return regex.test(str);
};

const commentValidator = {
  validator: function(value) {
    if (!value) return true; // Optional field
    const trimmed = value.trim();
    if (trimmed.length > 1000) return false;
    if (hasExcessiveRepeatedChars(trimmed)) return false;
    return true;
  },
  message: 'Comment is invalid. Max 1000 characters, no excessive repeated characters'
};

const reviewSchema = new mongoose.Schema({
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Reviewer is required'],
    ref: 'User',
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
  },
  comment: {
    type: String,
    trim: true,
    validate: commentValidator,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
  },
  category: {
    type: String,
    enum: {
      values: ['Merchant', 'Staff', 'Platform'],
      message: 'Invalid category'
    },
    required: [true, 'Category is required'],
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
