import mongoose from 'mongoose';

const faqItemSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FaqCategory',
      required: [true, 'Category is required'],
    },
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const FaqItem = mongoose.model('FaqItem', faqItemSchema);

export default FaqItem;
