import mongoose from 'mongoose';

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
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
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
