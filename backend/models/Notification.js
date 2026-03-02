import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'merchant', 'staff', 'all'],
    default: 'all'
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: {}
  },
  type: {
    type: String,
    enum: ['order', 'support', 'general', 'system'],
    default: 'general'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
