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
  .post(protect, merchant, createService);

router.route('/:id')
  .delete(protect, merchant, deleteService)
  .put(protect, merchant, updateService);

export default router;
