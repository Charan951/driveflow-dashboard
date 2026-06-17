import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { getIO } from '../socket.js';
import { emitEntitySync } from '../utils/syncService.js';
import { sendPushToRole, sendPushToUser } from '../utils/pushService.js';
import { hasExcessiveRepeatedChars, isOnlySpecialCharacters } from '../utils/validation.js';

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
  
  const MAX_SUBJECT_LENGTH = 100;
  const MAX_MESSAGE_LENGTH = 1000;

  if (!subject || subject.trim().length < 3) {
    return res.status(400).json({ message: 'Subject must be at least 3 characters' });
  }
  if (subject.length > MAX_SUBJECT_LENGTH) {
    return res.status(400).json({ message: `Subject must be at most ${MAX_SUBJECT_LENGTH} characters` });
  }
  if (hasExcessiveRepeatedChars(subject)) {
    return res.status(400).json({ message: 'Subject contains excessive repeated characters' });
  }
  if (isOnlySpecialCharacters(subject)) {
    return res.status(400).json({ message: 'Subject cannot contain only special characters' });
  }

  if (!message || message.trim().length < 10) {
    return res.status(400).json({ message: 'Message must be at least 10 characters' });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ message: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` });
  }
  if (hasExcessiveRepeatedChars(message)) {
    return res.status(400).json({ message: 'Message contains excessive repeated characters' });
  }

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
    
    // Global Real-time Sync
    emitEntitySync('ticket', 'created', populatedTicket);
    
    // Emit socket event
    try {
      const io = getIO();
      io.to('admin').emit('ticketCreated', populatedTicket);
      
      // Save notification and send push to admins
      sendPushToRole(
        'admin',
        'New Support Ticket',
        `New ticket #${populatedTicket._id.toString().slice(-6)}: ${populatedTicket.subject}`,
        { ticketId: populatedTicket._id.toString(), type: 'support' },
        'support'
      ).catch(err => console.error('Push notification error (admin):', err));
    } catch (error) {
      
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
      if ((ticket.user && ticket.user._id.toString() === req.user._id.toString()) || req.user.role === 'admin' || req.user.role === 'staff') {
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
      
      // Global Real-time Sync
      emitEntitySync('ticket', 'updated', updatedTicket);
      
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
  
  const MAX_MESSAGE_LENGTH = 1000;
  
  if (!message || message.trim().length < 1) {
    return res.status(400).json({ message: 'Message cannot be empty' });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ message: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` });
  }
  if (hasExcessiveRepeatedChars(message)) {
    return res.status(400).json({ message: 'Message contains excessive repeated characters' });
  }

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

      // Global Real-time Sync
      emitEntitySync('ticket', 'updated', populatedTicket);

      // Emit socket event
      try {
        const io = getIO();
        io.to('admin').emit('ticketUpdated', populatedTicket);
        io.to(`ticket_${ticket._id}`).emit('ticketUpdated', populatedTicket);
        if (ticket.user) {
          io.to(`user_${ticket.user}`).emit('ticketUpdated', populatedTicket);
        }
        
        // Notify customer if admin/staff replied
        if (req.user.role === 'admin' || req.user.role === 'staff') {
            if (ticket.user) {
                sendPushToUser(
                    ticket.user,
                    'Support Ticket Update',
                    `A reply has been added to your ticket #${ticket._id.toString().slice(-6)}`,
                    { ticketId: ticket._id.toString(), type: 'support' },
                    'support'
                ).catch(err => console.error('Push notification error (user):', err));
            }
        } else {
            // Notify admins if customer replied
            sendPushToRole(
                'admin',
                'Ticket Reply Received',
                `User ${req.user.name} replied to ticket #${ticket._id.toString().slice(-6)}`,
                { ticketId: ticket._id.toString(), type: 'support' },
                'support'
            ).catch(err => console.error('Push notification error (admin):', err));
        }
      } catch (error) {
        
      }

      res.json(populatedTicket);
    } else {
      res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a public ticket from Contact Us page
// @route   POST /api/tickets/public
// @access  Public
export const createPublicTicket = async (req, res) => {
  const { name, email, subject, message } = req.body;
  
  const MAX_NAME_LENGTH = 50;
  const MAX_SUBJECT_LENGTH = 100;
  const MAX_MESSAGE_LENGTH = 1000;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters' });
  }
  if (name.length > MAX_NAME_LENGTH) {
    return res.status(400).json({ message: `Name must be at most ${MAX_NAME_LENGTH} characters` });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  if (!subject || subject.trim().length < 3) {
    return res.status(400).json({ message: 'Subject must be at least 3 characters' });
  }
  if (subject.length > MAX_SUBJECT_LENGTH) {
    return res.status(400).json({ message: `Subject must be at most ${MAX_SUBJECT_LENGTH} characters` });
  }
  if (hasExcessiveRepeatedChars(subject)) {
    return res.status(400).json({ message: 'Subject contains excessive repeated characters' });
  }
  if (isOnlySpecialCharacters(subject)) {
    return res.status(400).json({ message: 'Subject cannot contain only special characters' });
  }

  if (!message || message.trim().length < 10) {
    return res.status(400).json({ message: 'Message must be at least 10 characters' });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ message: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` });
  }
  if (hasExcessiveRepeatedChars(message)) {
    return res.status(400).json({ message: 'Message contains excessive repeated characters' });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    const ticket = new Ticket({
      user: existingUser ? existingUser._id : undefined,
      guestName: existingUser ? undefined : name,
      guestEmail: existingUser ? undefined : email.toLowerCase(),
      subject,
      category: 'General',
      priority: 'Medium',
      messages: [{
        role: 'customer',
        message,
      }],
    });

    const createdTicket = await ticket.save();
    const populatedTicket = await Ticket.findById(createdTicket._id).populate('messages.sender', 'name role');
    
    // Global Real-time Sync
    emitEntitySync('ticket', 'created', populatedTicket);
    
    // Emit socket event
    try {
      const io = getIO();
      io.to('admin').emit('ticketCreated', populatedTicket);
      
      // Save notification and send push to admins
      sendPushToRole(
        'admin',
        'New Support Ticket',
        `New ticket #${populatedTicket._id.toString().slice(-6)}: ${populatedTicket.subject}`,
        { ticketId: populatedTicket._id.toString(), type: 'support' },
        'support'
      ).catch(err => console.error('Push notification error (admin):', err));
    } catch (error) {
      // Ignore
    }

    res.status(201).json(populatedTicket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

