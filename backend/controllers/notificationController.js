import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendPushToUser, sendPushToRole, sendPushToTopic } from '../utils/pushService.js';

// @desc    Send a notification
// @route   POST /api/notifications
// @access  Private/Admin
export const sendNotification = async (req, res) => {
  const { recipientId, targetGroup, title, message, type = 'general', data = {} } = req.body;

  try {
    let result;
    if (recipientId) {
      result = await sendPushToUser(recipientId, title, message, data, type);
    } else if (targetGroup === 'All') {
      // Using a global topic for broadcast
      result = await sendPushToTopic('all_users', title, message, data, type);
    } else if (targetGroup) {
      // Target specific roles
      result = await sendPushToRole(targetGroup.toLowerCase(), title, message, data, type);
    } else {
      return res.status(400).json({ message: 'Recipient or Target Group is required' });
    }

    if (!result.success) {
      return res.status(400).json({ message: result.message || 'Failed to send notification' });
    }

    res.status(201).json({ message: 'Notification sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get notification history
// @route   GET /api/notifications/history
// @access  Private/Admin
export const getNotificationHistory = async (req, res) => {
  try {
    const notifications = await Notification.find({})
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my notifications
// @route   GET /api/notifications/my
// @access  Private
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    // Map the response to match frontend expectations
    const mappedNotifications = notifications.map(notification => ({
      _id: notification._id,
      title: notification.title,
      message: notification.body, // Map 'body' to 'message'
      type: notification.type === 'order' ? 'info' : 
            notification.type === 'support' ? 'warning' : 
            notification.type === 'system' ? 'error' : 'info',
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      data: notification.data
    }));
    
    res.json(mappedNotifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (notification) {
      if (notification.userId.toString() !== req.user._id.toString()) {
         return res.status(401).json({ message: 'Not authorized' });
      }
      notification.isRead = true;
      await notification.save();
      res.json(notification);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private/Admin
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.deleteOne();
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Clear my notifications
// @route   DELETE /api/notifications/my
// @access  Private
export const clearMyNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ message: 'Notifications cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Clear notification history
// @route   DELETE /api/notifications/history
// @access  Private/Admin
export const clearHistory = async (req, res) => {
  try {
    await Notification.deleteMany({});
    res.json({ message: 'Notification history cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
