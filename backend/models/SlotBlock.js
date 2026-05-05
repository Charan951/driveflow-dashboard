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

slotBlockSchema.index({ date: 1, slot: 1 }, { unique: true });

const SlotBlock = mongoose.model('SlotBlock', slotBlockSchema);

export default SlotBlock;
