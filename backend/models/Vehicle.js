import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  make: { type: String, required: true },
  model: { type: String, required: true },
  variant: { type: String },
  year: { type: Number, required: true },
  licensePlate: { type: String, required: true },
  registrationDate: { type: String },
  color: { type: String },
  image: { type: String }, // URL
  vin: { type: String },
  mileage: { type: Number },
  fuelType: { type: String },
  frontTyres: { type: String },
  rearTyres: { type: String },
  batteryDetails: { type: String },
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
  },
  healthIndicators: {
    generalService: {
      value: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
      lastServiceDate: { type: Date },
      lastServiceKm: { type: Number, default: 0 },
      fixedKm: { type: Number, default: 0 },
      fixedDays: { type: Number, default: 0 }
    },
    brakePads: {
      value: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
      lastServiceDate: { type: Date },
      lastServiceKm: { type: Number, default: 0 },
      fixedKm: { type: Number, default: 0 },
      fixedDays: { type: Number, default: 0 }
    },
    tires: {
      value: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
      lastServiceDate: { type: Date },
      lastServiceKm: { type: Number, default: 0 },
      fixedKm: { type: Number, default: 0 },
      fixedDays: { type: Number, default: 0 }
    },
    battery: {
      value: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
      lastServiceDate: { type: Date },
      lastServiceKm: { type: Number, default: 0 },
      fixedKm: { type: Number, default: 0 },
      fixedDays: { type: Number, default: 0 }
    },
    wiperBlade: {
      value: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
      lastServiceDate: { type: Date },
      lastServiceKm: { type: Number, default: 0 },
      fixedKm: { type: Number, default: 0 },
      fixedDays: { type: Number, default: 0 }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Helper to calculate health
vehicleSchema.methods.calculateHealth = function() {
  const vehicle = this;
  if (!vehicle.healthIndicators) return;

  const now = new Date();
  const currentKm = vehicle.mileage || 0;

  const keys = ['generalService', 'brakePads', 'tires', 'battery', 'wiperBlade'];
  
  keys.forEach(key => {
    const indicator = vehicle.healthIndicators[key];
    if (indicator && indicator.lastServiceDate) {
      const lastDate = new Date(indicator.lastServiceDate);
      const diffTime = Math.abs(now - lastDate);
      // We use floor here because Day 1 should be 0 days passed
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const lastKm = indicator.lastServiceKm || 0;
      const diffKm = Math.max(0, currentKm - lastKm);
      const fixedKm = indicator.fixedKm || 0;
      const fixedDays = indicator.fixedDays || 0;

      // Calculate service progress based on days (if fixedDays > 0)
      const progressFromDays = fixedDays > 0 ? Math.min(100, (diffDays / fixedDays) * 100) : 0;
      
      // Calculate service progress based on KM (if fixedKm > 0)
      const progressFromKm = fixedKm > 0 ? Math.min(100, (diffKm / fixedKm) * 100) : 0;

      // Service progress is the maximum of both (whichever comes first)
      indicator.value = Math.round(Math.max(progressFromDays, progressFromKm));
    } else if (indicator) {
      // If no service date has been set by a merchant, all indicators must be zero
      indicator.value = 0;
      indicator.fixedKm = 0;
      indicator.fixedDays = 0;
    }
  });
};

vehicleSchema.pre('save', async function() {
  this.calculateHealth();
});

vehicleSchema.index({ user: 1, createdAt: -1 });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
