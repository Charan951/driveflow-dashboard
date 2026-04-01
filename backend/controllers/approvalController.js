import ApprovalRequest from '../models/ApprovalRequest.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { getIO } from '../socket.js';
import { emitBookingUpdate } from './bookingController.js';

import { sendPushToUser } from '../utils/pushService.js';

import Message from '../models/Message.js';

// @desc    Get all approval requests
// @route   GET /api/approvals
// @access  Private/Admin
export const getApprovals = async (req, res) => {
  try {
    const approvals = await ApprovalRequest.find({})
      .populate('requestedBy', 'name email role')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 });
    
    // We need to populate relatedId dynamically based on relatedModel
    // Mongoose's populate with refPath should handle this if set up correctly,
    // but we can also do it manually if needed. 
    // Let's try explicit population.
    const populatedApprovals = await ApprovalRequest.populate(approvals, {
      path: 'relatedId',
      select: 'name email make model licensePlate status totalAmount orderNumber' // Fields for User and Booking
    });

    res.json(populatedApprovals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my approvals (User)
// @route   GET /api/approvals/my-approvals
// @access  Private
export const getMyApprovals = async (req, res) => {
  try {
    const BookingModel = (await import('../models/Booking.js')).default;
    const bookings = await BookingModel.find({ user: req.user._id }).select('_id');
    const bookingIds = bookings.map(b => b._id);
    
    const approvals = await ApprovalRequest.find({
      $or: [
        { relatedModel: 'Booking', relatedId: { $in: bookingIds } },
        { relatedModel: 'User', relatedId: req.user._id }
      ]
    }).sort({ createdAt: -1 });

    res.json(approvals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create an approval request
// @route   POST /api/approvals
// @access  Private (Merchant/Staff)
export const createApproval = async (req, res) => {
  const { type, relatedId, relatedModel, data } = req.body;

  try {
    // Check if a pending approval already exists for this part in the same booking
    if (type === 'PartReplacement' && relatedModel === 'Booking') {
      const existing = await ApprovalRequest.findOne({
        type: 'PartReplacement',
        relatedId,
        relatedModel: 'Booking',
        status: 'Pending',
        'data.name': data.name,
        'data.price': Number(data.price),
        'data.quantity': Number(data.quantity || 1)
      });
      if (existing) {
        return res.status(200).json(existing); // Return existing instead of creating new
      }
    }

    const approval = new ApprovalRequest({
      type,
      relatedId,
      relatedModel,
      data,
      requestedBy: req.user._id,
    });

    const createdApproval = await approval.save();

    // Notify customer
    if (relatedModel === 'Booking') {
      const booking = await Booking.findById(relatedId).populate('user');
      if (booking && booking.user) {
        const io = getIO();
        const userId = booking.user._id.toString();
        
        // Emit socket event to customer's room
        io.to(`user_${userId}`).emit('newApproval', createdApproval);
        // Also emit to booking room if anyone is watching
        io.to(`booking_${relatedId}`).emit('newApproval', createdApproval);

        // Create a chat message for this approval
        const chatMessage = new Message({
          bookingId: relatedId,
          sender: req.user._id,
          text: `Approval required for part: ${data.name || 'Unnamed Additional Part'} - Amount: ₹${Number(data.price) * Number(data.quantity || 1)}`,
          type: 'approval',
          approval: {
            partName: data.name || 'Unnamed Additional Part',
            amount: Number(data.price) * Number(data.quantity || 1),
            status: 'pending',
            approvalId: createdApproval._id,
            image: data.image
          }
        });
        await chatMessage.save();
        const populatedChatMessage = await chatMessage.populate('sender', '_id name role');
        io.to(`booking_${relatedId}`).emit('receiveMessage', populatedChatMessage);

        // Send push notification
        const orderNum = booking.orderNumber || relatedId.toString().slice(-6).toUpperCase();
        let message = 'New approval request received.';
        if (type === 'PartReplacement') {
          message = `New part approval requested for Order #${orderNum}: ${data.name}`;
        } else if (type === 'ExtraCost') {
          message = `Extra cost approval requested for Order #${orderNum}: ₹${data.amount}`;
        }

        await sendPushToUser(
          userId,
          'Approval Required',
          message,
          { 
            type: 'approval_request', 
            bookingId: relatedId.toString(),
            approvalId: createdApproval._id.toString()
          },
          'order'
        );
      }
    }

    res.status(201).json(createdApproval);
  } catch (error) {
    
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update approval status (Approve/Reject)
// @route   PUT /api/approvals/:id
// @access  Private/Admin/User
export const updateApprovalStatus = async (req, res) => {
  const { status, adminComment } = req.body;

  try {
    const approval = await ApprovalRequest.findById(req.params.id);

    if (!approval) {
      return res.status(404).json({ message: 'Approval request not found' });
    }

    // Check authorization
    let isAuthorized = false;
    if (req.user.role === 'admin') {
        isAuthorized = true;
    } else {
        // Check if user owns the related resource
        if (approval.relatedModel === 'Booking') {
            const booking = await Booking.findById(approval.relatedId);
            if (booking && booking.user.toString() === req.user._id.toString()) {
                isAuthorized = true;
            }
        } else if (approval.relatedModel === 'User') {
             if (approval.relatedId.toString() === req.user._id.toString()) {
                 isAuthorized = true;
             }
        }
    }

    if (!isAuthorized) {
        return res.status(401).json({ message: 'Not authorized to update this approval' });
    }

    if (approval.status !== 'Pending') {
      return res.status(400).json({ message: 'Request is already resolved' });
    }

    approval.status = status;
    approval.adminComment = adminComment;
    approval.resolvedAt = Date.now();
    approval.resolvedBy = req.user._id;

    // Update corresponding chat message
    try {
        const chatMessage = await Message.findOne({ 'approval.approvalId': approval._id });
        if (chatMessage) {
            chatMessage.approval.status = status.toLowerCase();
            await chatMessage.save();
            const io = getIO();
            const populated = await chatMessage.populate('sender', '_id name role');
            io.to(`booking_${approval.relatedId}`).emit('receiveMessage', populated);
        }
    } catch (err) {
        console.error('Error updating chat message for approval:', err);
    }

    if (status === 'Approved') {
      // Execute the logic based on type
      if (approval.type === 'BillEdit' && approval.relatedModel === 'Booking') {
        const booking = await Booking.findById(approval.relatedId);
        if (booking && approval.data?.newAmount) {
          booking.totalAmount = approval.data.newAmount;
          await booking.save();
          
          const populated = await Booking.findById(booking._id)
            .populate('user', 'id name email phone')
            .populate('vehicle')
            .populate('services')
            .populate('merchant', 'name email phone location')
            .populate('pickupDriver', 'name email phone')
            .populate('technician', 'name email phone');
          emitBookingUpdate(populated);
        }
      } else if (approval.type === 'PartReplacement' && approval.relatedModel === 'Booking') {
        const booking = await Booking.findById(approval.relatedId);
        if (booking) {
          const { name, price, quantity, image, oldImage } = approval.data;
          const searchName = (name || 'Unnamed Additional Part').trim().toLowerCase();

          // 1. Update inspection.additionalParts
          let partFound = false;
          if (booking.inspection && booking.inspection.additionalParts) {
            const partIndex = booking.inspection.additionalParts.findIndex(p => {
              const pName = (p.name || 'Unnamed Additional Part').trim().toLowerCase();
              return pName === searchName && 
                     Number(p.price) === Number(price) && 
                     Number(p.quantity) === Number(quantity);
            });
            
            if (partIndex >= 0) {
              booking.inspection.additionalParts[partIndex].approved = true;
              booking.inspection.additionalParts[partIndex].approvalStatus = 'Approved';
              booking.inspection.additionalParts[partIndex].price = Number(price);
              booking.inspection.additionalParts[partIndex].quantity = Number(quantity);
              if (image) booking.inspection.additionalParts[partIndex].image = image;
              if (oldImage) booking.inspection.additionalParts[partIndex].oldImage = oldImage;
              partFound = true;
            }
          }

          if (!partFound) {
            if (!booking.inspection) booking.inspection = {};
            if (!booking.inspection.additionalParts) booking.inspection.additionalParts = [];
            booking.inspection.additionalParts.push({ 
                name: name || 'Unnamed Additional Part', 
                price: Number(price), 
                quantity: Number(quantity), 
                approved: true, 
                approvalStatus: 'Approved', 
                image, 
                oldImage 
            });
          }

          // 2. Add to booking.parts (which affects billing)
          if (!booking.parts) booking.parts = [];

          // Check if part already exists in booking.parts to avoid duplicates if approved multiple times?
          // But status check prevents multiple approvals.
          booking.parts.push({ 
              name: name || 'Unnamed Additional Part', 
              price: Number(price), 
              quantity: Number(quantity),
              image: image 
          });

          // 3. Recalculate totalAmount
          const Service = (await import('../models/Service.js')).default;
          const services = await Service.find({ _id: { $in: booking.services } });
          const servicesTotal = services.reduce((acc, service) => acc + service.price, 0);

          const partsTotal = booking.parts.reduce((acc, part) => acc + (Number(part.price) * Number(part.quantity)), 0);

          booking.totalAmount = servicesTotal + partsTotal;

          // Update billing if exists
          if (booking.billing) {
            booking.billing.partsTotal = partsTotal;
            booking.billing.total = servicesTotal + partsTotal + (Number(booking.billing.labourCost) || 0) + (Number(booking.billing.gst) || 0);
          }

          booking.markModified('inspection');
          booking.markModified('parts');
          if (booking.billing) booking.markModified('billing');
          
          await booking.save();
          
          const populated = await Booking.findById(booking._id)
            .populate('user', 'id name email phone')
            .populate('vehicle')
            .populate('services')
            .populate('merchant', 'name email phone location')
            .populate('pickupDriver', 'name email phone')
            .populate('technician', 'name email phone');
          emitBookingUpdate(populated);
        }
      } else if (approval.type === 'ExtraCost' && approval.relatedModel === 'Booking') {
        const booking = await Booking.findById(approval.relatedId);
        if (booking) {
          const { amount, reason } = approval.data;
          
          // Update billing
          if (!booking.billing) {
            booking.billing = {
              labourCost: 0,
              gst: 0,
              partsTotal: 0,
              total: 0
            };
          }
          
          booking.billing.labourCost = (booking.billing.labourCost || 0) + Number(amount);
          
          // Recalculate billing total
          const Service = (await import('../models/Service.js')).default;
          const services = await Service.find({ _id: { $in: booking.services } });
          const servicesTotal = services.reduce((acc, service) => acc + service.price, 0);

          const partsTotal = booking.billing.partsTotal || 0;
          const labourCost = booking.billing.labourCost;
          const gst = booking.billing.gst || 0;
          
          booking.billing.total = servicesTotal + partsTotal + labourCost + gst;
          
          // Update main totalAmount
          booking.totalAmount = (booking.totalAmount || 0) + Number(amount);
          
          // Add note
          const note = `Extra Cost Approved: ${reason} - $${amount}`;
          booking.notes = booking.notes ? booking.notes + '\n' + note : note;
          
          await booking.save();
          
          const populated = await Booking.findById(booking._id)
            .populate('user', 'id name email phone')
            .populate('vehicle')
            .populate('services')
            .populate('merchant', 'name email phone location')
            .populate('pickupDriver', 'name email phone')
            .populate('technician', 'name email phone');
          emitBookingUpdate(populated);
        }
      }
    } else if (status === 'Rejected') {
      if (approval.type === 'PartReplacement' && approval.relatedModel === 'Booking') {
        const booking = await Booking.findById(approval.relatedId);
        if (booking && booking.inspection && Array.isArray(booking.inspection.additionalParts)) {
          const { name, price, quantity } = approval.data || {};
          const searchName = (name || 'Unnamed Additional Part').trim().toLowerCase();

          const partIndex = booking.inspection.additionalParts.findIndex(p => {
            const pName = (p.name || 'Unnamed Additional Part').trim().toLowerCase();
            return pName === searchName && 
                   Number(p.price) === Number(price) && 
                   Number(p.quantity) === Number(quantity);
          });

          if (partIndex >= 0) {
            booking.inspection.additionalParts[partIndex].approved = false;
            booking.inspection.additionalParts[partIndex].approvalStatus = 'Rejected';
            booking.inspection.additionalParts[partIndex].rejectionReason = adminComment;
            await booking.save();
            
            const populated = await Booking.findById(booking._id)
                .populate('user', 'id name email phone')
                .populate('vehicle')
                .populate('services')
                .populate('merchant', 'name email phone location')
                .populate('pickupDriver', 'name email phone')
                .populate('technician', 'name email phone');
            emitBookingUpdate(populated);
          }
        }
      }
      // Other types (ExtraCost, BillEdit) do not change booking data on rejection for now
    }

    const updatedApproval = await approval.save();
    res.json(updatedApproval);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

