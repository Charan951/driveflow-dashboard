import AuditLog from '../models/AuditLog.js';
import Payment from '../models/Payment.js';

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
export const getAuditLogs = async (req, res) => {
  try {
    const { user, action, startDate, endDate } = req.query;
    const query = {};

    if (user) query.user = user;
    if (action) query.action = { $regex: action, $options: 'i' };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
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

