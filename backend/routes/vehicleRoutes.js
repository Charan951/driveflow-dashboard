import express from 'express';
import {
  getVehicles,
  addVehicle,
  deleteVehicle,
  getAllVehicles,
  fetchVehicleDetails,
  getUserVehicles,
  getVehicleById,
  getVehicleRCDetails,
  updateVehicleHealth,
} from '../controllers/vehicleController.js';
import { protect, admin, merchant } from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/:id/health', protect, updateVehicleHealth);

router.post('/rc-details', protect, getVehicleRCDetails);
router.post('/fetch-details', protect, fetchVehicleDetails);

router.route('/')
  .get(protect, getVehicles)
  .post(protect, addVehicle);

router.route('/all').get(protect, merchant, getAllVehicles);
router.route('/user/:userId').get(protect, getUserVehicles);

router.route('/:id')
  .get(protect, getVehicleById)
  .delete(protect, deleteVehicle);

export default router;
