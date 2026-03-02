import express from 'express';
import {
  sendNotification,
  getNotificationHistory,
  getMyNotifications,
  markAsRead,
  clearMyNotifications,
} from '../controllers/notificationController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, admin, sendNotification);
router.get('/history', protect, admin, getNotificationHistory);
router.route('/my')
  .get(protect, getMyNotifications)
  .delete(protect, clearMyNotifications);
router.put('/:id/read', protect, markAsRead);

export default router;
