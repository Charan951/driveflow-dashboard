import mongoose from 'mongoose';

const MAX_CONSECUTIVE_CHARS = 10;

// Helper function to check for excessive repeated characters
const hasExcessiveRepeatedChars = (str) => {
  if (!str) return false;
  const regex = new RegExp(`(.)\\1{${MAX_CONSECUTIVE_CHARS},}`, 'g');
  return regex.test(str);
};

// Custom validators
const nameValidator = {
  validator: function(value) {
    const trimmed = value.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length > 30) return false;
    if (hasExcessiveRepeatedChars(trimmed)) return false;
    // Allow letters, numbers, spaces, apostrophes, hyphens, and ampersands
    return /^[a-zA-Z0-9][a-zA-Z0-9\s'&-]*$/.test(trimmed);
  },
  message: 'Name is invalid. Must be 1-30 characters, no excessive repeated characters, and only alphanumeric with spaces, apostrophes, hyphens, or ampersands.'
};

const descriptionValidator = {
  validator: function(value) {
    const trimmed = value.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length > 500) return false;
    if (hasExcessiveRepeatedChars(trimmed)) return false;
    return true;
  },
  message: 'Description is invalid. Must be 1-500 characters with no excessive repeated characters.'
};

const estimationTimeValidator = {
  validator: function(value) {
    if (!value) return true; // Optional field
    const trimmed = value.trim();
    if (trimmed.length > 3) return false;
    if (hasExcessiveRepeatedChars(trimmed)) return false;
    return true;
  },
  message: 'Estimation time is invalid. Must be max 3 characters with no excessive repeated characters.'
};

const imageValidator = {
  validator: function(value) {
    if (!value) return true; // Optional field
    const trimmed = value.trim();
    if (trimmed.length > 500) return false;
    return true;
  },
  message: 'Image URL is invalid. Must be max 500 characters.'
};

const featureValidator = {
  validator: function(value) {
    if (!Array.isArray(value)) return false;
    for (const feature of value) {
      if (!feature) continue; // Skip empty strings
      const trimmed = feature.trim();
      if (trimmed.length > 100) return false;
      if (hasExcessiveRepeatedChars(trimmed)) return false;
      // Allow letters, numbers, spaces, apostrophes, hyphens, commas, periods, colons, slashes, ampersands
      if (!/^[a-zA-Z0-9\s'-.,:/&]*$/.test(trimmed)) return false;
    }
    return true;
  },
  message: 'Features are invalid. Each feature must be max 100 characters with no excessive repeated characters.'
};

const serviceSchema = mongoose.Schema(
  {
    name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    validate: nameValidator,
    maxlength: [30, 'Name cannot exceed 30 characters'],
  },
    description: {
      type: String,
      required: [true, 'Service description is required'],
      trim: true,
      validate: descriptionValidator,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0.01, 'Price must be greater than 0'],
    },
    duration: {
      type: Number, // duration in minutes
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      index: true,
      enum: {
        values: ['Services', 'Periodic', 'Wash', 'Car Wash', 'Tyre & Battery', 'Tyres', 'Battery', 'Painting', 'Denting', 'Repair', 'Detailing', 'AC', 'Accessories', 'Essentials', 'Other'],
        message: 'Invalid category'
      },
    },
    estimationTime: {
    type: String, // e.g. "2-3 hours" or "1 day"
    required: false,
    trim: true,
    validate: estimationTimeValidator,
    maxlength: [3, 'Estimation time cannot exceed 3 characters'],
  },
    vehicleType: {
      type: String,
      required: [true, 'Vehicle type is required'],
      index: true,
      enum: {
        values: ['Car'],
        message: 'Invalid vehicle type'
      },
      default: 'Car',
    },
    image: {
      type: String,
      default: '',
      trim: true,
      validate: imageValidator,
      maxlength: [500, 'Image URL cannot exceed 500 characters'],
    },
    features: [{
      type: String, // list of features included in the service
      trim: true,
    }],
    isQuickService: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add feature array validation in pre-save hook
serviceSchema.pre('save', function() {
  // Validate features array
  if (!featureValidator.validator(this.features)) {
    throw new Error(featureValidator.message);
  }
});

// Also validate on update
serviceSchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate();
  if (update.features && !featureValidator.validator(update.features)) {
    throw new Error(featureValidator.message);
  }
});

serviceSchema.index({ vehicleType: 1, category: 1, name: 1 });

const Service = mongoose.model('Service', serviceSchema);

export default Service;
