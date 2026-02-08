import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';

// @desc    Get live locations of all active assets
// @route   GET /api/tracking
// @access  Private/Admin
export const getLiveLocations = async (req, res) => {
  try {
    // 1. Fetch active staff (Drivers & Technicians)
    // Assuming 'Active' status and relevant roles
    const activeStaff = await User.find({
      role: 'staff',
      status: 'Active',
      'location.lat': { $exists: true }
    }).select('name subRole location phone email');

    // 2. Fetch active vehicles (On Route)
    // We can also include 'In Service' if they are being road-tested, 
    // but 'On Route' is the primary tracking target.
    const activeVehicles = await Vehicle.find({
      status: { $in: ['On Route', 'In Service'] },
      'location.lat': { $exists: true }
    }).select('make model licensePlate status location type user').populate('user', 'name');

    res.json({
      staff: activeStaff,
      vehicles: activeVehicles,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update location for a user (Staff)
// @route   PUT /api/tracking/user
// @access  Private (Staff/Admin)
export const updateUserLocation = async (req, res) => {
  const { lat, lng } = req.body;
  
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.location = {
        lat,
        lng,
        updatedAt: Date.now()
      };
      await user.save();
      res.json({ message: 'Location updated' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update location for a vehicle
// @route   PUT /api/tracking/vehicle/:id
// @access  Private (Staff/Admin)
export const updateVehicleLocation = async (req, res) => {
  const { lat, lng } = req.body;
  
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (vehicle) {
      vehicle.location = {
        lat,
        lng,
        address: req.body.address, // Optional
        updatedAt: Date.now()
      };
      await vehicle.save();
      res.json({ message: 'Vehicle location updated' });
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};