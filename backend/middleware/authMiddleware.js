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
        console.log('Protect Middleware - User not found in DB');
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      if (!req.user.isApproved) {
        console.log('Protect Middleware - User not approved:', req.user.email);
        return res.status(401).json({ message: 'Account pending approval. Please wait for admin approval.' });
      }

      return next();
    } catch (error) {
      console.error('Protect Middleware - Error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.log('Protect Middleware - No Token Found');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role?.toLowerCase() === 'admin') {
    return next();
  } else {
    return res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

export const merchant = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (req.user && (role === 'merchant' || role === 'admin')) {
    return next();
  } else {
    return res.status(401).json({ message: 'Not authorized as a merchant' });
  }
};
