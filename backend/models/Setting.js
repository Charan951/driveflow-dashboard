import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  group: {
    type: String,
    enum: ['general', 'business', 'operations', 'content'],
    default: 'general',
  },
  description: {
    type: String,
  },
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);

export default Setting;
