import express from 'express';
import { protect, admin, merchant } from '../middleware/authMiddleware.js';
import { getAllUsers, updateUserRole, updateUserProfile, approveUser, rejectUser, getUserById, createUser, deleteUser, updateOnlineStatus, getUserProfile, registerDeviceToken, unregisterDeviceToken } from '../controllers/userController.js';

const router = express.Router();

router.route('/')
  .get(protect, merchant, getAllUsers)
  .post(protect, admin, createUser);

router.route('/me').get(protect, getUserProfile);
router.route('/profile').put(protect, updateUserProfile);
router.route('/online-status').put(protect, updateOnlineStatus);
router.post('/device-token', protect, registerDeviceToken);
router.delete('/device-token', protect, unregisterDeviceToken);
router.route('/:id')
  .get(protect, merchant, getUserById)
  .delete(protect, admin, deleteUser); // Admin can delete user
router.route('/:id/role').put(protect, admin, updateUserRole);
router.route('/:id/approve').put(protect, admin, approveUser);
router.route('/:id/reject').put(protect, admin, rejectUser);

export default router;
