import express from 'express';
import { protect, admin, merchant } from '../middleware/authMiddleware.js';
import { getAllUsers, updateUserRole, updateUserProfile, approveUser, rejectUser, getUserById, addStaff } from '../controllers/userController.js';

const router = express.Router();

router.route('/').get(protect, merchant, getAllUsers);
router.route('/staff').post(protect, admin, addStaff);
router.route('/profile').put(protect, updateUserProfile);
router.route('/:id').get(protect, merchant, getUserById); // Admin/Merchant can view
router.route('/:id/role').put(protect, admin, updateUserRole);
router.route('/:id/approve').put(protect, admin, approveUser);
router.route('/:id/reject').put(protect, admin, rejectUser);

export default router;
