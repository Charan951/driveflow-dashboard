import express from 'express';
import {
  getVehicles,
  addVehicle,
  deleteVehicle,
  getAllVehicles,
  fetchVehicleDetails,
  getUserVehicles,
  getVehicleById,
  getInsuranceData,
} from '../controllers/vehicleController.js';
import { protect, admin, merchant } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/fetch-details', protect, fetchVehicleDetails);

router.get('/insurance/all', protect, admin, getInsuranceData);

router.route('/')
  .get(protect, getVehicles)
  .post(protect, addVehicle);

router.route('/all').get(protect, merchant, getAllVehicles);
router.route('/user/:userId').get(protect, merchant, getUserVehicles);

router.route('/:id')
  .get(protect, merchant, getVehicleById)
  .delete(protect, deleteVehicle);

export default router;
