import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  licensePlate: { type: String, required: true },
  color: { type: String },
  image: { type: String }, // URL
  vin: { type: String },
  mileage: { type: Number },
  fuelType: { type: String },
  type: { type: String, enum: ['Car'], default: 'Car' },
  status: { type: String, enum: ['Idle', 'On Route', 'In Service'], default: 'Idle' },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
    updatedAt: { type: Date }
  },
  geo: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  lastService: { type: Date },
  nextService: { type: Date },
  documents: [{
    name: { type: String },
    type: { type: String, enum: ['Insurance', 'Registration', 'Battery Warranty', 'Tire Warranty', 'Other'] },
    url: { type: String },
    expiryDate: { type: Date },
    uploadedAt: { type: Date, default: Date.now }
  }],
  insurance: {
    policyNumber: { type: String },
    provider: { type: String },
    startDate: { type: Date },
    expiryDate: { type: Date },
    status: { type: String, enum: ['Active', 'Expired', 'Expiring Soon'], default: 'Active' },
    claims: [{
      claimNumber: { type: String },
      date: { type: Date, default: Date.now },
      description: { type: String },
      amount: { type: Number },
      status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }
    }]
  }
}, {
  timestamps: true,
});

vehicleSchema.index({ user: 1, createdAt: -1 });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
