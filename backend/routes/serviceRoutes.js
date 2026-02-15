import express from 'express';
import {
  getServices,
  createService,
  deleteService,
  updateService,
} from '../controllers/serviceController.js';
import { protect, admin, merchant } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getServices)
  .post(protect, admin, createService);

router.route('/:id')
  .delete(protect, admin, deleteService)
  .put(protect, admin, updateService);

export default router;
