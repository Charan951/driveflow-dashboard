import User from '../models/User.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
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
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add new staff member
// @route   POST /api/users/staff
// @access  Private/Admin
export const addStaff = async (req, res) => {
  const { name, email, password, role, subRole, phone } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'staff',
      subRole,
      phone,
      isApproved: true,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subRole: user.subRole,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
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
      // Add other fields if necessary, e.g. phone
      if (req.body.phone) user.phone = req.body.phone;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        token: req.headers.authorization.split(' ')[1], // Return existing token or generate new one if needed
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
