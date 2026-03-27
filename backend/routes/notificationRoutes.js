import express from 'express';
import {
  sendNotification,
  getNotificationHistory,
  getMyNotifications,
  markAsRead,
  deleteNotification,
  clearMyNotifications,
  clearHistory,
} from '../controllers/notificationController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// IMPORTANT: Route order matters! 
// More specific routes (like '/my') must come BEFORE generic routes (like '/:id')
// Otherwise Express will match '/:id' first and treat 'my' as an ID parameter

// More specific routes first
router.route('/my')
  .get(protect, getMyNotifications)
  .delete(protect, clearMyNotifications);

router.get('/history', protect, admin, getNotificationHistory);
router.delete('/history', protect, admin, clearHistory);
router.put('/:id/read', protect, markAsRead);

// Generic routes last (to avoid conflicts)
router.post('/', protect, admin, sendNotification);
router.delete('/:id', protect, admin, deleteNotification);

export default router;
