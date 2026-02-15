import express from 'express';
import {
  getLiveLocations,
  updateUserLocation,
  updateVehicleLocation,
  getETA,
  reverseGeocode,
  searchGeocode,
} from '../controllers/trackingController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, admin, getLiveLocations);

router.route('/user')
  .put(protect, updateUserLocation);

router.route('/vehicle/:id')
  .put(protect, updateVehicleLocation);

// ETA lookup (Google if available, else OSRM)
router.route('/eta')
  .get(protect, getETA);

// Geocoding proxy (Nominatim)
router.route('/reverse')
  .get(protect, reverseGeocode);
router.route('/search')
  .get(protect, searchGeocode);

export default router;
