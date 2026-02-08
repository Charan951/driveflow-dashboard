import express from 'express';
import {
  getLiveLocations,
  updateUserLocation,
  updateVehicleLocation,
} from '../controllers/trackingController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, admin, getLiveLocations);

router.route('/user')
  .put(protect, updateUserLocation);

router.route('/vehicle/:id')
  .put(protect, updateVehicleLocation);

export default router;