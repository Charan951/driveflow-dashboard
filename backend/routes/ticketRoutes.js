import express from 'express';
import {
  createTicket,
  getUserTickets,
  getTicketById,
  getAllTickets,
  updateTicket,
  addMessage,
  createPublicTicket,
  markTicketRead,
} from '../controllers/ticketController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { publicFormLimiter } from '../middleware/rateLimiters.js';
import { verifyCaptcha } from '../middleware/captchaMiddleware.js';

const router = express.Router();

router.post('/public', publicFormLimiter, verifyCaptcha, createPublicTicket);

router.route('/')
  .post(protect, createTicket)
  .get(protect, getUserTickets);

router.get('/all', protect, admin, getAllTickets);

router.route('/:id')
  .get(protect, getTicketById)
  .put(protect, admin, updateTicket);

router.post('/:id/messages', protect, addMessage);
router.put('/:id/read', protect, admin, markTicketRead);

export default router;
