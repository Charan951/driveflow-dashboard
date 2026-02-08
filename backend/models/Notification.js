import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // If null, it could be a broadcast or we use a separate field for target group
  },
  targetGroup: {
    type: String,
    enum: ['All', 'Customer', 'Merchant', 'Staff', null],
    default: null,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error'],
    default: 'info',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
