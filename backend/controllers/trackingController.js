import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import axios from 'axios';
import { getIO } from '../socket.js';
import { sendPushToUser } from '../utils/pushService.js';

// In-memory throttle to avoid spamming "nearby" notifications
const lastNearNotifyAt = new Map(); // bookingId -> timestamp(ms)

const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// @desc    Get live locations of all active assets
// @route   GET /api/tracking
// @access  Private/Admin
export const getLiveLocations = async (req, res) => {
  try {
    // 1. Fetch active staff (Drivers/Technicians) - Also include Admins who are online
    const activeStaff = await User.find({
      $or: [
        { role: 'staff' },
        { role: 'admin', isOnline: true }
      ],
      status: { $ne: 'Inactive' }
    }).select('name role subRole location phone email isOnline lastSeen').lean();

    // Enrich staff with active booking info
    const staffIds = activeStaff.map(s => s._id);
    const activeBookings = await Booking.find({
      $or: [
        { pickupDriver: { $in: staffIds } },
        { technician: { $in: staffIds } }
      ],
      status: { $nin: ['CANCELLED', 'DELIVERED', 'COMPLETED'] }
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

    // 3. Fetch merchants (Fetch all, regardless of open status)
    const activeMerchants = await User.find({
      role: 'merchant'
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

// @desc    Get ETA and distance between two coordinates
// @route   GET /api/tracking/eta?originLat=&originLng=&destLat=&destLng=
// @access  Private
export const getETA = async (req, res) => {
  try {
    const originLat = parseFloat(req.query.originLat);
    const originLng = parseFloat(req.query.originLng);
    const destLat = parseFloat(req.query.destLat);
    const destLng = parseFloat(req.query.destLng);

    if (
      [originLat, originLng, destLat, destLng].some(
        (v) => typeof v !== 'number' || Number.isNaN(v)
      )
    ) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // OSRM
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
      const { data } = await axios.get(url);
      const route = data?.routes?.[0];
      if (!route) {
        return res.status(502).json({ message: 'Routing service unavailable' });
      }
      const durationSec = Math.round(route.duration || 0);
      const distanceMeters = Math.round(route.distance || 0);
      const minutes = Math.max(1, Math.round(durationSec / 60));
      const km = Math.round((distanceMeters / 1000) * 10) / 10;
      const textDuration = `${minutes} min`;
      const textDistance = `${km} km`;
      const arrival = new Date(Date.now() + durationSec * 1000);
      return res.json({
        provider: 'osrm',
        durationSec,
        distanceMeters,
        textDuration,
        textDistance,
        arrivalTimeIso: arrival.toISOString(),
      });
    } catch (e) {
      return res.status(502).json({ message: 'Routing lookup failed' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Update location for a user (Staff/Merchant)
// @route   PUT /api/tracking/user
// @access  Private (Staff/Admin/Merchant)
export const updateUserLocation = async (req, res) => {
  const { lat, lng, address, bookingId } = req.body;
  
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

      try {
        const io = getIO();
        // Broadcast to admin map
        io.to('admin').emit('liveLocation', {
          userId: user._id,
          role: user.role,
          subRole: user.subRole,
          lat: lat ?? user.location?.lat,
          lng: lng ?? user.location?.lng,
          timestamp: new Date().toISOString()
        });
        // Forward to booking room if provided so customer/merchant UIs update in real-time
        if (bookingId) {
          io.to(`booking_${bookingId}`).emit('liveLocation', {
            userId: user._id,
            role: user.role,
            subRole: user.subRole,
            lat: lat ?? user.location?.lat,
            lng: lng ?? user.location?.lng,
            timestamp: new Date().toISOString()
          });

          try {
            // Near-arrival detection and notification (300m) for pickup phases
            const booking = await Booking.findById(bookingId).select('user location status').populate('user','_id');
            const bLoc = booking?.location;
            const bLat = typeof bLoc === 'object' ? bLoc?.lat : null;
            const bLng = typeof bLoc === 'object' ? bLoc?.lng : null;
            if (booking && bLat && bLng) {
              const d = haversineMeters(lat ?? user.location?.lat, lng ?? user.location?.lng, bLat, bLng);
              const allowedStatuses = ['ASSIGNED','ACCEPTED','REACHED_CUSTOMER'];
              const throttleMs = 10 * 60 * 1000; // 10 minutes
              const lastSent = lastNearNotifyAt.get(String(bookingId)) || 0;
              if (d <= 300 && allowedStatuses.includes(booking.status || '') && Date.now() - lastSent > throttleMs) {
                io.to(`booking_${bookingId}`).emit('nearbyStaff', {
                  bookingId: String(bookingId),
                  distanceMeters: Math.round(d),
                  timestamp: new Date().toISOString()
                });
                if (booking.user?._id) {
                  await sendPushToUser(booking.user._id, 'Staff is near your location', 'Our staff is within 300 meters of your address.', { type: 'nearby', bookingId: String(bookingId), distance: Math.round(d) });
                }
                lastNearNotifyAt.set(String(bookingId), Date.now());
              }
            }
          } catch (e) {
            console.error('Near-arrival notify error:', e.message);
          }
        }
        // Also emit status heartbeat for online indicator
        io.to('admin').emit('userStatusUpdate', {
          userId: user._id,
          isOnline: true,
          lastSeen: user.lastSeen
        });
      } catch (e) {
        console.error('Socket emit error (updateUserLocation):', e.message);
      }

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

// @desc    Reverse geocode via Nominatim (proxied to avoid CORS)
// @route   GET /api/tracking/reverse?lat=&lng=
// @access  Private
export const reverseGeocode = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if ([lat, lng].some((v) => typeof v !== 'number' || Number.isNaN(v))) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }
    const { data } = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat,
        lon: lng,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'DriveFlow/1.0 (support@driveflow.local)',
        'Accept-Language': 'en',
        'Referer': 'https://driveflow.local',
      },
      timeout: 8000,
    });
    return res.json(data);
  } catch (error) {
    const status = error?.response?.status || 500;
    return res.status(status).json({ message: 'Reverse geocoding failed' });
  }
};

// @desc    Search geocode via Nominatim (proxied to avoid CORS)
// @route   GET /api/tracking/search?q=&limit=&countrycodes= (defaults: in)
// @access  Private
export const searchGeocode = async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.status(400).json({ message: 'Missing query' });
    const limit = parseInt(req.query.limit, 10) || 5;
    const countrycodes = (req.query.countrycodes || 'in').toString();
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        format: 'json',
        q,
        limit,
        countrycodes,
      },
      headers: {
        'User-Agent': 'DriveFlow/1.0 (support@driveflow.local)',
        'Accept-Language': 'en',
        'Referer': 'https://driveflow.local',
      },
      timeout: 8000,
    });
    return res.json(data);
  } catch (error) {
    const status = error?.response?.status || 500;
    return res.status(status).json({ message: 'Search geocoding failed' });
  }
};
