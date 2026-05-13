import mongoose from 'mongoose';

const slotBlockSchema = mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    slot: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['All', 'General Services', 'Car Wash', 'Tyres & Battery', 'Essentials'],
      default: 'All',
      index: true,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

slotBlockSchema.index({ date: 1, slot: 1, category: 1 }, { unique: true });

const SlotBlock = mongoose.model('SlotBlock', slotBlockSchema);

export default SlotBlock;
