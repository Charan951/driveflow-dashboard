import mongoose from 'mongoose';

const faqCategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Category title is required'],
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

const FaqCategory = mongoose.model('FaqCategory', faqCategorySchema);

export default FaqCategory;
