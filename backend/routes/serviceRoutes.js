import express from 'express';
import {
  getServices,
  createService,
  deleteService,
  updateService,
} from '../controllers/serviceController.js';
import { protect, admin, merchant } from '../middleware/authMiddleware.js';
import { cacheMiddleware, clearCache } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.route('/')
  .get(cacheMiddleware(300), getServices) // Cache for 5 minutes
  .post(protect, merchant, (req, res, next) => {
    clearCache('/api/services');
    next();
  }, createService);

router.route('/:id')
  .delete(protect, merchant, (req, res, next) => {
    clearCache('/api/services');
    next();
  }, deleteService)
  .put(protect, merchant, (req, res, next) => {
    clearCache('/api/services');
    next();
  }, updateService);

export default router;
