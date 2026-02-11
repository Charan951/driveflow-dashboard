import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { getIO } from '../socket.js';
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
      try {
        await sendEmail(
          req.user.email,
          'Booking Confirmation - DriveFlow',
          `Dear User,\n\nYour booking for ${serviceNames} has been successfully created.\nDate: ${new Date(date).toLocaleDateString()}\nTotal Amount: ₹${totalAmount}\n\nThank you for choosing DriveFlow!`
        );
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    }

    res.status(201).json(createdBooking);
  } catch (error) {
    console.error('Create Booking Error:', error);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    if (error.name === 'ValidationError') {
       const messages = Object.values(error.errors).map(val => val.message);
       return res.status(400).json({ message: messages.join(', ') });
    }
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
    } else if (req.user.role === 'merchant') {
      // Merchants see bookings assigned to them, and their own personal bookings
      query = {
        $or: [
          { user: req.user._id },
          { merchant: req.user._id }
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
    let query = {};
    
    // If merchant, only show their bookings
    if (req.user.role === 'merchant') {
      query = { merchant: req.user._id };
    }

    const bookings = await Booking.find(query)
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
      const isAdmin = req.user.role === 'admin';
      const isAssignedMerchant = req.user.role === 'merchant' && booking.merchant && booking.merchant._id.toString() === req.user._id.toString();
      const isAssignedStaff = req.user.role === 'staff' && (
        (booking.pickupDriver && booking.pickupDriver._id.toString() === req.user._id.toString()) ||
        (booking.technician && booking.technician._id.toString() === req.user._id.toString())
      );
      
      if (isOwner || isAdmin || isAssignedMerchant || isAssignedStaff) {
        res.json(booking);
      } else {
        res.status(401).json({ message: 'Not authorized to view this booking' });
      }
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    console.error('Update Booking Status Error:', error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
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

      // Automatic status update: If both merchant and driver are assigned, move to 'ASSIGNED'
      if (booking.merchant && booking.pickupDriver && booking.status === 'CREATED') {
        booking.status = 'ASSIGNED';
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

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private/Admin/Garage
export const updateBookingStatus = async (req, res) => {
  const { status } = req.body;

  try {
    const booking = await Booking.findById(req.params.id).populate('user');

    if (booking) {
      // Authorization check
      const isOwner = booking.user && booking.user._id.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      const isAssignedMerchant = req.user.role === 'merchant' && booking.merchant && booking.merchant.toString() === req.user._id.toString();
      const isAssignedStaff = req.user.role === 'staff' && (
        (booking.pickupDriver && booking.pickupDriver.toString() === req.user._id.toString()) ||
        (booking.technician && booking.technician.toString() === req.user._id.toString())
      );

      // If customer (owner), only allow 'DELIVERED'
      if (isOwner && !isAdmin && !isAssignedMerchant && !isAssignedStaff) {
        if (status !== 'DELIVERED') {
          return res.status(401).json({ message: 'Not authorized to set this status' });
        }
      } else if (!isAdmin && !isAssignedMerchant && !isAssignedStaff) {
        // Not owner, not admin, not assigned merchant, not assigned staff
        return res.status(401).json({ message: 'Not authorized' });
      }

      // Stock Auto Adjustment
      if ((status === 'SERVICE_COMPLETED') && 
          !['SERVICE_COMPLETED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(booking.status)) {
          
          const Product = (await import('../models/Product.js')).default;
          const Notification = (await import('../models/Notification.js')).default;
          
          for (const part of booking.parts) {
              if (part.product) {
                  const product = await Product.findById(part.product);
                  if (product) {
                      product.quantity = Math.max(0, product.quantity - part.quantity);
                      await product.save();
                      
                      // Check for low stock
                      if (product.quantity <= product.threshold) {
                          // Trigger alert (Create a notification)
                          await Notification.create({
                              user: product.merchant,
                              title: 'Low Stock Alert',
                              message: `Product ${product.name} is running low on stock (${product.quantity} left).`,
                              type: 'system'
                          });
                      }
                  }
              }
          }
      }

      booking.status = status;
      const updatedBooking = await booking.save();

      // Emit socket event for real-time updates
      try {
        const io = getIO();
        
        // Notify admin
        io.to('admin').emit('bookingUpdated', updatedBooking);
        
        // Notify specific booking room (for customer/staff/merchant)
        io.to(`booking_${booking._id}`).emit('bookingUpdated', updatedBooking);
        
      } catch (err) {
        console.error('Socket emit error:', err);
      }

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

// @desc    Update booking details (media, parts, notes, inspection, qc, etc.)
// @route   PUT /api/bookings/:id/details
// @access  Private/Merchant/Admin
export const updateBookingDetails = async (req, res) => {
  const { 
    media, 
    parts, 
    notes,
    inspection,
    delay,
    serviceExecution,
    qc,
    billing,
    revisit
  } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);

    if (booking) {
      const isAdmin = req.user.role === 'admin';
      const isAssignedMerchant = req.user.role === 'merchant' && booking.merchant && booking.merchant.toString() === req.user._id.toString();
      const isAssignedStaff = req.user.role === 'staff' && (
        (booking.pickupDriver && booking.pickupDriver.toString() === req.user._id.toString()) ||
        (booking.technician && booking.technician.toString() === req.user._id.toString())
      );

      if (!isAdmin && !isAssignedMerchant && !isAssignedStaff) {
        return res.status(401).json({ message: 'Not authorized to update this booking' });
      }

      if (media) booking.media = media;
      if (notes) booking.notes = notes;
      if (inspection) booking.inspection = { ...booking.inspection, ...inspection };
      if (delay) booking.delay = { ...booking.delay, ...delay };
      if (serviceExecution) booking.serviceExecution = { ...booking.serviceExecution, ...serviceExecution };
      if (qc) booking.qc = { ...booking.qc, ...qc };
      if (billing) booking.billing = { ...booking.billing, ...billing };
      if (revisit) booking.revisit = { ...booking.revisit, ...revisit };
      
      if (parts) {
        booking.parts = parts;
        
        // Recalculate total amount
        const partsTotal = parts.reduce((acc, part) => acc + (part.price * part.quantity), 0);
        
        const Service = (await import('../models/Service.js')).default;
        const services = await Service.find({ _id: { $in: booking.services } });
        const servicesTotal = services.reduce((acc, service) => acc + service.price, 0);
        
        booking.totalAmount = servicesTotal + partsTotal;
        
        // Update billing partsTotal if billing exists
        if (booking.billing) {
            booking.billing.partsTotal = partsTotal;
            booking.billing.total = (booking.billing.labourCost || 0) + partsTotal + (booking.billing.gst || 0);
        }
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
