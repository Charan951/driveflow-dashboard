import express from 'express';
import {
  getApprovals,
  createApproval,
  updateApprovalStatus,
} from '../controllers/approvalController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, admin, getApprovals)
  .post(protect, createApproval);

router.route('/:id')
  .put(protect, admin, updateApprovalStatus);

export default router;