import Ticket from '../models/Ticket.js';
import { getIO } from '../socket.js';

// @desc    Get all tickets (Admin/Support)
// @route   GET /api/tickets/all
// @access  Private/Admin
export const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({})
      .populate('user', 'name email phone')
      .populate('assignedTo', 'name')
      .populate('messages.sender', 'name role')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new ticket
// @route   POST /api/tickets
// @access  Private
export const createTicket = async (req, res) => {
  const { subject, category, message, priority } = req.body;

  try {
    const ticket = new Ticket({
      user: req.user._id,
      subject,
      category,
      priority,
      messages: [{
        sender: req.user._id,
        role: req.user.role,
        message,
      }],
    });

    const createdTicket = await ticket.save();
    const populatedTicket = await Ticket.findById(createdTicket._id).populate('messages.sender', 'name role');
    
    // Emit socket event
    try {
      const io = getIO();
      io.to('admin').emit('ticketCreated', populatedTicket);
    } catch (error) {
      console.error('Socket emit failed:', error.message);
    }

    res.status(201).json(populatedTicket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get user tickets
// @route   GET /api/tickets
// @access  Private
export const getUserTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id })
      .populate('messages.sender', 'name role')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get ticket by ID
// @route   GET /api/tickets/:id
// @access  Private
export const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('user', 'name email')
      .populate('messages.sender', 'name role');

    if (ticket) {
      // Check if user is owner or admin/staff
      if (ticket.user._id.toString() === req.user._id.toString() || req.user.role === 'admin' || req.user.role === 'staff') {
         res.json(ticket);
      } else {
        res.status(401).json({ message: 'Not authorized to view this ticket' });
      }
    } else {
      res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update ticket status/assignee
// @route   PUT /api/tickets/:id
// @access  Private/Admin
export const updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (ticket) {
      ticket.status = req.body.status || ticket.status;
      ticket.priority = req.body.priority || ticket.priority;
      ticket.assignedTo = req.body.assignedTo || ticket.assignedTo;

      const updatedTicket = await ticket.save();
      res.json(updatedTicket);
    } else {
      res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add message to ticket
// @route   POST /api/tickets/:id/messages
// @access  Private
export const addMessage = async (req, res) => {
  const { message } = req.body;

  try {
    const ticket = await Ticket.findById(req.params.id);

    if (ticket) {
      const newMessage = {
        sender: req.user._id,
        role: req.user.role, // Redundant field for easier frontend detection
        message,
        createdAt: new Date(),
      };

      ticket.messages.push(newMessage);
      
      // Auto-update status if admin replies
      if (req.user.role === 'admin' || req.user.role === 'staff') {
          if (ticket.status === 'Open') ticket.status = 'In Progress';
      }

      await ticket.save();
      const populatedTicket = await Ticket.findById(ticket._id).populate('messages.sender', 'name role');

      // Emit socket event
      try {
        const io = getIO();
        io.to('admin').emit('ticketUpdated', populatedTicket);
        io.to(`ticket_${ticket._id}`).emit('ticketUpdated', populatedTicket);
        io.to(`user_${ticket.user}`).emit('ticketUpdated', populatedTicket);
      } catch (error) {
        console.error('Socket emit failed:', error.message);
      }

      res.json(populatedTicket);
    } else {
      res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
