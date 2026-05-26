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
  },
  pickup_drop_price: {
    type: String,
    default: '',
  },
  tyre_price_bridgestone: {
    type: String,
    default: '',
  },
  tyre_price_yokohama: {
    type: String,
    default: '',
  },
  tyre_price_apollo: {
    type: String,
    default: '',
  },
  tyre_price_michelin: {
    type: String,
    default: '',
  },
  tyre_price_dummy2: {
    type: String,
    default: '',
  },
  tyre_price_dummy: {
    type: String,
    default: '',
  },
  battery_price_amaron: {
    type: String,
    default: '',
  },
  battery_price_exide: {
    type: String,
    default: '',
  },
  car_wash_price: {
    type: String,
    default: '',
  },
  car_wash_exterior_price: {
    type: String,
    default: '',
  },
  car_wash_interior_exterior_price: {
    type: String,
    default: '',
  },
  car_wash_interior_exterior_underbody_price: {
    type: String,
    default: '',
  },
  general_service_price: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Create a unique index for brand_model to avoid duplicates
vehicleReferenceSchema.index({ brand_model: 1 }, { unique: true });

const VehicleReference = mongoose.model('VehicleReference', vehicleReferenceSchema);

export default VehicleReference;
