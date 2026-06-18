import express from 'express';
import {
  getApprovals,
  createApproval,
  updateApprovalStatus,
  getMyApprovals,
} from '../controllers/approvalController.js';
import { protect, admin, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my-approvals', optionalAuth, getMyApprovals);

router.route('/')
  .get(protect, admin, getApprovals)
  .post(protect, createApproval);

router.route('/:id')
  .put(optionalAuth, updateApprovalStatus); // Removed 'admin' middleware

export default router;