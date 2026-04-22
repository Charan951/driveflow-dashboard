import User from '../models/User.js';
import { sendEmail } from '../utils/emailService.js';
import { getIO } from '../socket.js';
import { emitEntitySync } from '../utils/syncService.js';

// @desc    Get all users (with optional filtering)
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const query = {};
    if (req.query.role) query.role = req.query.role;
    if (req.query.subRole) query.subRole = req.query.subRole;

    const users = await User.find(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update FCM Token
// @route   POST /api/users/fcm-token
// @access  Private
export const updateFCMToken = async (req, res) => {
  try {
    const { token, deviceType } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Remove token if it exists elsewhere to avoid duplicate notifications
    await User.updateMany(
      { 'fcmTokens.token': token },
      { $pull: { fcmTokens: { token: token } } }
    );

    // Add or update token for this user
    const tokenIndex = user.fcmTokens.findIndex(t => t.token === token);
    if (tokenIndex > -1) {
      user.fcmTokens[tokenIndex].lastUpdated = Date.now();
      user.fcmTokens[tokenIndex].deviceType = deviceType || user.fcmTokens[tokenIndex].deviceType;
    } else {
      user.fcmTokens.push({ token, deviceType: deviceType || 'android' });
    }

    // Limit tokens per user to 5 to prevent document size issues
    if (user.fcmTokens.length > 5) {
      user.fcmTokens.shift();
    }

    await user.save();
    res.json({ message: 'FCM token updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/me
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      const userId = user._id;
      await user.deleteOne();
      
      // Global Real-time Sync
      emitEntitySync('user', 'deleted', { _id: userId });
      
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (req.body.password) {
        user.password = req.body.password;
      }
      if (req.body.phone) {
        user.phone = req.body.phone;
      }
      if (req.body.addresses) {
        user.addresses = req.body.addresses;
      }
      if (req.body.paymentMethods) {
        user.paymentMethods = req.body.paymentMethods;
      }
      if (typeof req.body.isShopOpen !== 'undefined') {
        user.isShopOpen = req.body.isShopOpen;

        // Emit status update
        try {
          const io = getIO();
          io.to('admin').emit('userStatusUpdate', {
            userId: user._id,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
            isShopOpen: user.isShopOpen
          });
        } catch (err) {
          
        }
      }
      if (req.body.location) {
        user.location = req.body.location;
        
        // Emit liveLocation event for real-time map update
        try {
          const io = getIO();
          io.to('admin').emit('liveLocation', {
            userId: user._id,
            role: user.role,
            subRole: user.subRole,
            lat: req.body.location.lat,
            lng: req.body.location.lng,
            timestamp: new Date().toISOString()
          });
        } catch (err) {
          
        }
      }

      const updatedUser = await user.save();

      // Emit user updated event
      try {
        const io = getIO();
        const updatePayload = {
          userId: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          phone: updatedUser.phone,
          location: updatedUser.location
        };
        
        io.to('admin').emit('userUpdated', updatePayload);
        io.to(`user_${updatedUser._id}`).emit('userUpdated', updatePayload);
        
        // Global Real-time Sync
        emitEntitySync('user', 'updated', updatedUser);
      } catch (err) {
        
      }

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        location: updatedUser.location,
        addresses: updatedUser.addresses,
        paymentMethods: updatedUser.paymentMethods,
        token: req.body.token, // Usually we don't return token on update, but preserving if needed
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user (Admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      user.category = req.body.category || user.category;
      
      if (req.body.location) {
        user.location = req.body.location;
      }

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        category: updatedUser.category,
        location: updatedUser.location,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private/Admin
// @desc    Approve user (Garage)
// @route   PUT /api/users/:id/approve
// @access  Private/Admin
export const approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.isApproved = true;
      user.rejectionReason = null; // Clear any previous rejection
      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject user
// @route   PUT /api/users/:id/reject
// @access  Private/Admin
export const rejectUser = async (req, res) => {
  const { reason } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.isApproved = false;
      user.rejectionReason = reason;
      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  const { role, subRole, status } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      if (role) user.role = role;
      if (subRole !== undefined) user.subRole = subRole;
      if (status) user.status = status;
      const updatedUser = await user.save();

      // Emit socket event for real-time role update
      try {
        const io = getIO();
        io.to(`user_${updatedUser._id}`).emit('user_role_updated', {
          _id: updatedUser._id,
          role: updatedUser.role,
          subRole: updatedUser.subRole,
          status: updatedUser.status
        });
        
        // Global Real-time Sync
        emitEntitySync('user', 'updated', updatedUser);
      } catch (err) {
        console.error('Socket emit error on role update:', err);
      }

      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new user (Admin only)
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req, res) => {
  const { name, email, password, role, subRole, phone, location, category } = req.body;
  
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      subRole,
      phone,
      location,
      category,
      isApproved: true
    });

    if (user) {
      try {
        const readableRole = role === 'merchant' ? 'Merchant' : role === 'staff' ? 'Staff' : 'User';
        const subject = `Welcome to DriveFlow - ${readableRole} Account Created`;
        const text = [
          `Hi ${name || 'there'},`,
          '',
          `Your ${readableRole.toLowerCase()} account has been created on DriveFlow.`,
          '',
          `Login Email: ${email}`,
          password ? `Temporary Password: ${password}` : '',
          '',
          'Please log in and change your password after first login.',
          '',
          'Best regards,',
          'DriveFlow Team',
        ].filter(Boolean).join('\n');

        await sendEmail(email, subject, text);
      } catch (e) {
        
      }

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update online status
// @route   PUT /api/users/online-status
// @access  Private
export const updateOnlineStatus = async (req, res) => {
  const { isOnline } = req.body;
  
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.isOnline = isOnline;
      if (isOnline) {
        user.lastSeen = Date.now();
      }
      
      await user.save();
      

      // Emit socket event for real-time status update
      try {
        const io = getIO();
        io.to('admin').emit('userStatusUpdate', {
            userId: user._id,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
        });
        
      } catch (err) {
        
      }

      res.json({ 
        message: 'Status updated', 
        isOnline: user.isOnline,
        lastSeen: user.lastSeen 
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    
    res.status(500).json({ message: error.message, stack: error.stack });
  }
};

// Device token APIs removed – push notifications disabled

