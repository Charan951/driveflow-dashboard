import Booking from '../models/Booking.js';
import { sendEmail } from '../utils/emailService.js';

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res) => {
  const { vehicleId, serviceIds, date, notes, location, pickupRequired } = req.body;

  try {
    const Service = (await import('../models/Service.js')).default;
    const services = await Service.find({ _id: { $in: serviceIds } });

    if (services.length !== serviceIds.length) {
      return res.status(404).json({ message: 'One or more services not found' });
    }

    const totalAmount = services.reduce((acc, service) => acc + service.price, 0);

    const booking = new Booking({
      user: req.user._id,
      vehicle: vehicleId,
      services: serviceIds,
      date,
      notes,
      location,
      pickupRequired,
      totalAmount,
    });

    const createdBooking = await booking.save();
    
    // Send confirmation email
    if (req.user.email) {
      const serviceNames = services.map(s => s.name).join(', ');
      await sendEmail(
        req.user.email,
        'Booking Confirmation - DriveFlow',
        `Dear User,\n\nYour booking for ${serviceNames} has been successfully created.\nDate: ${new Date(date).toLocaleDateString()}\nTotal Amount: ₹${totalAmount}\n\nThank you for choosing DriveFlow!`
      );
    }

    res.status(201).json(createdBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get logged in user bookings
// @route   GET /api/bookings/mybookings
// @access  Private
export const getMyBookings = async (req, res) => {
  try {
    let query = { user: req.user._id };

    if (req.user.role === 'staff') {
      query = {
        $or: [
          { pickupDriver: req.user._id },
          { technician: req.user._id }
        ]
      };
    }

    const bookings = await Booking.find(query)
      .populate('vehicle')
      .populate('services')
      .populate('merchant', 'name email phone location')
      .populate('user', 'name email phone location');
      
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings by user ID (Admin)
// @route   GET /api/bookings/user/:userId
// @access  Private/Admin
export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.params.userId })
      .populate('vehicle')
      .populate('services');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings by vehicle ID (Admin)
// @route   GET /api/bookings/vehicle/:vehicleId
// @access  Private/Admin
export const getVehicleBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ vehicle: req.params.vehicleId })
      .populate('user', 'id name email')
      .populate('services');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings by merchant ID (Admin)
// @route   GET /api/bookings/merchant/:merchantId
// @access  Private/Admin
export const getMerchantBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ merchant: req.params.merchantId })
      .populate('user', 'id name email')
      .populate('vehicle', 'make model licensePlate')
      .populate('services');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private/Admin
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('merchant', 'name email phone')
      .populate('pickupDriver', 'name email phone')
      .populate('technician', 'name email phone');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get booking by ID (Admin)
// @route   GET /api/bookings/:id
// @access  Private/Admin
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('merchant', 'name email phone location')
      .populate('pickupDriver', 'name email phone')
      .populate('technician', 'name email phone');
    
    if (booking) {
      // Check if user is authorized (admin, merchant, or booking owner)
      const isOwner = booking.user && booking.user._id.toString() === req.user._id.toString();
      const isAdminOrMerchant = req.user.role === 'admin' || req.user.role === 'merchant';
      
      if (isOwner || isAdminOrMerchant) {
        res.json(booking);
      } else {
        res.status(401).json({ message: 'Not authorized to view this booking' });
      }
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update booking details (Assign staff/merchant)
// @route   PUT /api/bookings/:id/assign
// @access  Private/Admin
export const assignBooking = async (req, res) => {
  const { merchantId, driverId, technicianId, slot } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);

    if (booking) {
      if (merchantId) booking.merchant = merchantId;
      if (driverId) booking.pickupDriver = driverId;
      if (technicianId) booking.technician = technicianId;
      if (slot) booking.date = slot; // Assuming date stores the slot time as well

      const updatedBooking = await booking.save();
      res.json(updatedBooking);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private/Admin/Garage
export const updateBookingStatus = async (req, res) => {
  const { status } = req.body;

  try {
    const booking = await Booking.findById(req.params.id).populate('user');

    if (booking) {
      // Authorization check
      const isOwner = booking.user._id.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      const isMerchant = req.user.role === 'merchant';

      // If customer (owner), only allow 'Delivered'
      if (isOwner && !isAdmin && !isMerchant) {
        if (status !== 'Delivered') {
          return res.status(401).json({ message: 'Not authorized to set this status' });
        }
      } else if (!isAdmin && !isMerchant) {
        // Not owner, not admin, not merchant
        return res.status(401).json({ message: 'Not authorized' });
      }

      booking.status = status;
      const updatedBooking = await booking.save();

      // Send status update email
      if (booking.user && booking.user.email) {
        await sendEmail(
          booking.user.email,
          'Booking Status Update - DriveFlow',
          `Dear ${booking.user.name},\n\nYour booking status has been updated to: ${status}.\n\nCheck your dashboard for more details.`
        );
      }

      res.json(updatedBooking);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update booking details (media, parts, notes)
// @route   PUT /api/bookings/:id/details
// @access  Private/Merchant/Admin
export const updateBookingDetails = async (req, res) => {
  const { media, parts, notes } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);

    if (booking) {
      if (media) booking.media = media;
      if (notes) booking.notes = notes;
      
      if (parts) {
        booking.parts = parts;
        
        // Recalculate total amount
        const partsTotal = parts.reduce((acc, part) => acc + (part.price * part.quantity), 0);
        
        const Service = (await import('../models/Service.js')).default;
        const services = await Service.find({ _id: { $in: booking.services } });
        const servicesTotal = services.reduce((acc, service) => acc + service.price, 0);
        
        booking.totalAmount = servicesTotal + partsTotal;
      }

      const updatedBooking = await booking.save();
      res.json(updatedBooking);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
