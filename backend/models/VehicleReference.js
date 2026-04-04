import mongoose from 'mongoose';

const vehicleReferenceSchema = new mongoose.Schema({
  brand_name: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  brand_model: {
    type: String,
    required: true,
  },
  front_tyres: {
    type: String,
    required: true,
  },
  rear_tyres: {
    type: String,
    required: true,
  },
  battery_details: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

// Create a unique index for brand_model to avoid duplicates
vehicleReferenceSchema.index({ brand_model: 1 }, { unique: true });

const VehicleReference = mongoose.model('VehicleReference', vehicleReferenceSchema);

export default VehicleReference;
