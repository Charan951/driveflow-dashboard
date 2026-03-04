import express from 'express';
import {
  sendNotification,
  getNotificationHistory,
  getMyNotifications,
  markAsRead,
  deleteNotification,
  clearMyNotifications,
} from '../controllers/notificationController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, admin, sendNotification);
router.get('/history', protect, admin, getNotificationHistory);
router.delete('/:id', protect, admin, deleteNotification);
router.route('/my')
  .get(protect, getMyNotifications)
  .delete(protect, clearMyNotifications);
router.put('/:id/read', protect, markAsRead);

export default router;
