import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';

// @desc    Get live locations of all active assets
// @route   GET /api/tracking
// @access  Private/Admin
export const getLiveLocations = async (req, res) => {
  try {
    // 1. Fetch active staff (Drivers & Technicians)
    const activeStaff = await User.find({
      role: 'staff',
      status: 'Active',
      'location.lat': { $exists: true }
    }).select('name subRole location phone email isOnline lastSeen').lean();

    // Enrich staff with active booking info (Optimized: Single query)
    const staffIds = activeStaff.map(s => s._id);
    const activeBookings = await Booking.find({
      $or: [{ pickupDriver: { $in: staffIds } }, { technician: { $in: staffIds } }],
      status: { $in: ['Pickup Assigned', 'In Garage', 'Inspection Started', 'Repair In Progress', 'QC Pending', 'Ready', 'Delivered'] }
    }).select('location status date pickupDriver technician').lean();

    const staffWithJobs = activeStaff.map(staff => {
      const activeBooking = activeBookings.find(b => 
        (b.pickupDriver && b.pickupDriver.toString() === staff._id.toString()) || 
        (b.technician && b.technician.toString() === staff._id.toString())
      );
      return { ...staff, currentJob: activeBooking || null };
    });

    // 2. Fetch active vehicles (On Route)
    const activeVehicles = await Vehicle.find({
      status: { $in: ['On Route', 'In Service'] },
      'location.lat': { $exists: true }
    }).select('make model licensePlate status location type user').populate('user', 'name').lean();

    // 3. Fetch merchants with location (Fetch all, regardless of open status)
    // Force restart comment: Updated selection logic
    const activeMerchants = await User.find({
      role: 'merchant',
      'location.lat': { $exists: true }
    }).select('name role location phone email isOnline lastSeen isShopOpen').lean();

    res.json({
      staff: staffWithJobs,
      vehicles: activeVehicles,
      merchants: activeMerchants,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update location for a user (Staff/Merchant)
// @route   PUT /api/tracking/user
// @access  Private (Staff/Admin/Merchant)
export const updateUserLocation = async (req, res) => {
  const { lat, lng, address } = req.body;
  
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      // Preserve existing location data if not provided
      user.location = {
        ...user.location, // Spread existing
        lat: lat || user.location?.lat,
        lng: lng || user.location?.lng,
        address: address || user.location?.address,
        updatedAt: Date.now()
      };
      
      // Update GeoJSON field for geospatial queries
      if (lat && lng) {
        user.geo = {
          type: 'Point',
          coordinates: [lng, lat]
        };
      }

      // Mark as online when updating location
      user.isOnline = true;
      user.lastSeen = Date.now();

      await user.save();
      res.json({ message: 'Location updated', location: user.location });
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
      
      // Update GeoJSON field
      if (lat && lng) {
        vehicle.geo = {
          type: 'Point',
          coordinates: [lng, lat]
        };
      }

      await vehicle.save();
      res.json({ message: 'Vehicle location updated' });
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};