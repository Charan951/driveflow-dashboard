import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getTokenFromRequest } from '../utils/authCookie.js';

const loadUserFromToken = async (decoded) => {
  const user = await User.findById(decoded.id).select('-password');
  if (!user) return null;
  if (
    decoded.tokenVersion != null &&
    (user.tokenVersion || 0) !== decoded.tokenVersion
  ) {
    return null;
  }
  return user;
};

const authenticateToken = async (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return loadUserFromToken(decoded);
  } catch {
    return null;
  }
};

export const protect = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    req.user = await authenticateToken(token);

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    const requiresApproval = ['staff', 'merchant'].includes(req.user.role?.toLowerCase());

    if (requiresApproval && !req.user.isApproved) {
      return res.status(401).json({
        message: 'Account pending approval. Please wait for admin approval.',
        code: 'PENDING_APPROVAL',
      });
    }

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const optionalAuth = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  req.user = token ? await authenticateToken(token) : null;
  next();
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role?.toLowerCase() === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin role required.' });
};

export const merchant = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (req.user && (role === 'merchant' || role === 'admin' || role === 'staff')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Merchant or Staff role required.' });
};
