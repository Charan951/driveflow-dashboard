import express from 'express';
import { getCaptcha } from '../controllers/captchaController.js';
import { captchaLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.get('/generate', captchaLimiter, getCaptcha);

export default router;
