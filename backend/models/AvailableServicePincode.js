import mongoose from 'mongoose';

const availableServicePincodeSchema = mongoose.Schema(
  {
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
    updatedBy: {
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

availableServicePincodeSchema.index({ pincode: 1 }, { unique: true });

const AvailableServicePincode = mongoose.model('AvailableServicePincode', availableServicePincodeSchema);

export default AvailableServicePincode;
