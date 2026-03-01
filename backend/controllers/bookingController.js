import Booking from '../models/Booking.js';
import Counter from '../models/Counter.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { getIO } from '../socket.js';
import { sendEmail } from '../utils/emailService.js';
import { normalizeStatus, isValidTransition } from '../utils/statusMachine.js';
import { sendPushToUser } from '../utils/pushService.js';

const emitBookingUpdate = (booking) => {
  try {
    const io = getIO();
    const bookingId = booking._id.toString();
    
    // Notify admin
    io.to('admin').emit('bookingUpdated', booking);
    
    // Notify specific booking room
    io.to(`booking_${bookingId}`).emit('bookingUpdated', booking);
    
    // Notify relevant users
    const usersToNotify = [
      booking.user?._id || booking.user,
      booking.merchant?._id || booking.merchant,
      booking.pickupDriver?._id || booking.pickupDriver,
      booking.technician?._id || booking.technician,
    ].filter(id => id); // Remove null/undefined

    usersToNotify.forEach(userId => {
      const room = `user_${userId.toString()}`;
      io.to(room).emit('bookingUpdated', booking);
      io.to(room).emit('bookingCreated', booking); // Also emit bookingCreated for compatibility
    });
  } catch (err) {
    console.error('Socket emit error (emitBookingUpdate):', err);
  }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res) => {
  const { vehicleId, serviceIds, date, notes, location } = req.body;

  try {
    // Check for pending feedback on delivered/completed bookings
    const deliveredBookings = await Booking.find({
      user: req.user._id,
      status: { $in: ['DELIVERED', 'COMPLETED'] }
    });

    for (const booking of deliveredBookings) {
      const reviews = await Review.find({ booking: booking._id });
      const categories = reviews.map(r => r.category);
      
      const hasMerchantReview = categories.includes('Merchant');
      const hasPlatformReview = categories.includes('Platform');

      if (!hasMerchantReview || !hasPlatformReview) {
        return res.status(400).json({ 
          message: `Please provide feedback for your previous booking (#${booking.orderNumber || booking._id.toString().slice(-6).toUpperCase()}) before booking a new service.` 
        });
      }
    }

    // Pickup address is now always required
    const hasAddress = location && typeof location.address === 'string' && location.address.trim().length > 0;
    if (!hasAddress) {
      return res.status(400).json({ message: 'Pickup address is required' });
    }

    const Service = (await import('../models/Service.js')).default;
    const services = await Service.find({ _id: { $in: serviceIds } });

    if (services.length !== serviceIds.length) {
      return res.status(404).json({ message: 'One or more services not found' });
    }

    const totalAmount = services.reduce((acc, service) => acc + service.price, 0);

    const MAX_RETRIES = 5;
    let lastError = null;
    let createdBooking = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const orderNumber = await Counter.next('booking');
        const booking = new Booking({
          user: req.user._id,
          vehicle: vehicleId,
          services: serviceIds,
          date,
          orderNumber,
          notes,
          location,
          totalAmount,
        });

        createdBooking = await booking.save();
        break;
      } catch (err) {
        lastError = err;
        // Retry on duplicate orderNumber, otherwise abort
        // MongoServerError code 11000 is duplicate key
        const isDuplicate =
          err &&
          err.code === 11000 &&
          (err.keyPattern?.orderNumber || String(err.message || '').includes('orderNumber_1'));

        if (!isDuplicate) {
          throw err;
        }

        // Align counter with current max orderNumber to avoid repeated collisions
        try {
          const lastWithOrder = await Booking.findOne({ orderNumber: { $ne: null } })
            .sort({ orderNumber: -1 })
            .select('orderNumber')
            .lean();
          if (lastWithOrder && typeof lastWithOrder.orderNumber === 'number') {
            await Counter.findOneAndUpdate(
              { name: 'booking' },
              { $set: { seq: lastWithOrder.orderNumber } },
              { upsert: true }
            );
          }
        } catch (alignError) {
          console.error('Failed to align booking counter', alignError);
        }
      }
    }

    if (!createdBooking) {
      throw lastError || new Error('Failed to create booking with unique order number');
    }
    
    // Send confirmation email (asynchronously)
    if (req.user.email) {
      const serviceNames = services.map(s => s.name).join(', ');
      sendEmail(
        req.user.email,
        'Booking Confirmation - DriveFlow',
        `Dear User,\n\nYour booking for ${serviceNames} has been successfully created.\nDate: ${new Date(date).toLocaleDateString()}\nTotal Amount: ₹${totalAmount}\n\nThank you for choosing DriveFlow!`
      ).catch(emailError => console.error('Email sending failed:', emailError));
    }

    res.status(201).json(createdBooking);

    // Emit socket event for real-time updates
    try {
      // Populate for real-time consumers
      const populated = await Booking.findById(createdBooking._id)
        .populate('user', 'id name email phone')
        .populate('vehicle')
        .populate('services');
        
      emitBookingUpdate(populated || createdBooking);
    } catch (err) {
      console.error('Socket emit error (createBooking):', err);
    }
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
      // Staff see bookings where they are the pickup driver OR the technician (if that field exists)
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
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('vehicle')
      .populate('services')
      .populate('merchant', 'name email phone location')
      .populate('user', 'name email phone location')
      .populate('pickupDriver', 'name email phone')
      .lean();
    res.json(bookings);
  } catch (error) {
    console.error('getMyBookings Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings by user ID (Admin)
// @route   GET /api/bookings/user/:userId
// @access  Private/Admin
export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('vehicle')
      .populate('services')
      .lean();
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
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('user', 'id name email')
      .populate('services')
      .lean();
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
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('user', 'id name email')
      .populate('vehicle', 'make model licensePlate')
      .populate('services')
      .lean();
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
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('user', 'id name email phone')
      .populate('vehicle')
      .populate('services')
      .populate('merchant', 'name email phone')
      .populate('pickupDriver', 'name email phone')
      .populate('technician', 'name email phone')
      .lean();
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

      // Automatic status update rules
      // - Now always requires both merchant and driver to move to ACCEPTED
      if (booking.status === 'CREATED') {
        const canAssign = booking.merchant && booking.pickupDriver;
        if (canAssign) {
          booking.status = 'ACCEPTED';
        }
      }

      const updatedBooking = await booking.save();
      
      // Populate essential fields for real-time consumers
      const populated = await Booking.findById(updatedBooking._id)
        .populate('user', 'id name email phone')
        .populate('vehicle')
        .populate('services')
        .populate('merchant', 'name email phone location')
        .populate('pickupDriver', 'name email phone')
        .populate('technician', 'name email phone');

      // Emit real-time update for all stakeholders
      emitBookingUpdate(populated);

      res.json(populated);
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
      const isOwner = booking.user && booking.user._id.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      const isAssignedMerchant = req.user.role === 'merchant' && booking.merchant && booking.merchant.toString() === req.user._id.toString();
      const isAssignedStaff = req.user.role === 'staff' && (
        (booking.pickupDriver && booking.pickupDriver.toString() === req.user._id.toString()) ||
        (booking.technician && booking.technician.toString() === req.user._id.toString())
      );

      if (isOwner && !isAdmin && !isAssignedMerchant && !isAssignedStaff) {
        const allowedStatuses = ['DELIVERED'];
        if (!allowedStatuses.includes(status)) {
          return res.status(401).json({ message: 'Not authorized to set this status' });
        }
      } else if (!isAdmin && !isAssignedMerchant && !isAssignedStaff) {
        return res.status(401).json({ message: 'Not authorized' });
      }

      const canonFrom = booking.status;
      const canonTo = normalizeStatus(status) || status;

      if (!canonTo) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      if (!isValidTransition(canonFrom, canonTo)) {
        // Allow if admin overrides, otherwise block
        if (req.user.role !== 'admin') {
          return res.status(400).json({ message: `Invalid transition from ${canonFrom} to ${canonTo}` });
        }
      }

      if (canonTo === 'VEHICLE_PICKED') {
        const photos = Array.isArray(booking.prePickupPhotos) ? booking.prePickupPhotos : [];
        if (photos.length < 4) {
          return res.status(400).json({ message: 'Please upload 4 vehicle photos before picking up the vehicle' });
        }
      }

      // OTP gating for delivery
      if (canonTo === 'OUT_FOR_DELIVERY') {
        const code = Math.floor(100000 + Math.random() * 900000).toString().slice(0, 4);
        booking.deliveryOtp = {
          code,
          expiresAt: new Date(Date.now() + 20 * 60 * 1000),
          attempts: 0,
          verifiedAt: null
        };
        if (booking.user?.email) {
          await sendEmail(
            booking.user.email,
            'Delivery OTP',
            `Your OTP for vehicle delivery is ${code}. It expires in 20 minutes.`
          );
        }
        await sendPushToUser(booking.user?._id, 'Delivery OTP', 'Use the OTP to confirm delivery', { type: 'otp', bookingId: String(booking._id) });
      }

      if (canonTo === 'DELIVERED') {
        if (!booking.deliveryOtp || !booking.deliveryOtp.verifiedAt) {
          return res.status(400).json({ message: 'OTP verification required before marking as DELIVERED' });
        }
      }

      // Stock Auto Adjustment
      if ((canonTo === 'SERVICE_COMPLETED') && 
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

      booking.status = canonTo;
      const savedBooking = await booking.save();

      // Populate fields before returning to frontend
      const updatedBooking = await Booking.findById(savedBooking._id)
        .populate('user', 'id name email phone')
        .populate('vehicle')
        .populate('services')
        .populate('merchant', 'name email phone location')
        .populate('pickupDriver', 'name email phone')
        .populate('technician', 'name email phone');

      // Emit socket event for real-time updates
      emitBookingUpdate(updatedBooking);

      if (canonTo === 'CANCELLED' && booking.user) {
        try {
          const io = getIO();
          const userId = typeof booking.user === 'object' ? booking.user._id : booking.user;
          io.to(`user_${userId}`).emit('bookingCancelled', { id: updatedBooking._id, status: 'CANCELLED' });
        } catch (err) {
          console.error('Socket emit error (bookingCancelled):', err);
        }
      }

      // Send status update email
      if (updatedBooking.user && updatedBooking.user.email) {
        await sendEmail(
          updatedBooking.user.email,
          'Booking Status Update - DriveFlow',
          `Dear ${updatedBooking.user.name},\n\nYour booking status has been updated to: ${canonTo}.\n\nCheck your dashboard for more details.`
        );
      }
      await sendPushToUser(updatedBooking.user?._id, 'Booking Update', `Status updated to ${canonTo}`, { type: 'status', status: canonTo, bookingId: String(updatedBooking._id) });

      res.json(updatedBooking);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate delivery OTP
// @route   POST /api/bookings/:id/generate-otp
// @access  Private/Staff/Admin
export const generateDeliveryOtp = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('user');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isAdmin = req.user.role === 'admin';
    const isAssignedStaff = req.user.role === 'staff' && (
      (booking.pickupDriver && booking.pickupDriver.toString() === req.user._id.toString()) ||
      (booking.technician && booking.technician.toString() === req.user._id.toString())
    );
    if (!isAdmin && !isAssignedStaff) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString().slice(0, 4);
    booking.deliveryOtp = {
      code,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
      attempts: 0,
      verifiedAt: null
    };
    await booking.save();

    if (booking.user?.email) {
      await sendEmail(
        booking.user.email,
        'Delivery OTP',
        `Your OTP for vehicle delivery is ${code}. It expires in 20 minutes.`
      );
    }
    await sendPushToUser(booking.user?._id, 'Delivery OTP', 'Use the OTP to confirm delivery', { type: 'otp', bookingId: String(booking._id) });
    res.json({ message: 'OTP generated' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// @desc    Verify delivery OTP
// @route   POST /api/bookings/:id/verify-otp
// @access  Private/Staff/Admin/Customer
export const verifyDeliveryOtp = async (req, res) => {
  const { otp } = req.body;
  try {
    const booking = await Booking.findById(req.params.id).populate('user');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!booking.deliveryOtp || !booking.deliveryOtp.code) return res.status(400).json({ message: 'No OTP generated' });

    const now = new Date();
    if (booking.deliveryOtp.expiresAt && booking.deliveryOtp.expiresAt < now) {
      return res.status(400).json({ message: 'OTP expired' });
    }
    booking.deliveryOtp.attempts = (booking.deliveryOtp.attempts || 0) + 1;
    if (booking.deliveryOtp.attempts > 5) {
      return res.status(429).json({ message: 'Too many attempts' });
    }
    if (String(otp) !== booking.deliveryOtp.code) {
      await booking.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    booking.deliveryOtp.verifiedAt = now;
    await booking.save();
    res.json({ message: 'OTP verified' });
  } catch (e) {
    res.status(500).json({ message: e.message });
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
    prePickupPhotos,
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
      if (prePickupPhotos) booking.prePickupPhotos = prePickupPhotos;
      if (inspection) booking.inspection = { ...booking.inspection, ...inspection };
      if (delay) booking.delay = { ...booking.delay, ...delay };
      if (serviceExecution) booking.serviceExecution = { ...booking.serviceExecution, ...serviceExecution };
      if (qc) booking.qc = { ...booking.qc, ...qc };
      if (billing) {
        booking.billing = { ...booking.billing, ...billing };
        if (billing.total) {
          booking.totalAmount = billing.total;
        }
      }
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
      
      // Populate fields before returning to frontend
      const populated = await Booking.findById(updatedBooking._id)
        .populate('user', 'id name email phone')
        .populate('vehicle')
        .populate('services')
        .populate('merchant', 'name email phone location')
        .populate('pickupDriver', 'name email phone')
        .populate('technician', 'name email phone');

      // Emit socket event for real-time updates
      emitBookingUpdate(populated);

      res.json(populated);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
