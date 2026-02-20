import Notification from '../models/Notification.js';
import User from '../models/User.js';

// @desc    Send a notification
// @route   POST /api/notifications
// @access  Private/Admin
export const sendNotification = async (req, res) => {
  const { recipientId, targetGroup, title, message, type } = req.body;

  try {
    let notifications = [];
    let targetUserIds = [];

    if (targetGroup) {
      // Broadcast to group
      const query = targetGroup === 'All' ? {} : { role: targetGroup.toLowerCase() };
      const users = await User.find(query).select('_id');

      notifications = users.map((user) => ({
        recipient: user._id,
        targetGroup,
        title,
        message,
        type,
      }));
      targetUserIds = users.map((u) => u._id);
    } else if (recipientId) {
      // Single user
      notifications.push({
        recipient: recipientId,
        title,
        message,
        type,
      });
      targetUserIds = [recipientId];
    } else {
      return res.status(400).json({ message: 'Recipient or Target Group is required' });
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res
      .status(201)
      .json({ message: `Notification sent to ${notifications.length} users` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all notifications (Admin History)
// @route   GET /api/notifications/history
// @access  Private/Admin
export const getNotificationHistory = async (req, res) => {
  try {
    // We can group by created time/content to show "Sent Batches" or just list all
    // For simplicity, listing the last 100
    const notifications = await Notification.find({})
      .populate('recipient', 'name email')
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
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 });
    res.json(notifications);
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
      if (notification.recipient.toString() !== req.user._id.toString()) {
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
