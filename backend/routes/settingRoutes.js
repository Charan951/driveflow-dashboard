import express from 'express';
import {
  getSettings,
  getPublicSettings,
  updateSetting,
  bulkUpdateSettings,
} from '../controllers/settingController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/public', getPublicSettings);

router.route('/')
  .get(protect, admin, getSettings)
  .put(protect, admin, updateSetting);

router.put('/bulk', protect, admin, bulkUpdateSettings);

export default router;
