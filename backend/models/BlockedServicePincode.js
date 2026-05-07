import mongoose from 'mongoose';

const blockedServicePincodeSchema = mongoose.Schema(
  {
    pincode: {
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

blockedServicePincodeSchema.index({ pincode: 1 }, { unique: true });

const BlockedServicePincode = mongoose.model('BlockedServicePincode', blockedServicePincodeSchema);

export default BlockedServicePincode;
