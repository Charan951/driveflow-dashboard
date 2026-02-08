import AuditLog from '../models/AuditLog.js';

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
    console.error('Audit Log Error:', error);
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

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
