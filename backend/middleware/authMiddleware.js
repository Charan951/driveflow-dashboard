import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      // Only check approval for staff and merchant roles
      // Customers and admins don't need approval
      const requiresApproval = ['staff', 'merchant'].includes(req.user.role?.toLowerCase());
      
      if (requiresApproval && !req.user.isApproved) {
        return res.status(401).json({ 
          message: 'Account pending approval. Please wait for admin approval.',
          code: 'PENDING_APPROVAL'
        });
      }

      return next();
    } catch (error) {
      console.error('JWT Error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role?.toLowerCase() === 'admin') {
    return next();
  } else {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
};

export const merchant = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (req.user && (role === 'merchant' || role === 'admin')) {
    return next();
  } else {
    return res.status(403).json({ message: 'Access denied. Merchant role required.' });
  }
};
