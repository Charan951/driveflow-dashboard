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
// @access  Private/Admin
export const updateApprovalStatus = async (req, res) => {
  const { status, adminComment } = req.body;

  try {
    const approval = await ApprovalRequest.findById(req.params.id);

    if (!approval) {
      return res.status(404).json({ message: 'Approval request not found' });
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
      } else if (approval.type === 'UserRegistration' && approval.relatedModel === 'User') {
        const user = await User.findById(approval.relatedId);
        if (user) {
          user.isApproved = true;
          user.rejectionReason = null;
          await user.save();
        }
      }
      // Add more handlers for PartReplacement etc.
    } else if (status === 'Rejected') {
      if (approval.type === 'UserRegistration' && approval.relatedModel === 'User') {
        const user = await User.findById(approval.relatedId);
        if (user) {
          user.isApproved = false;
          user.rejectionReason = adminComment;
          await user.save();
        }
      }
    }

    const updatedApproval = await approval.save();
    res.json(updatedApproval);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};