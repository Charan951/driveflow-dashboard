import express from 'express';
import {
  getApprovals,
  createApproval,
  updateApprovalStatus,
  getMyApprovals,
} from '../controllers/approvalController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my-approvals', protect, getMyApprovals);

router.route('/')
  .get(protect, admin, getApprovals)
  .post(protect, createApproval);

router.route('/:id')
  .put(protect, updateApprovalStatus); // Removed 'admin' middleware

export default router;