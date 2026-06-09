import mongoose from 'mongoose';

const MAX_CONSECUTIVE_CHARS = 10;

const hasExcessiveRepeatedChars = (str) => {
  if (!str) return false;
  const regex = new RegExp(`(.)\\1{${MAX_CONSECUTIVE_CHARS},}`, 'g');
  return regex.test(str);
};

const nameValidator = {
  validator: function(value) {
    const trimmed = value.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length > 10) return false;
    if (hasExcessiveRepeatedChars(trimmed)) return false;
    return /^[a-zA-Z0-9][a-zA-Z0-9\s'-]*$/.test(trimmed);
  },
  message: 'Name is invalid. Must be 1-10 characters, no excessive repeated characters'
};

const emailValidator = {
  validator: function(value) {
    return /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]*[a-zA-Z][a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/.test(value);
  },
  message: 'Please enter a valid email address'
};

const careerApplicationSchema = mongoose.Schema(
  {
    career: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Career',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      validate: nameValidator,
      maxlength: [10, 'Name cannot exceed 10 characters'],
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: emailValidator,
      maxlength: [20, 'Email cannot exceed 20 characters'],
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{10}$/, 'Please enter a valid 10-digit mobile number'],
      maxlength: [10, 'Mobile number cannot exceed 10 digits'],
    },
    resumeUrl: {
      type: String,
      required: true,
      trim: true,
    },
    additionalMessage: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Additional message cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'shortlisted', 'rejected'],
      default: 'new',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const CareerApplication = mongoose.model('CareerApplication', careerApplicationSchema);

export default CareerApplication;
