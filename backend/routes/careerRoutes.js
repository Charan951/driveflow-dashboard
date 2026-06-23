import express from 'express';
import {
  getCareers,
  getCareerById,
  getAdminCareers,
  getAdminCareerById,
  getCareerApplications,
  createCareer,
  updateCareer,
  deleteCareer,
  applyForCareer,
} from '../controllers/careerController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { publicFormLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.get('/', getCareers);
router.get('/admin/all', protect, admin, getAdminCareers);
router.get('/admin/:id', protect, admin, getAdminCareerById);
router.get('/admin/:id/applications', protect, admin, getCareerApplications);
router.post('/', protect, admin, createCareer);
router.get('/:id', getCareerById);
router.post('/:id/apply', publicFormLimiter, applyForCareer);
router.put('/:id', protect, admin, updateCareer);
router.delete('/:id', protect, admin, deleteCareer);

export default router;
