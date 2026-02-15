import ApprovalRequest from '../models/ApprovalRequest.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';

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
      select: 'name email make model licensePlate status totalAmount' // Fields for User and Booking
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
    const Booking = (await import('../models/Booking.js')).default;
    const bookings = await Booking.find({ user: req.user._id }).select('_id');
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
    const approval = new ApprovalRequest({
      type,
      relatedId,
      relatedModel,
      data,
      requestedBy: req.user._id,
    });

    const createdApproval = await approval.save();
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

    if (status === 'Approved') {
      // Execute the logic based on type
      if (approval.type === 'BillEdit' && approval.relatedModel === 'Booking') {
        const booking = await Booking.findById(approval.relatedId);
        if (booking && approval.data?.newAmount) {
          booking.totalAmount = approval.data.newAmount;
          await booking.save();
        }
      } else if (approval.type === 'PartReplacement' && approval.relatedModel === 'Booking') {
        const booking = await Booking.findById(approval.relatedId);
        if (booking) {
          const { name, price, quantity, image, oldImage } = approval.data;

          // 1. Update inspection.additionalParts
          let partFound = false;
          if (booking.inspection && booking.inspection.additionalParts) {
            const partIndex = booking.inspection.additionalParts.findIndex(p => p.name === name);
            if (partIndex >= 0) {
              booking.inspection.additionalParts[partIndex].approved = true;
              booking.inspection.additionalParts[partIndex].approvalStatus = 'Approved';
              booking.inspection.additionalParts[partIndex].price = price;
              booking.inspection.additionalParts[partIndex].quantity = quantity;
              if (image) booking.inspection.additionalParts[partIndex].image = image;
              if (oldImage) booking.inspection.additionalParts[partIndex].oldImage = oldImage;
              partFound = true;
            }
          }

          if (!partFound) {
            if (!booking.inspection) booking.inspection = {};
            if (!booking.inspection.additionalParts) booking.inspection.additionalParts = [];
            booking.inspection.additionalParts.push({ name, price, quantity, approved: true, approvalStatus: 'Approved', image, oldImage });
          }

          // 2. Add to booking.parts (which affects billing)
          if (!booking.parts) booking.parts = [];

          // Check if part already exists in booking.parts to avoid duplicates if approved multiple times?
          // But status check prevents multiple approvals.
          booking.parts.push({ 
              name, 
              price, 
              quantity,
              image: image 
          });

          // 3. Recalculate totalAmount
          const Service = (await import('../models/Service.js')).default;
          const services = await Service.find({ _id: { $in: booking.services } });
          const servicesTotal = services.reduce((acc, service) => acc + service.price, 0);

          const partsTotal = booking.parts.reduce((acc, part) => acc + (part.price * part.quantity), 0);

          booking.totalAmount = servicesTotal + partsTotal;

          // Update billing if exists
          if (booking.billing) {
            booking.billing.partsTotal = partsTotal;
            booking.billing.total = (booking.billing.labourCost || 0) + partsTotal + (booking.billing.gst || 0);
          }

          await booking.save();
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
          const partsTotal = booking.billing.partsTotal || 0;
          const labourCost = booking.billing.labourCost;
          const gst = booking.billing.gst || 0;
          
          booking.billing.total = partsTotal + labourCost + gst;
          
          // Update main totalAmount
          booking.totalAmount = (booking.totalAmount || 0) + Number(amount);
          
          // Add note
          const note = `Extra Cost Approved: ${reason} - $${amount}`;
          booking.notes = booking.notes ? booking.notes + '\n' + note : note;
          
          await booking.save();
        }
      }
    } else if (status === 'Rejected') {
      if (approval.type === 'PartReplacement' && approval.relatedModel === 'Booking') {
        const booking = await Booking.findById(approval.relatedId);
        if (booking && booking.inspection && Array.isArray(booking.inspection.additionalParts)) {
          const { name } = approval.data || {};
          if (name) {
            const partIndex = booking.inspection.additionalParts.findIndex(p => p.name === name);
            if (partIndex >= 0) {
              booking.inspection.additionalParts[partIndex].approved = false;
              booking.inspection.additionalParts[partIndex].approvalStatus = 'Rejected';
              await booking.save();
            }
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
