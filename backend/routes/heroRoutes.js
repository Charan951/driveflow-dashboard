import express from 'express';
import { getHeroSettings, updateHeroSettings } from '../controllers/heroController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getHeroSettings);
router.put('/', protect, admin, updateHeroSettings);

export default router;
