import express from 'express';
import {
  createTicket,
  getUserTickets,
  getTicketById,
  getAllTickets,
  updateTicket,
  addMessage,
} from '../controllers/ticketController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createTicket)
  .get(protect, getUserTickets);

router.get('/all', protect, admin, getAllTickets);

router.route('/:id')
  .get(protect, getTicketById)
  .put(protect, admin, updateTicket);

router.post('/:id/messages', protect, addMessage);

export default router;
