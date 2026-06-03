import AuditLog from '../models/AuditLog.js';
import Payment from '../models/Payment.js';

const ACTION_LABELS = {
  CREATE_CASHFREE_ORDER: 'Payment order created',
  VERIFY_CASHFREE_PAYMENT: 'Payment verified',
  CREATE_PAYMENT_ORDER: 'Payment order created',
  PAYMENT_VERIFIED: 'Payment verified',
  WEBHOOK_PROCESSED: 'Payment webhook received',
  PAYMENT_REFUNDED: 'Payment refunded',
};

const formatAuditAction = (action) => {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const pickDetail = (stored, fallback) => {
  if (stored != null && stored !== '') return stored;
  if (fallback != null && fallback !== '') return fallback;
  return null;
};

/** Merge stored audit details with the linked Payment row (fixes older partial logs). */
export const normalizePaymentAuditDetails = (details = {}, payment = null) => {
  const d = details && typeof details === 'object' ? details : {};
  const p = payment || {};
  const bookingFromStored =
    d.bookingId != null && typeof d.bookingId === 'object' && d.bookingId._id != null
      ? d.bookingId._id
      : d.bookingId;

  return {
    orderId: pickDetail(d.orderId, p.orderId),
    status: pickDetail(d.status, p.status),
    amount: pickDetail(d.amount, p.amount),
    bookingId: pickDetail(bookingFromStored, p.bookingId),
  };
};

// Helper to log actions
export const logAudit = async ({ user, action, targetModel, targetId, details, ipAddress }) => {
  try {
    await AuditLog.create({
      user,
      action,
      targetModel,
      targetId,
      details,
      ipAddress,
    });
  } catch (error) {
    
  }
};

// @desc    Get all audit logs
// @route   GET /api/audit
// @access  Private/Admin
const isValidDate = (dateStr) => {
  // Check if the string is in YYYY-MM-DD format first
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return false;
  }
  
  const date = new Date(dateStr);
  
  // Make sure the parsed date components match the input (to avoid dates like 2023-02-30 being accepted)
  const year = date.getFullYear();

  // Check that year is between 1900-2100
  if (year < 1900 || year > 2100) {
    return false;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;
  
  return !isNaN(date.getTime()) && formattedDate === dateStr;
};

export const getAuditLogs = async (req, res) => {
  try {
    const { user, action, startDate, endDate } = req.query;
    
    // Validate date fields if provided
    if (startDate && !isValidDate(startDate)) {
      return res.status(400).json({ message: 'Invalid start date' });
    }
    if (endDate && !isValidDate(endDate)) {
      return res.status(400).json({ message: 'Invalid end date' });
    }

    // Validate action field if provided
    if (action) {
      if (action.length > 50) {
        return res.status(400).json({ message: 'Too long data: Please enter a maximum of 50 characters' });
      }
      const allowedRegex = /^[a-zA-Z0-9\s_@.\-]*$/;
      if (!allowedRegex.test(action)) {
        return res.status(400).json({ message: 'Invalid data: Please enter valid data' });
      }
    }

    // Validate user field if provided
    if (user) {
      if (user.length > 100) {
        return res.status(400).json({ message: 'Too long data: Please enter a maximum of 100 characters' });
      }
      const allowedRegex = /^[a-zA-Z0-9\s_@.\-]*$/;
      if (!allowedRegex.test(user)) {
        return res.status(400).json({ message: 'Invalid data: Please enter valid data' });
      }
    }
    
    let userIds = null;
    
    // If user filter is provided, search users by name or email first
    if (user) {
      const User = (await import('../models/User.js')).default;
      const matchedUsers = await User.find({
        $or: [
          { name: { $regex: user, $options: 'i' } },
          { email: { $regex: user, $options: 'i' } }
        ]
      }).select('_id');
      userIds = matchedUsers.map(u => u._id);
    }

    // Build the main query
    const query = {};
    
    if (userIds && userIds.length > 0) {
      query.user = { $in: userIds };
    } else if (user) {
      // If user search but no matches, return empty early
      res.json([]);
      return;
    }
    
    if (action) {
      // Find all actions that match either raw action or formatted label
      const allPossibleActions = Object.keys(ACTION_LABELS);
      
      // Also add some common action patterns
      const additionalActions = [
        'LOGIN', 'LOGOUT', 'UPDATE', 'CREATE', 'DELETE', 
        'APPROVE', 'REJECT', 'VERIFY', 'REFUND'
      ];
      
      const actionsToCheck = [...new Set([...allPossibleActions, ...additionalActions])];
      
      // Find which actions match the search term in either raw or formatted form
      const matchingActions = actionsToCheck.filter(a => {
        const formatted = formatAuditAction(a);
        return a.toLowerCase().includes(action.toLowerCase()) || 
               formatted.toLowerCase().includes(action.toLowerCase());
      });
      
      if (matchingActions.length > 0) {
        query.action = { $in: matchingActions };
      } else {
        // If no exact match, try regex on raw action
        query.action = { $regex: action, $options: 'i' };
      }
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    const paymentIds = [
      ...new Set(
        logs
          .filter((log) => log.targetModel === 'Payment' && log.targetId)
          .map((log) => String(log.targetId))
      ),
    ];

    const payments = paymentIds.length
      ? await Payment.find({ _id: { $in: paymentIds } })
          .select('orderId status amount bookingId')
          .lean()
      : [];

    const paymentById = new Map(payments.map((p) => [String(p._id), p]));

    const enrichedLogs = logs
      .map((log) => {
        const row = log.toObject();
        if (row.targetModel === 'Payment' && row.targetId) {
          const payment = paymentById.get(String(row.targetId));
          row.details = normalizePaymentAuditDetails(row.details, payment);
          row._paymentStatus = payment?.status ?? null;
        }
        return row;
      })
      .filter((row) => {
        if (row.action !== 'CREATE_CASHFREE_ORDER') return true;
        const status = String(row.details?.status ?? row._paymentStatus ?? '').toLowerCase();
        return status !== 'paid';
      })
      .map(({ _paymentStatus, ...row }) => row);

    res.json(enrichedLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

